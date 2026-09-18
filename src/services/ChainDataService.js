/**
 * ChainDataService - 后端 API 数据层（Phase 28 / v2.0 端到端上线）
 *
 * 宪法约束：无代币；ChainMaker chain1 无浏览器可达 RPC，
 * 所有链上读写一律经后端网关（浏览器永不直连链）。
 *
 * 读：GET /api/skills、/api/skills/:id、/api/reputation/:address、
 *     /api/leaderboard、/api/stats（P27 上线的 5 个真链端点）
 * 写：复用 uploadService 既有管线（/api/upload → /api/status/:jobId → /api/chain），
 *     本层不重复封装写路径。
 *
 * 说明：
 *   - skills 1-2 等无镜像旧行的字符串字段为 null → UI 层兜底（skill-<id>）
 *   - 链上无"点赞/逐技能声誉"概念（v1 代币经济遗留 UI 字段）→ 映射为 0，
 *     排序降级为稳定排序（id 序），符合"浏览 UI 不含治理字段"的论文核心发现
 *   - 网络标识统一 ChainMaker chain1（去 Polygon Amoy 化，28-03）
 */

import { getApiBase as resolveApiBase } from './apiConfig.js'

/** 带超时的统一请求器；非 2xx 抛 Error（消息取后端 i18n error 字段） */
async function request(path, { timeoutMs = 20000 } = {}) {
  const API_BASE = await resolveApiBase()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal })
    if (!res.ok) {
      let message = `HTTP ${res.status}`
      try {
        const body = await res.json()
        if (body && body.error) message = body.error
      } catch (_) { /* 保持 HTTP 状态码消息 */ }
      throw new Error(message)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// ── UI 映射（纯函数）──

/** 等级阈值（与 UserProfile 等级体系一致）：观察者/贡献者/信用者/守护者/长老 */
export function deriveLevel(reputation) {
  const rep = Number(reputation) || 0
  if (rep >= 5000) return 5
  if (rep >= 2000) return 4
  if (rep >= 500) return 3
  if (rep >= 100) return 2
  return 1
}

/** 后端技能行 → 技能卡 UI 形状（demo 数据同构：id/name/owner/verified/riskLevel/likes/reputation） */
export function mapSkillToUI(skill) {
  return {
    id: skill.skillId,
    name: skill.name || `skill-${skill.skillId}`,
    description: skill.description || '',
    trigger: skill.trigger || '',
    owner: skill.owner || 'unknown',
    verified: Boolean(skill.verified),
    riskLevel: skill.riskLevel == null ? 0 : Number(skill.riskLevel),
    version: skill.version || '1.0.0',
    fingerprint: skill.fingerprint || null,
    txId: skill.txId || null,
    createdAt: skill.createdAt || null,
    likes: 0,      // chain1 无点赞数据（v1 概念，链上不存在）
    reputation: 0, // 按宪法与论文核心发现：浏览卡片不携带治理字段
    fromChain: true
  }
}

/** 排行榜条目 → UI 形状（demo 同构：address/reputation/level/skillsCreated/totalLikes/flagged） */
export function mapLeaderboardEntry(entry) {
  const effective = entry.effectiveReputation ?? entry.reputation ?? 0
  return {
    address: entry.address,
    reputation: effective,
    rawReputation: entry.reputation ?? 0,
    level: deriveLevel(effective),
    skillsCreated: entry.skillsOwned ?? 0,
    totalLikes: 0, // chain1 无点赞数据
    flagged: 0,    // 链上无违规计数字段（v1 概念）
    rank: entry.rank,
    fromChain: true
  }
}

/** /api/reputation 响应 → 档案页形状（对齐原 getReputation/getStakes/getEffective/getLocked 四合一） */
export function mapReputationToProfile(rep) {
  return {
    address: rep.address,
    reputation: rep.reputation ?? 0,
    effective: rep.effectiveReputation ?? 0,
    locked: {
      lockedAmount: rep.locked ?? 0,
      lastClaimTime: rep.lockLastClaimTime ?? 0
    },
    recoverable: rep.recoverable ?? 0,
    recoverableLastClaimTime: rep.recoverableLastClaimTime ?? 0,
    hasStaked: Boolean(rep.hasStaked),
    originalSlashAmount: rep.originalSlashAmount ?? 0,
    stakes: [], // chain1 当前无在押质押列表查询；锁定量见 locked
    fromChain: true
  }
}

// ── 读 API ──

/** 技能列表（分页）；返回 { skills, total, page, pageSize }，skills 已映射 UI 形状 */
export async function fetchSkills({ page = 1, pageSize = 20 } = {}) {
  const data = await request(`/api/skills?page=${page}&pageSize=${pageSize}`)
  return {
    skills: (data.skills || []).map(mapSkillToUI),
    total: data.total || 0,
    page: data.page || page,
    pageSize: data.pageSize || pageSize
  }
}

/** 单个技能详情（UI 形状） */
export async function fetchSkillById(skillId) {
  const data = await request(`/api/skills/${encodeURIComponent(skillId)}`)
  return mapSkillToUI(data)
}

/** 用户声誉全景（一次调用替代原 4 个合约查询） */
export async function fetchReputation(address) {
  const data = await request(`/api/reputation/${encodeURIComponent(address)}`)
  return mapReputationToProfile(data)
}

/** 声誉排行榜；返回 { users, totalAddresses, coverageNote } */
export async function fetchLeaderboard(limit = 10) {
  const data = await request(`/api/leaderboard?limit=${limit}`)
  return {
    users: (data.leaderboard || []).map(mapLeaderboardEntry),
    totalAddresses: data.totalAddresses || 0,
    coverageNote: data.coverageNote || ''
  }
}

/** 协议统计（含 chain1 六合约 v2 地址表，供协议演示页展示） */
export async function fetchStats() {
  return request('/api/stats')
}

/** 后端健康检查（网络连通性判定） */
export async function healthCheck() {
  return request('/api/health', { timeoutMs: 8000 })
}

// ── 网络标识（去 Amoy 化统一出口）──

/** 网络配置：唯一真链 ChainMaker chain1，经后端网关访问 */
export function getNetworkConfig() {
  return {
    chainId: 'chain1',
    name: 'ChainMaker chain1',
    type: 'chainmaker',
    access: 'backend-gateway'
  }
}

/** API 基址（调试用，异步解析） */
export function getApiBase() {
  return resolveApiBase()
}

// 聚合默认导出（页面侧统一 ChainDataService.xxx() 调用风格）
export default {
  fetchSkills,
  fetchSkillById,
  fetchReputation,
  fetchLeaderboard,
  fetchStats,
  healthCheck,
  getNetworkConfig,
  getApiBase,
  deriveLevel,
  mapSkillToUI,
  mapLeaderboardEntry,
  mapReputationToProfile
}
