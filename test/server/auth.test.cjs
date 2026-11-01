'use strict';

/**
 * auth.js + 身份端点集成测试（P2 身份层）
 *
 * 覆盖：
 *   1. 确定性地址派生：同一账密 → 同一地址；不同密码 → 不同地址
 *   2. scrypt 密码 hash：存储非明文、可校验
 *   3. 注册：成功 / 非法用户名 / 短密码 / 重复注册
 *   4. 登录：成功（地址与注册一致）/ 错误密码 / 不存在用户
 *   5. 会话：token 签发 / me() 解析 / logout 后失效
 *   6. HTTP 端点：写操作未带 token → 401；带 token → 放行
 *
 * 运行：
 *   node --test test/server/auth.test.cjs
 *   npm run test:unit（含本文件）
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

// 隔离：测试用临时 users.json，绝不污染 server/data/users.json
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const TEST_USERS_FILE = path.join(os.tmpdir(), `auth-test-${process.pid}.json`);
process.env.AUTH_USERS_FILE = TEST_USERS_FILE;
fs.rmSync(TEST_USERS_FILE, { force: true });

const auth = require('../../server/auth.js');

// ── 纯函数测试 ────────────────────────────────────────────────────────

test('deriveAddress: same credentials → same address (deterministic)', () => {
  const a1 = auth.deriveAddress('alice', 'hash1');
  const a2 = auth.deriveAddress('alice', 'hash1');
  assert.equal(a1, a2);
  assert.match(a1, /^0x[0-9a-fA-F]{40}$/);
});

test('deriveAddress: different username → different address', () => {
  const a1 = auth.deriveAddress('alice', 'hash1');
  const a2 = auth.deriveAddress('bob', 'hash1');
  assert.notEqual(a1, a2);
});

test('deriveAddress: different passwordHash → different address', () => {
  const a1 = auth.deriveAddress('alice', 'hash1');
  const a2 = auth.deriveAddress('alice', 'hash2');
  assert.notEqual(a1, a2);
});

test('hashPassword: scrypt output is 64-byte hex, never plaintext', () => {
  const salt = 'a'.repeat(32);
  const hash = auth.hashPassword('my-secret-pass', salt);
  assert.equal(hash.length, 128); // 64 bytes → 128 hex chars
  assert.ok(!hash.includes('my-secret-pass'));
  assert.notEqual(hash, auth.hashPassword('my-secret-pass', salt + 'x'));
});

// ── 注册 / 登录 / 会话 ─────────────────────────────────────────────────

test('register: creates user, issues token, address valid', () => {
  const name = `u_${Date.now()}`;
  const result = auth.register(name, 'password-123');
  assert.ok(result.token.length >= 64);
  assert.equal(result.username, name);
  assert.match(result.address, /^0x[0-9a-fA-F]{40}$/);
  // 用户已落盘（内存态可查；文件由 persistUsers 保证）
  assert.ok(auth.users.has(name));
  const record = auth.users.get(name);
  assert.ok(record.salt && record.salt.length >= 32); // 独立随机盐
  assert.ok(record.passwordHash && !record.passwordHash.includes('password-123')); // 非明文
});

test('register: rejects invalid username', () => {
  assert.throws(() => auth.register('x', 'password-123'), /用户名/);
  assert.throws(() => auth.register('ab', 'password-123'), /用户名/); // 太短
  assert.throws(() => auth.register('has space!', 'password-123'), /用户名/);
  assert.throws(() => auth.register('', 'password-123'), /用户名/);
});

test('register: rejects short password', () => {
  assert.throws(() => auth.register(`u2_${Date.now()}`, 'short'), /密码/);
});

test('register: duplicate username → 409', () => {
  const name = `dup_${Date.now()}`;
  auth.register(name, 'password-123');
  assert.throws(() => auth.register(name, 'different-pass'), /已存在/);
});

test('login: success with correct password, same address as register', () => {
  const name = `login_${Date.now()}`;
  const reg = auth.register(name, 'password-123');
  const login = auth.login(name, 'password-123');
  assert.equal(login.address, reg.address);
  assert.equal(login.username, name);
  assert.ok(login.token.length >= 64);
});

test('login: wrong password → 401', () => {
  const name = `loginw_${Date.now()}`;
  auth.register(name, 'password-123');
  assert.throws(() => auth.login(name, 'wrong-password'), /用户名或密码/);
});

test('login: nonexistent user → 401', () => {
  assert.throws(() => auth.login(`ghost_${Date.now()}`, 'password-123'), /用户名或密码/);
});

test('me: resolves token to user with reputation field', () => {
  const name = `me_${Date.now()}`;
  const { token, address } = auth.register(name, 'password-123');
  const me = auth.me(token);
  assert.equal(me.username, name);
  assert.equal(me.address, address);
  assert.equal(typeof me.reputation, 'number');
});

test('logout: token invalidated after logout', () => {
  const name = `logout_${Date.now()}`;
  const { token } = auth.register(name, 'password-123');
  assert.ok(auth.me(token));
  auth.logout(token);
  assert.equal(auth.me(token), null);
});

test('register→login→me: full happy path with stable address', () => {
  const name = `full_${Date.now()}`;
  const reg = auth.register(name, 'password-123');
  const login = auth.login(name, 'password-123');
  const me = auth.me(login.token);
  assert.equal(reg.address, login.address);
  assert.equal(me.address, login.address);
});

// ── requireAuth 中间件 ────────────────────────────────────────────────

test('requireAuth: missing token → 401', () => {
  const req = { headers: {} };
  const res = { status: (c) => ({ json: (b) => ({ status: c, body: b }) }) };
  let nextCalled = false;
  const result = auth.requireAuth(req, res, () => { nextCalled = true; });
  assert.equal(result.status, 401);
  assert.equal(nextCalled, false);
  assert.equal(req.user, undefined);
});

test('requireAuth: invalid/expired token → 401', () => {
  const req = { headers: { authorization: 'Bearer deadbeefdeadbeef' } };
  const res = { status: (c) => ({ json: (b) => ({ status: c, body: b }) }) };
  let nextCalled = false;
  const result = auth.requireAuth(req, res, () => { nextCalled = true; });
  assert.equal(result.status, 401);
  assert.equal(nextCalled, false);
});

test('requireAuth: valid token → req.user set, next called', () => {
  const name = `mw_${Date.now()}`;
  const { token, username, address } = auth.register(name, 'password-123');
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = { status: () => ({ json: () => ({}) }) };
  let nextCalled = false;
  auth.requireAuth(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.username, username);
  assert.equal(req.user.address, address);
});