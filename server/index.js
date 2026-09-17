require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { processAuditJob } = require('./audit-agent');
const { submitToChain } = require('./chain-submit');
const chainRead = require('./chain-read');
const { jobs, addJob, updateJob, getJob } = require('./jobs');
const { localeMiddleware } = require('./locale-middleware');

const app = express();
const PORT = process.env.PORT || 10001;

// Ensure directories exist
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// CORS: allow local dev, the production frontend, and any extra configured origins
// 根治策略（P28/P29）：生产前端 origin（GitHub Pages）默认放行，不再依赖逐环境手配；
// 额外 origin 仍可用 CORS_ORIGIN=xxx,yyy 扩展
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'https://ptreezh.github.io' // 生产前端（GitHub Pages，公网访问链路）
    ];
    if (CORS_ORIGIN) {
      CORS_ORIGIN.split(',').forEach(o => allowed.push(o.trim()));
    }
    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    chain: {
      configured: true, // ChainMaker 网关为真实依赖（docker exec cmc 可用即可）
      network: process.env.CHAINMAKER_CHAIN_ID || 'chain1',
      skillRegistry: 'AS_SkillRegistry',
      cmcCommand: process.env.CHAINMAKER_CMC_CMD || 'docker exec cmc-debug cmc'
    }
  });
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: req.t('upload.noFile') });
    }

    const jobId = uuidv4();
    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // Create job entry
    addJob({
      id: jobId,
      status: 'pending',
      filePath,
      originalName,
      createdAt: new Date().toISOString()
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

// Trigger on-chain submission
app.post('/api/chain', async (req, res) => {
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

    // Submit to chain
    updateJob(jobId, { status: 'submitting', message: req.t('chain.submitting') });
    const result = await submitToChain(job, req.locale);

    updateJob(jobId, {
      status: 'on_chain',
      message: req.t('chain.onChain'),
      skillId: result.skillId,
      txHash: result.txHash
    });

    res.json({
      status: 'on_chain',
      skillId: result.skillId,
      txHash: result.txHash
    });
  } catch (error) {
    console.error('Chain submission error:', error);
    updateJob(req.body.jobId, { status: 'failed', error: error.message });
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
  if (process.env.CORS_ORIGIN) {
    console.log(`CORS origins: ${process.env.CORS_ORIGIN}`);
  } else {
    console.log('CORS origins: localhost only (set CORS_ORIGIN for production)');
  }
});

module.exports = app;
