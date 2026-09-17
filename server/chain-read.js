/**
 * chain-read.js — 链上读聚合服务（Phase 27 / v2.0 端到端上线）
 *
 * 职责：把前端需要的「技能列表 / 技能详情 / 用户声誉 / 排行榜 / 协议统计」
 * 聚合为一次 REST 调用可返回的形状。所有链上数据经 chainmaker-client（cmc 网关）
 * 真实查询，零 mock；字符串字段由 chain-submit 的提交侧镜像补齐（见 chain-submit.js 头注）。
 *
 * 设计要点：
 *   - cmc 查询走 docker exec 子进程（单次 ~0.5-2s），因此：
 *       a) 详情按 skillId 做进程内 TTL 缓存（默认 30s，READ_CACHE_TTL_MS 可调）
 *       b) 列表/排行内部用 Promise.all 并行化
 *   - 排行榜：链上（AS_Staking）没有全局用户枚举，采用
 *     「全部技能 owner（链上 skills()）∪ 提交镜像 submitter」聚合后并行查声誉。
 *   - 依赖注入：__setDependenciesForTest() 供单元测试替换 get/getSkillFromChain/
 *     loadMirror（不触碰模块加载器）；生产路径用真实依赖。
 */

'use strict';

const TTL_MS = Number(process.env.READ_CACHE_TTL_MS || 30000);

// ── 依赖（生产实现；测试经 __setDependenciesForTest 覆盖）──
const deps = {
  get: null, // chainmaker-client.get(contractKey, method, params)
  getSkillFromChain: null, // chain-submit.getSkillFromChain(skillId)
  loadMirror: null, // chain-submit.loadMirror()
};
let depsReady = false;

function ensureDeps() {
  if (depsReady) return;
  const chainmaker = require('./chainmaker-client');
  const chainSubmit = require('./chain-submit');
  deps.get = chainmaker.get;
  deps.getSkillFromChain = chainSubmit.getSkillFromChain;
  deps.loadMirror = chainSubmit.loadMirror;
  depsReady = true;
}

/** 依赖注入入口（仅测试使用；会同时清空读缓存） */
function __setDependenciesForTest(overrides) {
  ensureDeps();
  if (overrides.get) deps.get = overrides.get;
  if (overrides.getSkillFromChain) deps.getSkillFromChain = overrides.getSkillFromChain;
  if (overrides.loadMirror) deps.loadMirror = overrides.loadMirror;
  clearReadCache();
}

// ── TTL 缓存 ──
const cache = new Map(); // key → { value, expiresAt }

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

/** 清空读缓存（测试与运维用） */
function clearReadCache() {
  cache.clear();
}

// ── 纯函数助手（直接单测）──

/**
 * 校验 EVM 地址：接受 0x 前缀 40 hex 或裸 40 hex；统一返回带 0x 的小写形式。
 * 非法输入返回 null。
 */
function validateAddress(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  const m = s.match(/^(?:0[xX])?([0-9a-fA-F]{40})$/);
  return m ? '0x' + m[1].toLowerCase() : null;
}

/** 解析正整数 id（技能 id 从 1 开始）；非法返回 null */
function parseIntId(input) {
  if (typeof input === 'number' && Number.isInteger(input) && input >= 1) return input;
  if (typeof input === 'string' && /^\d+$/.test(input.trim())) {
    const n = Number(input.trim());
    return n >= 1 ? n : null;
  }
  return null;
}

/**
 * 排行榜纯逻辑：按有效声誉降序、声誉降序、地址升序确定性排序并标 rank。
 * @param {Array<{address, effectiveReputation, reputation, skillsOwned}>} entries
 * @param {number} limit
 */
function buildLeaderboard(entries, limit = 10) {
  const sorted = [...entries].sort((a, b) => {
    const ea = Number(a.effectiveReputation) || 0;
    const eb = Number(b.effectiveReputation) || 0;
    if (eb !== ea) return eb - ea;
    const ra = Number(a.reputation) || 0;
    const rb = Number(b.reputation) || 0;
    if (rb !== ra) return rb - ra;
    return String(a.address).localeCompare(String(b.address));
  });
  return sorted.slice(0, limit).map((e, i) => ({ ...e, rank: i + 1 }));
}

// ── 读服务 ──

/** 技能总数 = nextSkillId - 1（id 从 1 开始编号） */
async function getSkillCount() {
  ensureDeps();
  const cached = cacheGet('skillCount');
  if (cached !== undefined) return cached;
  const res = await deps.get('AS_SkillRegistry', 'nextSkillId', []);
  const total = Math.max(0, Number(res.result) - 1);
  cacheSet('skillCount', total);
  return total;
}

/** 单个技能详情（带 TTL 缓存） */
async function getSkillCached(skillId) {
  ensureDeps();
  const key = `skill:${skillId}`;
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;
  const detail = await deps.getSkillFromChain(skillId);
  cacheSet(key, detail);
  return detail;
}

/**
 * 技能列表（分页）。
 * @returns {Promise<{total, page, pageSize, skills: Array}>}
 */
async function listSkills({ page = 1, pageSize = 20 } = {}) {
  ensureDeps();
  const p = Math.max(1, Math.floor(page) || 1);
  const size = Math.min(50, Math.max(1, Math.floor(pageSize) || 20));
  const total = await getSkillCount();
  if (total === 0) return { total, page: p, pageSize: size, skills: [] };

  const start = (p - 1) * size + 1; // id 从 1 开始
  const ids = [];
  for (let id = start; id < start + size && id <= total; id++) ids.push(id);
  const skills = await Promise.all(ids.map((id) => getSkillCached(id)));
  return { total, page: p, pageSize: size, skills };
}

/**
 * 单个技能详情；id 非法或越界（≥ nextSkillId）抛 404 错误（err.status=404）。
 */
async function getSkillById(idInput) {
  const id = parseIntId(idInput);
  if (!id) {
    throw Object.assign(new Error('skill.notFound'), { status: 404 });
  }
  const total = await getSkillCount();
  if (id > total) {
    throw Object.assign(new Error('skill.notFound'), { status: 404 });
  }
  return getSkillCached(id);
}

/**
 * 用户声誉全景（AS_Staking 六项并行查询）。
 * 声誉可为负（反噬机制），数值字段一律 Number（decode 已处理符号）。
 */
async function getReputation(addressInput) {
  ensureDeps();
  const address = validateAddress(addressInput);
  if (!address) {
    throw Object.assign(new Error('reputation.invalidAddress'), { status: 400 });
  }
  const [
    reputation,
    effectiveReputation,
    locks,
    recoverable,
    hasStaked,
    originalSlashAmount,
  ] = await Promise.all([
    deps.get('AS_Staking', 'userReputation', [address]),
    deps.get('AS_Staking', 'getUserReputation', [address]),
    deps.get('AS_Staking', 'reputationLocks', [address]), // → [locked, lastClaimTime]
    deps.get('AS_Staking', 'getRecoverableReputation', [address]), // → [recoverable, lastClaimTime]
    deps.get('AS_Staking', 'hasStaked', [address]),
    deps.get('AS_Staking', 'originalSlashAmount', [address]),
  ]);
  const lockPair = Array.isArray(locks.result) ? locks.result : [0, 0];
  const recPair = Array.isArray(recoverable.result)
    ? recoverable.result
    : [0, 0];
  return {
    address,
    reputation: Number(reputation.result) || 0,
    effectiveReputation: Number(effectiveReputation.result) || 0,
    locked: Number(lockPair[0]) || 0,
    lockLastClaimTime: Number(lockPair[1]) || 0,
    recoverable: Number(recPair[0]) || 0,
    recoverableLastClaimTime: Number(recPair[1]) || 0,
    hasStaked: Boolean(hasStaked.result),
    originalSlashAmount: Number(originalSlashAmount.result) || 0,
  };
}

/**
 * 声誉排行榜：技能 owner ∪ 镜像提交者 → 并行查声誉 → 排序。
 * 链上无全局用户注册表，排行覆盖技能参与地址（coverageNote 说明）。
 */
async function getLeaderboard({ limit = 10 } = {}) {
  ensureDeps();
  const n = Math.min(50, Math.max(1, Math.floor(limit) || 10));

  const cached = cacheGet('leaderboard:' + n);
  if (cached !== undefined) return cached;

  const total = await getSkillCount();
  const details = await Promise.all(
    Array.from({ length: total }, (_, i) => getSkillCached(i + 1))
  );

  // 地址 → 参与的技能 id 集合（链上 owner ∪ 镜像提交者，按 skillId 去重）
  // 注：同一地址既是某技能 owner 又是其提交者时只计一次，保证 skillsOwned ≤ skillCount
  const participation = new Map(); // addressLower → Set<skillId>
  const add = (addr, skillId) => {
    if (!addr) return;
    const key = String(addr).toLowerCase();
    if (!participation.has(key)) participation.set(key, new Set());
    const id = Number(skillId);
    if (Number.isInteger(id) && id > 0) participation.get(key).add(id);
  };
  details.forEach((d) => add(d.owner, d.skillId));

  // 镜像提交者并入（可能与 owner 重合，按 skillId 去重）
  const mirror = deps.loadMirror();
  Object.entries(mirror || {}).forEach(([k, m]) => add(m.submitter, m.skillId != null ? m.skillId : k));

  const addresses = [...participation.keys()];
  const reps = await Promise.all(
    addresses.map((addr) =>
      Promise.all([
        deps.get('AS_Staking', 'getUserReputation', [addr]),
        deps.get('AS_Staking', 'userReputation', [addr]),
      ]).then(([eff, raw]) => ({
        address: addr,
        effectiveReputation: Number(eff.result) || 0,
        reputation: Number(raw.result) || 0,
        skillsOwned: participation.get(addr).size,
      }))
    )
  );

  const result = {
    leaderboard: buildLeaderboard(reps, n),
    totalAddresses: addresses.length,
    coverageNote:
      '链上无全局用户注册表；排行覆盖技能参与地址（链上技能 owner 与提交镜像提交者）',
  };
  cacheSet('leaderboard:' + n, result);
  return result;
}

/** 协议级统计（全部单值查询，并行） */
async function getStats() {
  ensureDeps();
  const cached = cacheGet('stats');
  if (cached !== undefined) return cached;

  const [
    nextSkillId,
    stakerCount,
    totalReputation,
    totalEffectiveReputation,
    ecosystem,
    attributionContributions,
  ] = await Promise.all([
    deps.get('AS_SkillRegistry', 'nextSkillId', []),
    deps.get('AS_Staking', 'stakerCount', []),
    deps.get('AS_Staking', 'getTotalReputation', []),
    deps.get('AS_Staking', 'totalEffectiveReputation', []),
    Promise.all([
      deps.get('AgentEcosystem', 'totalUsers', []),
      deps.get('AgentEcosystem', 'activeRoles', []),
      deps.get('AgentEcosystem', 'totalContributions', []),
      deps.get('AgentEcosystem', 'totalRewardsDistributed', []),
    ]),
    deps.get('AS_Attribution', 'totalContributions', []),
  ]);

  const { CONTRACTS } = require('./chainmaker-client');
  const contracts = {};
  Object.entries(CONTRACTS).forEach(([name, c]) => {
    contracts[name] = '0x' + c.address;
  });

  const result = {
    chainId: process.env.CHAINMAKER_CHAIN_ID || 'chain1',
    skillCount: Math.max(0, Number(nextSkillId.result) - 1),
    stakerCount: Number(stakerCount.result) || 0,
    totalReputation: Number(totalReputation.result) || 0,
    totalEffectiveReputation: Number(totalEffectiveReputation.result) || 0,
    ecosystem: {
      totalUsers: Number(ecosystem[0].result) || 0,
      activeRoles: Number(ecosystem[1].result) || 0,
      totalContributions: Number(ecosystem[2].result) || 0,
      totalRewardsDistributed: Number(ecosystem[3].result) || 0,
    },
    attributionContributions: Number(attributionContributions.result) || 0,
    contracts,
  };
  cacheSet('stats', result);
  return result;
}

module.exports = {
  listSkills,
  getSkillById,
  getReputation,
  getLeaderboard,
  getStats,
  getSkillCount,
  // 纯函数（单测）与运维钩子
  validateAddress,
  parseIntId,
  buildLeaderboard,
  clearReadCache,
  __setDependenciesForTest,
};
