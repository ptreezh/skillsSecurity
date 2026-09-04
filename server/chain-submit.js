/**
 * Chain submission - submit approved skill to SkillRegistry on Polygon Amoy
 *
 * 环境变量：
 *   POLYGON_AMOY_RPC    - Polygon Amoy RPC 端点（默认使用官方节点）
 *   PRIVATE_KEY         - 提交者钱包私钥（0x 开头）
 *   SKILL_REGISTRY_ADDRESS - SkillRegistry 合约地址
 *
 * 安全提示：
 *   该私钥用于后端代用户支付 Gas 并提交技能注册交易。
 *   生产环境请使用专用低权限钱包，并通过 KMS/密钥管理服务保管。
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { ethers } = require('ethers');
const { getJob } = require('./jobs');
const { t } = require('./i18n');

const SkillRegistryAbi = require('../src/abi/SkillRegistry.json').abi;

const RISK_LEVEL_MAP = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3
};

function isConfigured() {
  return !!(
    process.env.PRIVATE_KEY &&
    process.env.SKILL_REGISTRY_ADDRESS &&
    process.env.SKILL_REGISTRY_ADDRESS.startsWith('0x')
  );
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

  // 用文件内容哈希作为 metadataIPFS 占位符；接入真实 IPFS 后可替换为 CID
  const metadataIPFS = skillData.freeskill?.ipfsHash ||
    '0x' + ethers.keccak256(ethers.toUtf8Bytes(content)).slice(2, 42);

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
 * 真实链上提交
 */
async function submitToChainReal(job, locale = 'zh-CN') {
  const rpcUrl = process.env.POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology';
  const privateKey = process.env.PRIVATE_KEY;
  const skillRegistryAddress = process.env.SKILL_REGISTRY_ADDRESS;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const balance = await provider.getBalance(wallet.address);
  if (balance < ethers.parseEther('0.001')) {
    throw new Error(t(locale, 'chain.balanceTooLow', { balance: ethers.formatEther(balance) }));
  }

  const skillRegistry = new ethers.Contract(skillRegistryAddress, SkillRegistryAbi, wallet);

  const skill = parseSkillFromJob(job, locale);
  console.log(`[Chain] Submitting skill: ${skill.name} (risk=${skill.riskLevel})`);

  const tx = await skillRegistry.registerSkill(
    skill.name,
    skill.description,
    skill.trigger,
    skill.metadataIPFS,
    skill.riskLevel,
    skill.version
  );

  console.log(`[Chain] Transaction submitted: ${tx.hash}`);
  const receipt = await tx.wait();

  // 从事件中解析 skillId
  let skillId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = skillRegistry.interface.parseLog(log);
      if (parsed && parsed.name === 'SkillRegistered') {
        skillId = parsed.args.skillId.toString();
      }
    } catch {
      // 忽略无法解析的日志
    }
  }

  if (!skillId) {
    // 若事件解析失败，使用 nextSkillId - 1 作为备选
    const nextId = await skillRegistry.nextSkillId();
    skillId = (Number(nextId) - 1).toString();
  }

  return {
    skillId,
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    submitter: wallet.address
  };
}

/**
 * Mock 提交（未配置真实链时降级使用）
 */
async function submitToChainMock(job, locale = 'zh-CN') {
  console.log(`[Chain] Mock submit for job ${job?.id}`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    skillId: `skill_${Date.now()}`,
    txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    mock: true
  };
}

/**
 * 提交已审核通过的技能到链上
 */
async function submitToChain(job, locale = 'zh-CN') {
  if (!isConfigured()) {
    console.warn(t(locale, 'chain.notConfigured'));
    console.warn(t(locale, 'chain.configHint'));
    return submitToChainMock(job, locale);
  }

  return submitToChainReal(job, locale);
}

async function getTransactionReceipt(txHash) {
  if (!isConfigured()) {
    return {
      txHash,
      blockNumber: 12345678,
      status: 'confirmed',
      gasUsed: 200000
    };
  }

  const rpcUrl = process.env.POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return null;

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status === 1 ? 'confirmed' : 'failed',
    gasUsed: Number(receipt.gasUsed)
  };
}

async function getSkillFromChain(skillId) {
  if (!isConfigured()) {
    return {
      skillId,
      owner: '0x0000000000000000000000000000000000000000',
      name: 'Unknown',
      verified: false,
      fingerprint: '0x0'
    };
  }

  const rpcUrl = process.env.POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const skillRegistryAddress = process.env.SKILL_REGISTRY_ADDRESS;
  const skillRegistry = new ethers.Contract(skillRegistryAddress, SkillRegistryAbi, provider);

  const skill = await skillRegistry.skills(skillId);
  return {
    skillId,
    owner: skill[0],
    name: skill[1],
    description: skill[2],
    trigger: skill[3],
    metadataIPFS: skill[4],
    riskLevel: Number(skill[5]),
    stakeAmount: skill[6].toString(),
    verified: skill[7],
    createdAt: Number(skill[8]),
    updatedAt: Number(skill[9]),
    version: skill[10],
    fingerprint: skill[11]
  };
}

module.exports = {
  submitToChain,
  getTransactionReceipt,
  getSkillFromChain
};
