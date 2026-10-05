require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const {
  buildCorsOptions,
  resolveTrustProxy,
  createRateLimiter,
  authRateLimiter
} = require('./http-middleware');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { processAuditJob } = require('./audit-agent');
const { submitToChain } = require('./chain-submit');
const chainRead = require('./chain-read');
const { jobs, addJob, updateJob, getJob } = require('./jobs');
const { localeMiddleware } = require('./locale-middleware');
const auth = require('./auth');
const { extractSkillPackage, SkillPackageError, validateSkillData } = require('./skill-package');

const app = express();
const PORT = process.env.PORT || 10001;

// Ensure directories exist
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// 反向代理信任（P30）：默认关闭。部署到 Nginx/网关后若不开启，req.ip 恒为代理 IP，
// 认证端点的 IP 限流会退化成「全局一个桶」，一个人就能把所有人锁在门外；
// 而无条件开启又允许任何人伪造 X-Forwarded-For 绕过限流。故必须显式配置跳数。
app.set('trust proxy', resolveTrustProxy(process.env));

// CORS（P28/P29/P30）：白名单策略集中在 http-middleware.js 便于测试。
// 生产环境不再放行 localhost —— 任何本地跑的网页都能对本机 API 发带凭据跨域请求。
const { allowed: ALLOWED_ORIGINS, origin: originAllowed } = buildCorsOptions(process.env);
const corsOptions = {
  origin: (origin, callback) => {
    if (originAllowed(origin).allowed) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(localeMiddleware);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const jobId = req.body.jobId || uuidv4();
    cb(null, `${jobId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.skill.zip', '.SKILL.md', '.md', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(req.t('file.invalidType', { types: allowedExts.join(', ') })));
    }
  }
});

// ── 身份认证端点（P2 身份层 + P30 限流）──
// IP 维度限流挂在端点最外层：账号锁定能挡住针对单账号的撞库，但挡不住
// 「轮换用户名 × 轮换 IP」的分布式尝试，只有入口限流能挡。
const authLimiterConfig = authRateLimiter(process.env);
const authLimiter = createRateLimiter(authLimiterConfig);

/** 认证端点限流中间件：超限返回 429 + Retry-After */
function authRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const { allowed, retryAfterMs } = authLimiter(key);
  if (allowed) return next();
  res.set('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
  return res.status(429).json({
    error: 'Too many authentication attempts, please try again later',
    retryAfterMs
  });
}

// 注册：POST /api/auth/register {username, password} → {token, username, address}
app.post('/api/auth/register', authRateLimit, (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = auth.register(username, password);
    res.status(201).json({ ...result, ttlMs: auth.TOKEN_TTL_MS });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message });
  }
});

// 登录：POST /api/auth/login {username, password} → {token, username, address}
app.post('/api/auth/login', authRateLimit, (req, res) => {
  try {
    const { username, password } = req.body || {};
    // 传入 ip：失败计数与锁定按「用户 + IP」双键生效
    const result = auth.login(username, password, { ip: req.ip || req.socket.remoteAddress });
    res.json({ ...result, ttlMs: auth.TOKEN_TTL_MS });
  } catch (error) {
    const status = error.status || 500;
    if (status === 429 && error.retryAfterMs) res.set('Retry-After', String(Math.ceil(error.retryAfterMs / 1000)));
    res.status(status).json({ error: error.message });
  }
});

// 登出：POST /api/auth/logout（Bearer token）
app.post('/api/auth/logout', authRateLimit, (req, res) => {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+([^\s]+)$/.exec(header);
  if (match) auth.logout(match[1], { ip: req.ip || req.socket.remoteAddress });
  res.json({ success: true });
});

// 当前用户：GET /api/auth/me（Bearer token）
app.get('/api/auth/me', (req, res) => {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+([^\s]+)$/.exec(header);
  if (!match) return res.status(401).json({ error: req.t('auth.required') });
  const user = auth.me(match[1]);
  if (!user) return res.status(401).json({ error: req.t('auth.invalid') });
  res.json(user);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    chain: {
      configured: true, // ChainMaker 网关为真实依赖（docker exec cmc 可用即可）
      network: process.env.CHAINMAKER_CHAIN_ID || 'chain1',
      skillRegistry: 'AS2_SkillRegistry',
      cmcCommand: process.env.CHAINMAKER_CMC_CMD || 'docker exec cmc-debug cmc'
    }
  });
});

// Upload endpoint（P2 强制身份：上传必须登录；P3 真实解包：坏包立即拒绝）
app.post('/api/upload', auth.requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: req.t('upload.noFile') });
    }

    const jobId = uuidv4();
    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // P3 真实解包 + frontmatter 校验（同步）：坏包/无 SKILL.md/非法编码 → 立即 400 带原因
    let pkg;
    try {
      pkg = extractSkillPackage(filePath, originalName);
      validateSkillData(pkg.skillData);
    } catch (err) {
      if (err instanceof SkillPackageError) {
        return res.status(400).json({ error: err.message, code: err.code });
      }
      throw err;
    }

    // Create job entry（记录真实用户身份与已提取文本，P3 评审/归属链式绑定）
    addJob({
      id: jobId,
      status: 'pending',
      filePath,
      originalName,
      skillContent: pkg.content,
      skillFile: pkg.skillFile,
      source: pkg.source,
      entryCount: pkg.entryCount,
      createdAt: new Date().toISOString(),
      username: req.user.username,
      address: req.user.address
    });

    // Start audit process asynchronously
    processAuditJob(jobId, filePath, originalName, req.locale).catch(err => {
      console.error(`Audit job ${jobId} failed:`, err);
      updateJob(jobId, { status: 'failed', error: err.message });
    });

    res.json({
      jobId,
      status: 'pending',
      message: req.t('upload.success')
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get job status
app.get('/api/status/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: req.t('job.notFound') });
    }
  res.json(job);
});

// Trigger on-chain submission（P2 强制身份：creator 一律取真实登录用户，不再信任 body.creator）
app.post('/api/chain', auth.requireAuth, async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: req.t('chain.jobIdRequired') });
    }

    const job = getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: req.t('job.notFound') });
    }

    if (job.status !== 'approved') {
      return res.status(400).json({
        error: req.t('job.notApproved'),
        status: job.status,
        message: req.t('job.auditRequired')
      });
    }

    // 链上归属 = 真实登录用户地址（P2 核心：参数化调用填真实用户地址）
    const creator = req.user.address;

    // 可选的溯源字段（不禁止二创，但记录 fork 关系与贡献者 attribution）
    const forkMetadata = req.body.forkMetadata || {};

    // Submit to chain（后端以网关身份提交 tx，creator 字段填真实用户地址）
    updateJob(jobId, { status: 'submitting', message: req.t('chain.submitting') });
    const result = await submitToChain(job, req.locale, creator, forkMetadata);

    updateJob(jobId, {
      status: 'on_chain',
      message: req.t('chain.onChain'),
      skillId: result.skillId,
      txHash: result.txHash,
      forkMetadata
    });

    res.json({
      status: 'on_chain',
      skillId: result.skillId,
      txHash: result.txHash,
      forkMetadata
    });
  } catch (error) {
    console.error('Chain submission error:', error);
    updateJob(req.body.jobId, { status: 'failed', error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ── 技能存证链服务：溯源链 / 证据包 / 贡献者 attribution ──

// 技能溯源链查询（祖先 + 后代 + 贡献者）
app.get('/api/chain/skills/:id/lineage', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) {
      return res.status(400).json({ error: 'invalid_skill_id' });
    }
    const lineage = await chainRead.getSkillLineage(id);
    res.json(lineage);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: req.t('skill.notFound') });
    }
    console.error('Get lineage error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 技能存证回执下载（用于司法存证 / 第三方验证）
app.get('/api/chain/skills/:id/receipt', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) {
      return res.status(400).json({ error: 'invalid_skill_id' });
    }
    const receipt = await chainRead.getSkillReceipt(id);
    res.json(receipt);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: req.t('skill.notFound') });
    }
    console.error('Get receipt error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 贡献者 attribution 查询
app.get('/api/chain/skills/:id/contributors', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) {
      return res.status(400).json({ error: 'invalid_skill_id' });
    }
    const contributors = await chainRead.getSkillContributors(id);
    res.json({ skillId: id, contributors });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: req.t('skill.notFound') });
    }
    console.error('Get contributors error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── 链上读端点（Phase 27：经 cmc 网关的真实链数据，零 mock）──

// 技能列表（分页）
app.get('/api/skills', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = await chainRead.listSkills({ page, pageSize });
    res.json(result);
  } catch (error) {
    console.error('List skills error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 单个技能详情
app.get('/api/skills/:id', async (req, res) => {
  try {
    const skill = await chainRead.getSkillById(req.params.id);
    res.json(skill);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: req.t('skill.notFound') });
    }
    console.error('Get skill error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 用户声誉（含锁定 / 可恢复）
app.get('/api/reputation/:address', async (req, res) => {
  try {
    const reputation = await chainRead.getReputation(req.params.address);
    res.json(reputation);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: req.t('reputation.invalidAddress') });
    }
    console.error('Get reputation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 声誉排行榜
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const result = await chainRead.getLeaderboard({ limit });
    res.json(result);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 协议统计
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await chainRead.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AgentSkills API server running on port ${PORT}`);
  console.log(`Upload endpoint: POST http://localhost:${PORT}/api/upload`);
  console.log(`Status endpoint: GET http://localhost:${PORT}/api/status/:jobId`);
  console.log(`Chain endpoint: POST http://localhost:${PORT}/api/chain`);
  console.log(`Health endpoint: GET http://localhost:${PORT}/api/health`);
  console.log(`Skills endpoint: GET http://localhost:${PORT}/api/skills?page=1&pageSize=20`);
  console.log(`Skill detail endpoint: GET http://localhost:${PORT}/api/skills/:id`);
  console.log(`Reputation endpoint: GET http://localhost:${PORT}/api/reputation/:address`);
  console.log(`Leaderboard endpoint: GET http://localhost:${PORT}/api/leaderboard?limit=10`);
  console.log(`Stats endpoint: GET http://localhost:${PORT}/api/stats`);
  console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`Auth rate limit: ${authLimiterConfig.max} req / ${Math.round(authLimiterConfig.windowMs / 1000)}s per IP`);
  if (process.env.NODE_ENV === 'production' && process.env.CORS_ORIGIN) {
    console.log(`Additional CORS origins from CORS_ORIGIN: ${process.env.CORS_ORIGIN}`);
  }
  if (app.get('trust proxy') !== false) {
    console.log('Trust proxy is ENABLED — verify the upstream proxy count matches deployment');
  }
});

module.exports = app;
