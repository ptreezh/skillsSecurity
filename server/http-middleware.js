'use strict';

/**
 * HTTP 层生产加固：CORS 白名单 + 反向代理信任 + 请求限流
 *
 * 加固前的三个真实风险（PLAN-real-production P3/P4）：
 *   - CORS 白名单把 localhost 硬编码进生产：任何本地跑的网页都能对本机/生产
 *     API 发带凭据的跨域请求，这是最容易被忽略的一条
 *   - 未设置 trust proxy：部署到反向代理后 req.ip 恒为代理 IP，IP 限流形同虚设
 *   - 无限流：撞库与刷注册无任何节流（auth 层的账号锁定挡不住分布式尝试）
 *
 * 零第三方依赖：纯函数，测试无需启动服务器。
 */

const DEFAULT_CORS_ALLOWED = ['https://ptreezh.github.io']; // 生产前端（GitHub Pages）
const DEV_CORS_ALLOWED = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

// ── CORS ──────────────────────────────────────────────────────────────

function isProduction(env) {
  return String(env.NODE_ENV || '').toLowerCase() === 'production';
}

/**
 * 构造 CORS 配置。
 *
 * 生产环境默认只放行已部署的前端；localhost 仅在非生产环境放行。
 * CORS_ORIGIN 可追加 origin，但 '*' 不被接受 —— 带凭据的 '*' 等于全网放行。
 *
 * @param {Record<string,string|undefined>} env
 * @returns {{ allowed: string[], origin: (origin: string|undefined) => { allowed: boolean } }}
 */
function buildCorsOptions(env = process.env) {
  const configured = String(env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o && o !== '*');

  const allowed = Array.from(
    new Set([...(isProduction(env) ? [] : DEV_CORS_ALLOWED), ...DEFAULT_CORS_ALLOWED, ...configured])
  );

  const origin = (value) => ({ allowed: !value || allowed.includes(value) });
  return { allowed, origin };
}

// ── 反向代理 ───────────────────────────────────────────────────────────

/**
 * 是否信任 X-Forwarded-For。
 *
 * 默认不信任：无条件 `app.set('trust proxy', true)` 会让任何人伪造
 * X-Forwarded-For 绕过 IP 限流。只有明确给出跳数或显式 opt-in 才开启。
 *
 * @param {Record<string,string|undefined>} env
 * @returns {boolean|number}
 */
function resolveTrustProxy(env = process.env) {
  const raw = String(env.TRUST_PROXY || '').trim().toLowerCase();
  if (!raw || raw === 'false' || raw === '0') return false;
  if (raw === 'true' || raw === 'loopback') return true;
  if (/^\d+$/.test(raw)) return Number(raw);
  return false; // 含糊取值一律按不信任处理
}

// ── 限流 ──────────────────────────────────────────────────────────────

/**
 * 滑动窗口限流器（内存实现，零依赖）。
 *
 * 用于认证端点这类低频高危路径；返回结构与调用方解耦，方便替换为 Redis 实现。
 *
 * @param {{windowMs?:number, max?:number, maxKeys?:number, now?:()=>number}} [options]
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60_000;
  const max = options.max || 10;
  const maxKeys = options.maxKeys || 10_000;
  const now = options.now || Date.now;
  const hits = new Map(); // key -> number[]（窗口内的时间戳）

  function sweep(currentTime) {
    for (const [key, stamps] of hits) {
      const alive = stamps.filter((ts) => currentTime - ts < windowMs);
      if (alive.length === 0) hits.delete(key);
      else if (alive.length !== stamps.length) hits.set(key, alive);
    }
  }

  const limiter = (key) => {
    const currentTime = now();
    if (hits.size > maxKeys) sweep(currentTime);

    const stamps = (hits.get(key) || []).filter((ts) => currentTime - ts < windowMs);
    if (stamps.length >= max) {
      hits.set(key, stamps);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(1, windowMs - (currentTime - stamps[0]))
      };
    }
    stamps.push(currentTime);
    hits.set(key, stamps);
    return { allowed: true, remaining: max - stamps.length, retryAfterMs: 0 };
  };

  limiter.size = () => hits.size;
  limiter.reset = () => hits.clear();
  return limiter;
}

/** /api/auth/* 的默认限流参数：严格到能挡住脚本，宽松到不误伤真人 */
function authRateLimiter(env = process.env) {
  return {
    windowMs: Number(env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60_000),
    max: Number(env.AUTH_RATE_LIMIT_MAX || 20)
  };
}

module.exports = { buildCorsOptions, resolveTrustProxy, createRateLimiter, authRateLimiter };