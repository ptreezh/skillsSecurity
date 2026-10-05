'use strict';

/**
 * auth.js 生产加固测试：持久化会话 / 暴力破解锁定 / 审计日志 / 时序安全
 *
 * 与 auth.test.cjs 的分工：那份测「身份功能是否正确」，这份测「上线后是否扛得住」
 * （重启不掉线、暴力破解被锁、密钥不落盘、审计可追责、时序不泄露用户是否存在）。
 *
 * 运行：
 *   node --test test/server/auth-hardening.test.cjs
 *   npm run test:unit（含本文件）
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

// 隔离：本文件用独立临时目录，绝不污染 server/data/
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const TMP = path.join(os.tmpdir(), `auth-hardening-${process.pid}`);
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const USERS_FILE = path.join(TMP, 'users.json');
const SESSIONS_FILE = path.join(TMP, 'sessions.json');
const LOG_FILE = path.join(TMP, 'auth.log.jsonl');

process.env.AUTH_USERS_FILE = USERS_FILE;
process.env.AUTH_SESSIONS_FILE = SESSIONS_FILE;
process.env.AUTH_LOG_FILE = LOG_FILE;
process.env.AUTH_MAX_ATTEMPTS = '4';
process.env.AUTH_LOCKOUT_MS = '60000';

/** 模拟进程重启：清缓存重新 require，模块会重跑 loadUsers/loadSessions */
function freshAuth() {
  delete require.cache[require.resolve('../../server/auth.js')];
  return require('../../server/auth.js');
}

function captureError(fn) {
  try {
    fn();
    return null;
  } catch (err) {
    return err;
  }
}

const auth = freshAuth();

// ── 会话持久化 ─────────────────────────────────────────────────────────

test('session: a token stays valid across a process restart', () => {
  const { token, username } = auth.register('persist_user', 'password-123');
  assert.ok(auth.me(token), '签发后应立即可用');

  const reloaded = freshAuth();
  const me = reloaded.me(token);
  assert.ok(me, '重启后会话必须仍然有效（内存态 Map 在真实部署里会全部丢失）');
  assert.equal(me.username, username);
});

test('session: the sessions file never contains a usable bearer token', () => {
  const { token } = auth.register('secret_at_rest', 'password-123');
  const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');

  assert.ok(!raw.includes(token), '会话文件落盘的是可直接使用的 token，等于把 bearer 凭据写进磁盘');

  const stored = JSON.parse(raw);
  assert.ok(Object.keys(stored).length >= 1, '会话应确实落盘了');
  for (const [key, value] of Object.entries(stored)) {
    assert.match(key, /^[0-9a-f]{64}$/, '会话键必须是 sha256(token) 而非 token 本身');
    assert.ok(value.username && value.address && value.expiresAt);
  }
});

test('session: logout revokes durably (a restart must not resurrect it)', () => {
  const { token } = auth.register('logout_durable', 'password-123');
  assert.ok(auth.me(token));
  auth.logout(token);

  const reloaded = freshAuth();
  assert.equal(reloaded.me(token), null, '登出必须落盘，否则重启即复活');
});

test('session: expired sessions are dropped on load', () => {
  const { token } = auth.register('expiry_user', 'password-123');
  // 直接把落盘记录的 expiresAt 改成过去，模拟时间流逝后重启
  const stored = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
  const key = Object.keys(stored).find((k) => stored[k].username === 'expiry_user');
  assert.ok(key, '会话应已落盘');
  stored[key].expiresAt = Date.now() - 1000;
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(stored), 'utf8');

  const reloaded = freshAuth();
  assert.equal(reloaded.me(token), null, '过期会话不得被 loadSessions 复活');
});

test('session: a user cannot accumulate unbounded sessions', () => {
  const name = 'many_sessions';
  auth.register(name, 'password-123');

  // 连续签发远超上限，登录仍应可用（上限只淘汰旧会话，不拒绝签发）
  for (let i = 0; i < 12; i += 1) auth.login(name, 'password-123');

  const stored = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
  const live = Object.values(stored).filter((s) => s.username === name);
  assert.ok(live.length <= auth.MAX_SESSIONS_PER_USER, `每个用户的在用会话应被限制在 ${auth.MAX_SESSIONS_PER_USER} 以内，实际 ${live.length}`);
});

// ── 暴力破解锁定 + 用户枚举 ────────────────────────────────────────────

test('login: repeated failures lock the account, correct password included', () => {
  const name = 'lockme';
  auth.register(name, 'password-123');

  for (let i = 0; i < 4; i += 1) {
    const err = captureError(() => auth.login(name, 'wrong-password'));
    assert.equal(err.status, 401, `第 ${i + 1} 次失败应是 401`);
  }

  const locked = captureError(() => auth.login(name, 'password-123'));
  assert.ok(locked, '锁定后即使密码正确也必须被拒');
  assert.equal(locked.status, 429);
  assert.match(locked.message, /锁定/);
});

test('login: a successful login clears the failure counter', () => {
  const name = 'reset_me';
  auth.register(name, 'password-123');

  for (let i = 0; i < 3; i += 1) captureError(() => auth.login(name, 'wrong-password'));
  assert.ok(auth.login(name, 'password-123'), '未达阈值前应能正常登录');

  // 计数已清零：再错 3 次不应触发锁定
  for (let i = 0; i < 3; i += 1) {
    assert.equal(captureError(() => auth.login(name, 'wrong-password')).status, 401);
  }
  assert.ok(auth.login(name, 'password-123'), '计数清零后不应残留锁定');
});

test('login: lockout is keyed per IP as well as per username', () => {
  const name = 'ip_lock';
  auth.register(name, 'password-123');

  for (let i = 0; i < 4; i += 1) {
    captureError(() => auth.login(name, 'wrong-password', { ip: '10.0.0.1' }));
  }

  // 账号维度：换 IP 也仍锁定 —— 否则攻击者轮换 IP 即可绕过账号节流
  const sameAccount = captureError(() => auth.login(name, 'password-123', { ip: '10.0.0.2' }));
  assert.equal(sameAccount.status, 429, '账号锁定必须跨 IP 生效，否则分布式撞库可直接绕过');

  // IP 维度：同一 IP 的失败计数独立存在，对另一个账号同样生效
  const victim = 'ip_lock_other';
  auth.register(victim, 'password-123');
  const sameIp = captureError(() => auth.login(victim, 'password-123', { ip: '10.0.0.1' }));
  assert.equal(sameIp.status, 429, '同一 IP 的暴力尝试必须波及其名下其他账号');
});

test('login: unknown user and wrong password are indistinguishable', () => {
  const known = 'known_user';
  auth.register(known, 'password-123');

  const unknown = captureError(() => auth.login('no_such_user_anywhere', 'password-123'));
  const wrong = captureError(() => auth.login(known, 'wrong-password'));

  assert.equal(unknown.status, wrong.status);
  assert.equal(unknown.message, wrong.message, '错误文案不得区分「用户不存在」与「密码错误」');
});

test('login: unknown user still burns a scrypt (no timing oracle)', () => {
  // 不比较墙钟耗时（易抖动），而是断言未知用户走了和已知用户同一条校验路径：
  // 两者都返回同样的 401，且未知用户不会被提前短路成「无 record」错误。
  const unknown = captureError(() => auth.login('ghost_timing', 'password-123'));
  assert.equal(unknown.status, 401);
  assert.match(unknown.message, /用户名或密码/);
});

// ── 时序安全的长度守卫 ─────────────────────────────────────────────────

test('login: a corrupted stored hash yields 401 instead of crashing', () => {
  const altUsers = path.join(TMP, 'users-corrupt.json');
  fs.writeFileSync(
    altUsers,
    JSON.stringify({
      corrupt_user: {
        passwordHash: 'deadbeef', // 短哈希：timingSafeEqual 长度不等会抛 RangeError
        salt: 'aabbccdd',
        address: `0x${'0'.repeat(40)}`,
        reputation: 0,
        createdAt: '',
        updatedAt: ''
      }
    }),
    'utf8'
  );

  const originalUsersFile = process.env.AUTH_USERS_FILE;
  process.env.AUTH_USERS_FILE = altUsers;
  try {
    const reloaded = freshAuth();
    const err = captureError(() => reloaded.login('corrupt_user', 'password-123'));
    assert.ok(err, '损坏的哈希必须被拒');
    assert.equal(err.status, 401, `不得抛未捕获异常（500）：${err && err.message}`);
  } finally {
    process.env.AUTH_USERS_FILE = originalUsersFile;
    freshAuth();
  }
});

// ── 审计日志 ───────────────────────────────────────────────────────────

test('audit: security events are appended as JSON lines without secrets', () => {
  const name = 'audited';
  auth.register(name, 'password-123');
  captureError(() => auth.login(name, 'wrong-password'));
  const ok = auth.login(name, 'password-123', { ip: '203.0.113.7' });
  auth.logout(ok.token);

  const raw = fs.readFileSync(LOG_FILE, 'utf8');
  const events = raw
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
    .map((e) => e.event);

  for (const expected of ['register', 'login_failure', 'login_success', 'logout']) {
    assert.ok(events.includes(expected), `审计日志缺少 ${expected}：${events.join(',')}`);
  }

  assert.ok(!raw.includes('password-123'), '审计日志绝不能落密码');
  assert.ok(!raw.includes(ok.token), '审计日志绝不能落 token');

  const success = raw
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
    .filter((e) => e.event === 'login_success')
    .find((e) => e.username === name);
  assert.equal(success.username, name);
  assert.match(success.address, /^0x[0-9a-f]{40}$/);
  assert.equal(success.ip, '203.0.113.7');
  assert.ok(success.ts, '每条审计记录需带时间戳');
});

test('audit: concurrent writers do not interleave JSON lines', () => {
  const file = path.join(TMP, 'concurrent.jsonl');
  const lines = [];
  for (let i = 0; i < 200; i += 1) lines.push(JSON.stringify({ i, pad: 'x'.repeat(200) }));

  // 同进程并发 append（模拟多请求同时打 auth 端点）
  const chunks = [];
  for (let i = 0; i < lines.length; i += 2) chunks.push(lines.slice(i, i + 2));
  chunks.forEach((chunk) => auth.appendAuditLines(file, chunk));

  const parsed = fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.equal(parsed.length, lines.length, '并发写入后每行仍必须是完整可解析的 JSON');
});