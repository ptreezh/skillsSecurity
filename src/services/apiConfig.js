/**
 * apiConfig - 运行时 API 地址解析（Phase 29 / v2.0 生产接线）
 *
 * 方案 A（本机持久 + 内网穿透）的根因设计：
 *   免费快速隧道的公网 URL 每次重启会变。若 URL 烘焙进构建产物（VITE_API_URL），
 *   隧道一变就得重建+重部署前端。改为**运行时解析**：
 *
 *   优先级：
 *     1. public/api-config.json 的 apiUrl（随仓库推送，Pages 自动重部署，秒级换 URL）
 *     2. 构建期 VITE_API_URL（兼容既有 CI secret 用法）
 *     3. http://localhost:10001（本地开发兜底）
 *
 *   换隧道 URL 的操作 = 更新 api-config.json + git push（deploy-frontend.yml on push 自动部署）。
 */

let cachedBase = null
let resolving = null

/** 读取站点同源下的 api-config.json（vite base=/skillsSecurity/ → 相对路径即可） */
function fetchConfiguredUrl() {
  return fetch('./api-config.json', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((cfg) => (cfg && typeof cfg.apiUrl === 'string' && cfg.apiUrl ? cfg.apiUrl : null))
    .catch(() => null)
}

/**
 * 解析 API 基址（全进程单次解析，结果缓存）。
 * 任何请求前必须 await 它；解析失败落到本地兜底。
 */
export function getApiBase() {
  if (cachedBase) return Promise.resolve(cachedBase)
  if (!resolving) {
    resolving = fetchConfiguredUrl()
      .then((runtimeUrl) => {
        cachedBase =
          runtimeUrl ||
          import.meta.env.VITE_API_URL ||
          'http://localhost:10001'
        return cachedBase
      })
      .catch(() => {
        cachedBase = import.meta.env.VITE_API_URL || 'http://localhost:10001'
        return cachedBase
      })
  }
  return resolving
}

/** 测试钩子：重置缓存（仅单测/调试用） */
export function __resetApiBaseCache() {
  cachedBase = null
  resolving = null
}
