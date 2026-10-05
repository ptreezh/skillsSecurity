'use strict';

/**
 * HTTP 层加固：失败限流 + 生产 CORS 白名单 + 反向代理信任
 *
 * 覆盖 server/index.js 的三条生产前提：
 *   1. /api/auth/* 有失败次数上限（即便攻击者轮换用户名也能被 IP 维度拦住）
 *   2. 生产环境不放行 localhost origin（本地任意网页都能打生产 API）
 *   3. 默认不信任 X-Forwarded-For（否则 IP 限流可被伪造头绕过）
 *
 * 运行：
 *   node --test test/server/http-hardening.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  createRateLimiter,
  authRateLimiter,
  buildCorsOptions,
  resolveTrustProxy
} = require('../../server/http-middleware.js');

// ── 限流 ──────────────────────────────────────────────────────────────

test('rateLimiter: allows up to the limit inside the window', () => {
  let now = 1_000_000;
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3, now: () => now });

  for (let i = 0; i < 3; i += 1) {
    assert.equal(limiter('1.2.3.4').allowed, true, `第 ${i + 1} 次应放行`);
  }
  assert.equal(limiter('1.2.3.4').allowed, false, '超出上限必须拦截');
});

test('rateLimiter: the window slides, a blocked key recovers', () => {
  let now = 1_000_000;
  const limiter = createRateLimiter({ windowMs: 1_000, max: 1, now: () => now });

  assert.equal(limiter('1.2.3.4').allowed, true);
  assert.equal(limiter('1.2.3.4').allowed, false);

  now += 1_001; // 窗口过期
  assert.equal(limiter('1.2.3.4').allowed, true, '窗口滑过后必须自动恢复');
});

test('rateLimiter: keys are independent (one attacker cannot lock out others)', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1, now: () => 2_000_000 });

  assert.equal(limiter('9.9.9.9').allowed, true);
  assert.equal(limiter('9.9.9.9').allowed, false);
  assert.equal(limiter('8.8.8.8').allowed, true, '受害 IP 不得被他人拖入锁定');
});

test('rateLimiter: a flood of distinct keys is swept (no unbounded memory)', () => {
  let now = 3_000_000;
  const limiter = createRateLimiter({ windowMs: 1_000, max: 5, now: () => now, maxKeys: 50 });

  for (let i = 0; i < 500; i += 1) limiter(`10.0.${Math.floor(i / 256)}.${i % 256}`);

  now += 5_000; // 全部过期
  limiter('10.9.9.9'); // 触发清扫

  assert.ok(limiter.size() <= 50, `过期键必须被清扫，实际 ${limiter.size()}`);
});

test('rateLimiter: reports retryAfterMs and remaining quota', () => {
  let now = 4_000_000;
  const limiter = createRateLimiter({ windowMs: 30_000, max: 2, now: () => now });

  assert.equal(limiter('5.5.5.5').remaining, 1);
  limiter('5.5.5.5');
  const blocked = limiter('5.5.5.5');
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterMs > 0 && blocked.retryAfterMs <= 30_000);
});

test('authRateLimiter: defaults are strict enough to matter', () => {
  // 默认窗口/上限必须是「有意义」的值：不能出现默认等于不限制
  assert.ok(authRateLimiter().max <= 20, `默认上限过高：${authRateLimiter().max}`);
  assert.ok(authRateLimiter().windowMs <= 15 * 60_000, `默认窗口过长：${authRateLimiter().windowMs}`);
});

// ── 生产 CORS ─────────────────────────────────────────────────────────

test('cors: production does not allow localhost origins', () => {
  const { allowed } = buildCorsOptions({ NODE_ENV: 'production' });
  for (const origin of allowed) {
    assert.ok(!/^http:\/\/(localhost|127\.0\.0\.1)/.test(origin), `生产环境不得放行 ${origin}`);
  }
});

test('cors: production still allows the deployed frontend', () => {
  const { allowed } = buildCorsOptions({ NODE_ENV: 'production' });
  assert.ok(allowed.includes('https://ptreezh.github.io'), '生产前端必须可用');
});

test('cors: development allows the Vite dev servers', () => {
  const { allowed } = buildCorsOptions({ NODE_ENV: 'development' });
  assert.ok(allowed.includes('http://localhost:5173'));
  assert.ok(allowed.includes('http://127.0.0.1:5173'));
});

test('cors: CORS_ORIGIN extends the list and rejects the wildcard', () => {
  const { allowed } = buildCorsOptions({
    NODE_ENV: 'production',
    CORS_ORIGIN: 'https://a.example, https://b.example'
  });
  assert.ok(allowed.includes('https://a.example'));
  assert.ok(allowed.includes('https://b.example'));

  const wildcard = buildCorsOptions({ NODE_ENV: 'production', CORS_ORIGIN: '*' });
  assert.ok(!wildcard.allowed.includes('*'), '不得把 * 当作白名单项放行');
  assert.equal(wildcard.origin('https://evil.example', () => {}).allowed, false);
});

test('cors: origin callback allows listed origins and blocks the rest', () => {
  const { origin } = buildCorsOptions({ NODE_ENV: 'production', CORS_ORIGIN: 'https://ok.example' });
  assert.equal(origin('https://ok.example', () => {}).allowed, true);
  assert.equal(origin('https://evil.example', () => {}).allowed, false);
  assert.equal(origin('http://localhost:5173', () => {}).allowed, false);
  assert.equal(origin(undefined, () => {}).allowed, true, '无 Origin（同源/服务端调用）应放行');
});

// ── 反向代理信任 ───────────────────────────────────────────────────────

test('trustProxy: disabled by default', () => {
  assert.equal(resolveTrustProxy({}), false);
  assert.equal(resolveTrustProxy({ TRUST_PROXY: 'false' }), false);
});

test('trustProxy: only an explicit hop count or loopback opt-in enables it', () => {
  assert.equal(resolveTrustProxy({ TRUST_PROXY: 'true' }), true);
  assert.equal(resolveTrustProxy({ TRUST_PROXY: '2' }), 2);
  assert.equal(resolveTrustProxy({ TRUST_PROXY: 'yes' }), false, '含糊取值不得默许');
});