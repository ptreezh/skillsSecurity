'use strict';

/**
 * 生产加固：会话持久化 + 暴力破解锁定 + 审计日志 + 时序安全
 *
 * 加固前的致命缺陷（PLAN-real-production P2）：
 *   - sessions 是内存 Map → 进程重启即全员掉线；多实例部署互不认识
 *   - 登录无失败计数 → 可无限撞库
 *   - 用户不存在时直接 return，不走 scrypt → 时序侧信道可枚举用户
 *   - 没有任何安全事件留痕 → 事故无法追责
 *   - token 明文落盘（一旦引入持久化）等于把 bearer 凭据写进磁盘
 *
 * 零第三方依赖：仅用 Node 内置 crypto/fs/path。
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── 常量 ──────────────────────────────────────────────────────────────
const USERS_FILE = process.env.AUTH_USERS_FILE || path.join(__dirname, 'data', 'users.json');
const SESSIONS_FILE = process.env.AUTH_SESSIONS_FILE || path.join(__dirname, 'data', 'sessions.json');
const LOG_FILE = process.env.AUTH_LOG_FILE || path.join(__dirname, 'data', 'auth.log.jsonl');
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const SCRYPT_KEYLEN = 64;

const MAX_ATTEMPTS = Number(process.env.AUTH_MAX_ATTEMPTS || 5);
const LOCKOUT_MS = Number(process.env.AUTH_LOCKOUT_MS || 15 * 60 * 1000);
const MAX_SESSIONS_PER_USER = Number(process.env.AUTH_MAX_SESSIONS_PER_USER || 10);
const AUDIT_LOCK_TIMEOUT_MS = 2000;

// ── 内存态 ────────────────────────────────────────────────────────────
// users: { [username]: { passwordHash, salt, address, reputation, createdAt, updatedAt } }
// sessions: { [sha256(token)]: { username, address, expiresAt, createdAt } }  ← 磁盘存哈希键
// attempts: { [key]: { count, firstAt } }  key = `u:<username>` / `ip:<addr>`
const users = new Map();
const sessions = new Map();
const attempts = new Map();

// ── 工具 ──────────────────────────────────────────────────────────────

/** 密码 hash（scrypt，不可逆） */
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
}

/**
 * 确定性 40-hex 地址派生：
 *   address = '0x' + sha256("agentskills:" + username + ":" + passwordHash).slice(0, 40)
 * 同一账密永远得到同一地址（确定性）；倒推需要 sha256 原像，安全。
 */
function deriveAddress(username, passwordHash) {
  const digest = crypto
    .createHash('sha256')
    .update(`agentskills:${username}:${passwordHash}`)
    .digest('hex');
  return '0x' + digest.slice(0, 40);
}

/** token 只以 sha256 形式落盘：sessions.json 被读走也无法直接冒用 */
function tokenKey(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * 定长安全比较：长度不等直接判否。
 * crypto.timingSafeEqual 对长度不等的 Buffer 会抛 RangeError —— 加固前一段
 * 损坏/异构的 users.json 就能把登录打成 500。
 */
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || a.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

// ── 持久化（原子写）────────────────────────────────────────────────────

function atomicWriteJson(file, value) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function persistUsers() {
  atomicWriteJson(USERS_FILE, Object.fromEntries(users));
}

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return;
  try {
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    for (const [username, record] of Object.entries(parsed)) {
      users.set(username, record);
    }
  } catch (err) {
    console.error('[auth] users.json 解析失败（忽略，使用空注册表）:', err.message);
  }
}

function persistSessions() {
  try {
    atomicWriteJson(SESSIONS_FILE, Object.fromEntries(sessions));
  } catch (err) {
    console.error('[auth] sessions.json 写入失败:', err.message);
  }
}

function loadSessions() {
  if (!fs.existsSync(SESSIONS_FILE)) return;
  try {
    const parsed = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    const now = Date.now();
    for (const [key, record] of Object.entries(parsed)) {
      // 过期会话在加载时即丢弃，不给「过期 token 复活」留窗口
      if (record && typeof record.expiresAt === 'number' && record.expiresAt > now) {
        sessions.set(key, record);
      }
    }
  } catch (err) {
    console.error('[auth] sessions.json 解析失败（忽略，使用空会话表）:', err.message);
  }
}

// ── 审计日志（跨进程锁 + JSONL）────────────────────────────────────────
// 无锁并发 append 会让 UTF-8 行交错，整份日志报废。这里用 lockfile 串行化：
// 以 'wx' 独占创建锁文件 → 写入 → 释放。锁带超时与陈旧锁自愈，避免进程崩溃后死锁。

function sleepMs(ms) {
  const shared = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(shared, 0, 0, ms);
}

function appendAuditLines(file, lines) {
  if (!lines.length) return;
  const lock = `${file}.lock`;
  const deadline = Date.now() + AUDIT_LOCK_TIMEOUT_MS;
  let fd = null;

  for (;;) {
    try {
      fd = fs.openSync(lock, 'wx');
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      if (Date.now() > deadline) {
        // 陈旧锁（写进程已崩溃）：抢过来删掉再重试一次
        try { fs.unlinkSync(lock); } catch { /* 已被他人清理 */ }
        if (Date.now() > deadline + AUDIT_LOCK_TIMEOUT_MS) {
          throw Object.assign(new Error('审计日志锁获取超时'), { status: 503 });
        }
        continue;
      }
      sleepMs(5);
    }
  }

  try {
    // 按构造保证每条记录自成一行：调用方漏掉 '\n' 时不至于把两条 JSON 粘成一行
    // 导致整份日志报废（这类损坏是静默的，只有事后追事故时才会发现）。
    const payload = lines.map((line) => (line.endsWith('\n') ? line : `${line}\n`)).join('');
    fs.appendFileSync(file, payload, 'utf8');
  } finally {
    try { if (fd !== null) fs.closeSync(fd); } catch { /* ignore */ }
    try { fs.unlinkSync(lock); } catch { /* ignore */ }
  }
}

function audit(event, fields = {}) {
  const record = { ts: new Date().toISOString(), event, ...fields };
  try {
    appendAuditLines(LOG_FILE, [`${JSON.stringify(record)}\n`]);
  } catch (err) {
    // 审计失败不得连带打挂登录，但要留下可见痕迹
    console.error('[auth] 审计日志写入失败:', err.message, record);
  }
}

// ── 失败计数与锁定 ─────────────────────────────────────────────────────

function attemptKeys(username, ip) {
  const keys = [`u:${username}`];
  if (ip) keys.push(`ip:${ip}`);
  return keys;
}

function isLocked(username, ip) {
  const now = Date.now();
  return attemptKeys(username, ip).some((key) => {
    const entry = attempts.get(key);
    if (!entry) return false;
    if (entry.count < MAX_ATTEMPTS) return false;
    if (now - entry.firstAt >= LOCKOUT_MS) {
      attempts.delete(key); // 锁定自然过期
      return false;
    }
    return true;
  });
}

function noteFailure(username, ip) {
  const now = Date.now();
  for (const key of attemptKeys(username, ip)) {
    const entry = attempts.get(key);
    if (!entry || now - entry.firstAt >= LOCKOUT_MS) {
      attempts.set(key, { count: 1, firstAt: now });
    } else {
      entry.count += 1;
    }
  }
}

function clearFailures(username, ip) {
  for (const key of attemptKeys(username, ip)) attempts.delete(key);
}

// ── 会话 ──────────────────────────────────────────────────────────────

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** 超出每用户上限时淘汰最早的会话，防止 sessions.json 无界增长 */
function enforceSessionCap(username) {
  const owned = [...sessions.entries()]
    .filter(([, s]) => s.username === username)
    .sort((a, b) => a[1].createdAt - b[1].createdAt);
  const excess = owned.length - MAX_SESSIONS_PER_USER;
  for (let i = 0; i < excess; i += 1) sessions.delete(owned[i][0]);
}

function issueSession(username, address) {
  const token = createToken();
  const now = Date.now();
  sessions.set(tokenKey(token), { username, address, createdAt: now, expiresAt: now + TOKEN_TTL_MS });
  enforceSessionCap(username);
  persistSessions();
  return token;
}

function revokeSession(token) {
  const removed = sessions.delete(tokenKey(token));
  if (removed) persistSessions();
  return removed;
}

function resolveSession(token) {
  const key = tokenKey(token);
  const session = sessions.get(key);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(key);
    persistSessions();
    return null;
  }
  return session;
}

// ── 认证 API ──────────────────────────────────────────────────────────

/**
 * 注册：校验账密 → 地址派生 → 持久化 → 签发 token
 * @returns {{ token, username, address }}
 * @throws {Error} 用户名已存在 / 校验失败
 */
function register(username, password) {
  if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_\-]{3,32}$/.test(username)) {
    throw Object.assign(new Error('用户名须为 3-32 位字母/数字/_/-'), { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw Object.assign(new Error('密码长度须为 8-128 位'), { status: 400 });
  }
  if (users.has(username)) {
    throw Object.assign(new Error('用户名已存在'), { status: 409 });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const address = deriveAddress(username, passwordHash);
  const now = new Date().toISOString();

  users.set(username, { passwordHash, salt, address, reputation: 0, createdAt: now, updatedAt: now });
  persistUsers();

  const token = issueSession(username, address);
  audit('register', { username, address });
  return { token, username, address };
}

/**
 * 登录：账密校验 → 签发 token
 *
 * 抗枚举：用户不存在时照样跑一次 scrypt（哑盐），使「不存在」与「密码错」
 * 的耗时与响应完全一致 —— 加固前直接 return 是一台免费的用户枚举器。
 *
 * @param {string} username
 * @param {string} password
 * @param {{ip?: string}} [meta] ip 用于失败计数（按 IP + 按用户双键锁定）
 * @returns {{ token, username, address }}
 * @throws {Error} 401 未授权 / 429 已锁定
 */
function login(username, password, meta = {}) {
  const ip = meta && meta.ip;
  if (!username || !password) {
    throw Object.assign(new Error('用户名与密码必填'), { status: 400 });
  }

  if (isLocked(username, ip)) {
    audit('login_locked', { username, ip: ip || null });
    throw Object.assign(new Error('尝试过多，账户已临时锁定，请稍后再试'), { status: 429 });
  }

  const record = users.get(username);
  const candidateHash = hashPassword(password, record ? record.salt : 'agentskills-dummy-salt');

  if (!record || !safeEqualHex(candidateHash, record.passwordHash)) {
    noteFailure(username, ip);
    audit('login_failure', { username, ip: ip || null, known: Boolean(record) });
    // 文案刻意不区分「用户不存在」与「密码错误」
    throw Object.assign(new Error('用户名或密码错误'), { status: 401 });
  }

  clearFailures(username, ip);
  const token = issueSession(username, record.address);
  audit('login_success', { username, address: record.address, ip: ip || null });
  return { token, username, address: record.address };
}

/** 登出：销毁 token */
function logout(token, meta = {}) {
  if (!token) return false;
  const removed = revokeSession(token);
  audit('logout', { tokenHint: tokenHint(token), removed, ip: (meta && meta.ip) || null });
  return removed;
}

/** 日志里的 token 只留前 8 位，够定位会话又不至于成为凭据 */
function tokenHint(token) {
  return String(token).slice(0, 8);
}

/** Express 认证中间件：解析 Authorization: Bearer <token>，挂载 req.user */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+([^\s]+)$/.exec(header);
  if (!match) {
    return res.status(401).json({ error: req.t ? req.t('auth.required') : 'Authentication required' });
  }
  const session = resolveSession(match[1]);
  if (!session) {
    return res.status(401).json({ error: req.t ? req.t('auth.invalid') : 'Invalid or expired token' });
  }
  req.user = { username: session.username, address: session.address, token: match[1] };
  next();
}

/** 当前用户信息 */
function me(token) {
  const session = resolveSession(token);
  if (!session) return null;
  const record = users.get(session.username);
  return {
    username: session.username,
    address: session.address,
    reputation: record ? record.reputation : 0,
    createdAt: record ? record.createdAt : null
  };
}

// ── 初始化 ────────────────────────────────────────────────────────────
loadUsers();
loadSessions();

module.exports = {
  register,
  login,
  logout,
  me,
  requireAuth,
  deriveAddress,
  hashPassword,
  safeEqualHex,
  appendAuditLines,
  tokenKey,
  users,
  sessions,
  attempts,
  TOKEN_TTL_MS,
  MAX_ATTEMPTS,
  LOCKOUT_MS,
  MAX_SESSIONS_PER_USER
};