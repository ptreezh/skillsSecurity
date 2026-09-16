/**
 * Chain submission - submit approved skill to AS_SkillRegistry on ChainMaker (chain1)
 *
 * 完全基于真实长安链 cmc 网关（server/chainmaker-client.js），无 mock / 无 ethers。
 *
 * 环境变量（见 chainmaker-client.js）：
 *   CHAINMAKER_CONTAINER_CMD - 容器命令前缀（默认 docker exec cmc-debug）
 *   CHAINMAKER_CMC_CMD       - cmc 完整命令（默认 <CONTAINER_CMD> cmc）
 *   CHAINMAKER_SDK_CONF      - sdk 配置路径（容器内，默认 /work/sdk_config.yml）
 *   CHAINMAKER_CERT_DIR      - 证书目录（容器内，默认 /work）
 *   CHAINMAKER_ABI_DIR       - ABI 目录（容器内，默认 /work）
 *   CHAINMAKER_ABI_LOCAL_DIR - 宿主机 ABI 目录（可选，跳过容器内 cat）
 *   CHAINMAKER_CHAIN_ID      - 链 ID（默认 chain1）
 *   CHAINMAKER_ORG_ID        - 组织 ID（默认 wx-org.chainmaker.org）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');
const chainmaker = require('./chainmaker-client');
const { getJob } = require('./jobs');
const { t } = require('./i18n');

const RISK_LEVEL_MAP = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3
};

// 提交侧技能镜像：skills(id) 的字符串字段（name/description/trigger/metadataIPFS）
// 无法从 cmc struct 输出中可靠切分（字段含空格），故提交成功后归档真实参数到
// server/data/skills-mirror.json；链上存在性与 verified 仍以真实查询为准。
const MIRROR_FILE = path.join(__dirname, 'data', 'skills-mirror.json');

function loadMirror() {
  try {
    if (fs.existsSync(MIRROR_FILE)) {
      return JSON.parse(fs.readFileSync(MIRROR_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Chain] 镜像读取失败（将重建）:', err.message);
  }
  return {};
}

function saveMirror(mirror) {
  fs.mkdirSync(path.dirname(MIRROR_FILE), { recursive: true });
  fs.writeFileSync(MIRROR_FILE, JSON.stringify(mirror, null, 2), 'utf-8');
}

function isConfigured() {
  // ChainMaker 网关始终可用（真实环境依赖）；无降级 mock。
  return true;
}

/**
 * 从上传的技能文件中解析注册所需字段
 */
function parseSkillFromJob(job, locale = 'zh-CN') {
  if (!job || !job.filePath || !fs.existsSync(job.filePath)) {
    throw new Error(t(locale, 'job.fileNotFound'));
  }

  const content = fs.readFileSync(job.filePath, 'utf-8');
  let skillData = {};

  try {
    const parts = content.split('---');
    if (parts.length >= 2) {
      const yamlContent = parts[1].split('---')[0];
      skillData = yaml.load(yamlContent) || {};
    }
  } catch (error) {
    console.warn('[Chain] YAML parse warning:', error.message);
  }

  const metadata = skillData.metadata || {};
  const riskLevelText = String(metadata.riskLevel || skillData.riskLevel || 'LOW').toUpperCase();
  const riskLevel = RISK_LEVEL_MAP[riskLevelText] ?? 0;

  // 文件内容哈希作为 metadataIPFS 内容指纹；接入真实 IPFS 后可替换为 CID
  const metadataIPFS =
    skillData.freeskill?.ipfsHash ||
    '0x' + crypto.createHash('sha256').update(content, 'utf-8').digest('hex').slice(0, 40);

  return {
    name: String(skillData.name || path.basename(job.originalName, path.extname(job.originalName))),
    description: String(skillData.description || ''),
    trigger: String(skillData.trigger || ''),
    metadataIPFS,
    riskLevel,
    version: String(metadata.version || '1.0.0')
  };
}

/**
 * 真实链上提交（ChainMaker invoke registerSkill）
 * 返回 { skillId, txId, blockHeight, submitter, events }
 * skillId 来自 registerSkill 的 uint256 返回值（精确，无需 nextSkillId-1）。
 */
async function submitToChain(job, locale = 'zh-CN') {
  if (!isConfigured()) {
    throw new Error(t(locale, 'chain.notConfigured'));
  }

  const skill = parseSkillFromJob(job, locale);
  console.log(`[Chain] Submitting skill: ${skill.name} (risk=${skill.riskLevel})`);

  const inv = await chainmaker.invoke(
    'AS_SkillRegistry',
    'registerSkill',
    [
      skill.name,
      skill.description,
      skill.trigger,
      skill.metadataIPFS,
      skill.riskLevel,
      skill.version
    ],
    { sync: true }
  );

  const skillId = Number(inv.result);

  // 从 SkillRegistered 事件中解析 submitter（event_data[0] = 32 字节地址）
  let submitter = null;
  const skillRegistered = (inv.events || []).find(
    e => e.topic === '51e29d85e5eeb0bb608bb025117296259dabb2c5105f2368988e6e19db57b17c'
  );
  if (skillRegistered && skillRegistered.event_data && skillRegistered.event_data[0]) {
    submitter = '0x' + skillRegistered.event_data[0].slice(24);
  }

  // 归档镜像（真实提交参数；字符串字段供 getSkillFromChain 读取）
  const mirror = loadMirror();
  mirror[skillId] = {
    skillId,
    name: skill.name,
    description: skill.description,
    trigger: skill.trigger,
    metadataIPFS: skill.metadataIPFS,
    riskLevel: skill.riskLevel,
    version: skill.version,
    txId: inv.txId,
    blockHeight: inv.blockHeight,
    submitter,
    submittedAt: new Date().toISOString()
  };
  saveMirror(mirror);

  console.log(`[Chain] Skill registered: id=${skillId} tx=${inv.txId} block=${inv.blockHeight}`);
  return {
    skillId,
    txId: inv.txId,
    txHash: inv.txId,
    blockHeight: inv.blockHeight,
    blockNumber: inv.blockHeight,
    submitter,
    events: inv.events
  };
}

/**
 * 按 txId 查询链上回执（cmc query tx）
 */
async function getTransactionReceipt(txId) {
  if (!txId) return null;
  const receipt = await chainmaker.queryTx(txId);
  return {
    txHash: txId,
    blockNumber: receipt.blockHeight,
    status: 'confirmed',
    gasUsed: receipt.gasUsed,
    method: receipt.method,
    events: receipt.events
  };
}

/**
 * 从链上读取技能详情
 * - 链上精确字段：owner / verified / createdAt / updatedAt / version / fingerprint
 * - 字符串字段：来自提交侧镜像（真实提交参数）
 * - raw：cmc 原始 struct 输出（供审计核对）
 */
async function getSkillFromChain(skillId) {
  const onChain = await chainmaker.getSkill(Number(skillId));
  const mirror = loadMirror();
  const local = mirror[skillId] || {};

  return {
    skillId: Number(skillId),
    owner: onChain.owner,
    name: local.name || null,
    description: local.description || null,
    trigger: local.trigger || null,
    metadataIPFS: local.metadataIPFS || null,
    riskLevel: local.riskLevel ?? null,
    version: onChain.version || local.version || null,
    verified: onChain.verified,
    createdAt: onChain.createdAt,
    updatedAt: onChain.updatedAt,
    fingerprint: onChain.fingerprint,
    txId: local.txId || null,
    raw: onChain.raw
  };
}

module.exports = {
  submitToChain,
  getTransactionReceipt,
  getSkillFromChain,
  parseSkillFromJob,
  loadMirror
};