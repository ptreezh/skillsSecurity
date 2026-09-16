/**
 * chainmaker-client.js — 长安链 cmc CLI 子进程网关
 *
 * 唯一职责：把「对 chain1 上 6 个 v2 合约的读写」经由 cmc 命令行工具（容器内）
 * 封装为可被 Node 服务同步调用的 Promise API。
 *
 * 背景（为什么需要本网关）：
 *   ChainMaker 没有官方 Node SDK / JSON-RPC，官方交互通道是 cmc CLI。
 *   本网关使用与 scripts/deploy-core-v2.js Step3 完全一致的命令语法
 *   （该语法已被 test/e2e/v2-wiring.test.mjs 13/13 实测通过）。
 *
 * cmc 参数编码约束（本网关实测确认）：
 *   - --params 必须是「类型标注 JSON 数组」：如 [{"string":"x"},{"uint8":0},{"address":"0x..."}]
 *   - 裸值数组 [0, "x"] 会报 "cannot unmarshal X into util.Param" —— 必须给类型名
 *   - --contract-address 不带 0x；--params 内的 address 值保留 0x
 *   - get（查询）输出 JSON：{"contract_result":{"result":"..."},"message":"SUCCESS","tx_id":"..."}
 *   - invoke（写）需加 --sync-result=true 等待出块
 *   - --result-to-string 使 result 变成可读字符串
 *
 * 环境变量（全部可选，有安全默认值）：
 *   CHAINMAKER_CMC_CMD    cmc 命令前缀，默认 "docker exec cmc-debug cmc"
 *   CHAINMAKER_ABI_DIR    ABI 目录（容器内），默认 /work
 *   CHAINMAKER_SDK_CONF   SDK 配置（容器内），默认 /work/sdk_config.yml
 *   CHAINMAKER_CERT_DIR   证书目录（容器内），默认 /work
 *   CHAINMAKER_CHAIN_ID   链 ID，默认 chain1
 *   CHAINMAKER_ORG_ID     组织 ID，默认 wx-org.chainmaker.org
 */

'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

// ── 合约注册表（链上真实地址，来自 deployments.json，已 13/13 验证）──
// 地址统一去 0x 存储（cmc 的 --contract-address 不接受 0x 前缀）
const CONTRACTS = {
  AS_Staking: {
    chainName: 'AS_Staking',
    abiFile: 'StakingManager.abi',
    address: '95f2f001a4f65e8652bbdae34487ed9596fe19e7', // blk 38
  },
  AS_SkillRegistry: {
    chainName: 'AS_SkillRegistry',
    abiFile: 'SkillRegistry.abi',
    address: 'cf089d4bebcdabd13cd6a27ba6c168acac6bc042', // blk 39
  },
  AS_Attribution: {
    chainName: 'AS_Attribution',
    abiFile: 'Attribution.abi',
    address: '9e49c41b5ca66afb3088445a182601133b3e6987', // blk 40
  },
  DaoGovernance: {
    chainName: 'DaoGovernance',
    abiFile: 'Governance.abi',
    address: '106d3686d2492ce75d1e4a01e799d22e7d2c9e74', // blk 41
  },
  AgentEcosystem: {
    chainName: 'AgentEcosystem',
    abiFile: 'SelfSustainingEcosystem.abi',
    address: '17f57b0722260ae6a3cabd33e0e9f5300c189f13', // blk 42
  },
  ReputationBadges: {
    chainName: 'ReputationBadges',
    abiFile: 'ReputationBadges.abi',
    address: '5b0627af6bc4da42f460289d3b535700e0d3af75', // blk 28
  },
};

// ── cmc 环境（可被 CHAINMAKER_* 覆盖，默认匹配 verify_v2_wiring.sh）──
function env(key, fallback) {
  return process.env[key] || fallback;
}

// 容器命令前缀（不带 cmc）；宿主机直连 cmc 时可为 ''，并配合 CHAINMAKER_ABI_LOCAL_DIR
const CONTAINER_CMD = env('CHAINMAKER_CONTAINER_CMD', 'docker exec cmc-debug');
const CMC_CMD = env('CHAINMAKER_CMC_CMD', `${CONTAINER_CMD} cmc`);
const ABI_DIR = env('CHAINMAKER_ABI_DIR', '/work');
// 宿主机本地的 ABI 目录（可选；设置后跳过容器内 cat，直接读本地文件）
const ABI_LOCAL_DIR = env('CHAINMAKER_ABI_LOCAL_DIR', '');
const SDK_CONF = env('CHAINMAKER_SDK_CONF', '/work/sdk_config.yml');
const CERT_DIR = env('CHAINMAKER_CERT_DIR', '/work');
const CHAIN_ID = env('CHAINMAKER_CHAIN_ID', 'chain1');
const ORG_ID = env('CHAINMAKER_ORG_ID', 'wx-org.chainmaker.org');

// cmc 认证/网络标志（与 wires/verify 脚本逐一对应，勿增删）
const SDK_FLAGS = [
  `--sdk-conf-path=${SDK_CONF}`,
  `--chain-id=${CHAIN_ID}`,
  `--org-id=${ORG_ID}`,
  `--user-tlscrt-file-path=${CERT_DIR}/admin1.tls.crt`,
  `--user-tlskey-file-path=${CERT_DIR}/admin1.tls.key`,
  `--user-signcrt-file-path=${CERT_DIR}/admin1.sign.crt`,
  `--user-signkey-file-path=${CERT_DIR}/admin1.sign.key`,
];

/**
 * 将 cmc 命令模板字符串拆为 argv。
 * 支持 "docker exec cmc-debug cmc" 与 "cmc"（宿主机直连）两种形态。
 */
function cmcArgv(operation, args) {
  // eslint-disable-next-line no-control-regex
  const base = CMC_CMD.trim().split(/\s+/);
  return [...base, 'client', 'contract', 'user', operation, ...args];
}

/** 类型标注 JSON 数组 → cmc --params 字符串 */
function encodeParams(typedParams) {
  return JSON.stringify(typedParams);
}

/** 从 ABI 中查找方法的 inputs / outputs 类型 */
function findAbiMethod(abi, methodName) {
  const fn = (abi || []).find(
    (x) => x.type === 'function' && x.name === methodName
  );
  if (!fn) {
    throw new Error(`ABI method not found: ${methodName}`);
  }
  return fn;
}

/**
 * 把调用方的「裸值数组」按 ABI 参数类型包装为类型标注 JSON 数组。
 * 例如 params=[name, desc, trigger, ipfs, 0, '1.0.0'] → [{"string":...},{"uint8":0},...]
 */
function toTypedParams(methodAbi, params) {
  const inputs = methodAbi.inputs || [];
  if (params.length !== inputs.length) {
    throw new Error(
      `参数个数不匹配: ${methodAbi.name} 需要 ${inputs.length} 个, 实际 ${params.length} 个`
    );
  }
  return inputs.map((input, i) => {
    const type = input.type;
    const value = params[i];
    if (type === 'address') {
      // address 值必须是 "0x..."；cmc 要求带 0x
      return { address: String(value) };
    }
    if (/^u?int\d*$/.test(type)) {
      // uintN / intN：大数用字符串，安全整数用数字（cmc 两种都接受数字/字符串）
      const n = typeof value === 'string' ? value : String(value);
      if (/^\d+$/.test(n) && BigInt(n) <= BigInt(Number.MAX_SAFE_INTEGER)) {
        return { [type]: Number(n) };
      }
      return { [type]: n };
    }
    if (type === 'bool') {
      return { bool: Boolean(value) };
    }
    if (type === 'bytes32' || type === 'bytes') {
      return { [type]: String(value) };
    }
    // string 及一切其余类型按字符串处理
    return { [type]: String(value) };
  });
}

/**
 * 解码 cmc --result-to-string 输出的 result 字段。
 * 支持：单值 bool / uint / address；失败返回原始字符串（不强解）。
 */
function decodeResult(raw, outputs) {
  const s = String(raw).trim();
  if (outputs.length === 0) return null;

  // bool: "[true]" / "[false]"
  if (/^\[(true|false)\]$/.test(s)) {
    return s === '[true]';
  }
  // uint: "[42]"
  if (/^\[\d+\]$/.test(s)) {
    const big = BigInt(s.slice(1, -1));
    return big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big.toString();
  }
  // address: "[[16 109 54 ...20 字节]]"
  const addrMatch = s.match(/^\[\[([0-9 ]+)\]\]$/);
  if (addrMatch) {
    const bytes = addrMatch[1]
      .trim()
      .split(/\s+/)
      .map((v) => parseInt(v, 10));
    if (bytes.length === 20) {
      return (
        '0x' + bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
      );
    }
    // 非 20 字节的裸数组 → 返回原始串，由上层处理
    return s;
  }
  // 其余（多值/struct 等）→ 返回原始字符串
  return s;
}

/**
 * 解码 Solidity revert reason 的 ABI 编码（ChainMaker EVM 合约，标准 Error(string)）。
 * 格式：0x08c379a0 + offset(32B) + length(32B) + utf8 data
 * 实测链上错误示例：
 *   08c379a0 ... 0000...0020 0000...0032 496e73756666696369656e74206566666563746976652072657075746174696f6e...
 *   → "Insufficient effective reputation for MEDIUM skill"
 * 解码失败返回 null（非 Error(string) 形式，交由调用方原样处理）。
 * 兼容两种形态：
 *   1) 纯 hex："0x08c379a0..." 或 "08c379a0..."
 *   2) 带前缀文字："failed to execute evm contract, error reverted : 0x08c379a0..."
 *      （cmc 的 contract_result.message 实测为后者，先提取 08c379a0 起始的 hex 尾串）
 */
function decodeRevertReason(raw) {
  if (typeof raw !== 'string') return null;
  // 提取 08c379a0 起始的 hex 片段（含 0x 前缀或裸 hex，最长取到非 hex 字符为止）
  const m = raw.match(/(?:0x)?08c379a0[0-9a-fA-F]*/);
  if (!m) return null;
  let hex = m[0];
  if (hex.toLowerCase().startsWith('0x')) hex = hex.slice(2);
  // selector: Error(string) = 0x08c379a0；panic(0x4e487b71) 等暂不解码
  if (!/^08c379a0/i.test(hex)) return null;
  let bytes;
  try {
    bytes = Buffer.from(hex, 'hex');
  } catch (e) {
    return null;
  }
  // 最少需要 selector + offset + length + 1 字节数据
  if (bytes.length < 4 + 32 + 32 + 1) return null;
  // offset 字（大端）位于 selector 之后；data 区起点 = 4 + offset
  const offset = bytes.readUInt32BE(4 + 28);
  const dataStart = 4 + offset;
  if (dataStart + 32 > bytes.length) return null;
  const len = bytes.readUInt32BE(dataStart + 28);
  if (dataStart + 32 + len > bytes.length) return null;
  const text = bytes.slice(dataStart + 32, dataStart + 32 + len).toString('utf8');
  // 有效性检查：可解码为可打印文本才采用（防乱码）
  return /^[\x20-\x7e]+$/.test(text) ? text : null;
}

/**
 * 执行一次 cmc 调用并解析标准输出为 JSON。
 * @param {string} operation 'get' | 'invoke'
 */
async function runCmc(operation, contractKey, method, typedParams, opts = {}) {
  const contract = CONTRACTS[contractKey];
  if (!contract) {
    throw new Error(`未注册的合约 key: ${contractKey}`);
  }

  const abiPath = `${ABI_DIR}/${contract.abiFile}`;
  const args = [
    operation,
    `--contract-name=${contract.chainName}`,
    `--contract-address=${contract.address}`,
    `--method=${method}`,
    `--abi-file-path=${abiPath}`,
    ...SDK_FLAGS,
    '--result-to-string',
    ...(operation === 'invoke' ? ['--sync-result=true'] : []),
    `--params=${encodeParams(typedParams)}`,
  ];

  let stdout = '';
  let stderr = '';
  try {
    const res = await execFileAsync(cmcArgv(operation, args)[0], cmcArgv(operation, args).slice(1), {
      timeout: opts.timeout || 60000,
      maxBuffer: 10 * 1024 * 1024,
      // windowsHide: true,
    });
    stdout = String(res.stdout || '');
    stderr = String(res.stderr || '');
  } catch (err) {
    // execFile 失败：读取已捕获的 stderr（cmc 的错误 JSON 往往走 stdout）
    const detail = (err.stdout || '') + (err.stderr || stderr || '');
    throw new Error(`cmc ${operation} ${method} 执行失败: ${detail || err.message}`);
  }

  // cmc 把结果打印到 stdout，偶有日志混入；提取第一个 JSON 对象
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error(`cmc 输出不是 JSON: ${stdout.slice(0, 500)}`);
  }
  const parsed = JSON.parse(stdout.slice(start, end + 1));
  // 失败统一以顶层 code=4 标记（get/invoke 一致）；成功时 invoke 无 message 字段，
  // get 有 message:"SUCCESS"。勿以 message 字段作为成功判据。
  if (parsed.code === 4 || (parsed.code !== undefined && parsed.code !== 0)) {
    const rawMsg =
      parsed.contract_result && parsed.contract_result.message
        ? parsed.contract_result.message
        : parsed.message || '';
    // revert reason 优先解码成人可读文本（Solidity Error(string) ABI 编码）
    const reason = decodeRevertReason(rawMsg);
    const detail =
      (parsed.message || '') +
      (parsed.contract_result && parsed.contract_result.message
        ? ` | ${reason || parsed.contract_result.message}`
        : '');
    throw new Error(`cmc ${operation} ${method} 链上错误: ${detail || '未知错误'}`);
  }
  return parsed;
}

/**
 * 读取容器内 ABI 并缓存（进程内，LRU 按需加载）。
 */
const abiCache = new Map();

async function loadAbi(contractKey) {
  if (abiCache.has(contractKey)) return abiCache.get(contractKey);
  const contract = CONTRACTS[contractKey];
  if (!contract) {
    throw new Error(`未注册的合约 key: ${contractKey}`);
  }
  const abiPath = `${ABI_DIR}/${contract.abiFile}`;
  let raw = '';
  if (ABI_LOCAL_DIR) {
    // 宿主机本地 ABI（开发/调试直连场景）
    raw = await import('fs').then(fs => fs.promises.readFile(
      `${ABI_LOCAL_DIR}/${contract.abiFile}`,
      'utf-8'
    ));
  } else {
    // 容器内读取：docker exec cmc-debug cat /work/xxx.abi
    const argv = [...CONTAINER_CMD.trim().split(/\s+/), 'cat', abiPath];
    try {
      const res = await execFileAsync(argv[0], argv.slice(1), {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      });
      raw = String(res.stdout || '');
    } catch (err) {
      throw new Error(`读取 ABI ${abiPath} 失败: ${(err.stderr || err.message).slice(0, 500)}`);
    }
  }
  const abi = JSON.parse(raw);
  abiCache.set(contractKey, abi);
  return abi;
}

/**
 * 查询（只读）：cmc client contract user get
 * @param {string} contractKey CONTRACTS 的 key（如 'AS_SkillRegistry'）
 * @param {string} method 方法名
 * @param {Array} params 裸值数组（按 ABI 参数顺序）
 * @param {Object} opts { timeout }
 * @returns {Promise<{code, result, raw, txId}>}
 */
async function get(contractKey, method, params = [], opts = {}) {
  const abi = await loadAbi(contractKey);
  const methodAbi = findAbiMethod(abi, method);
  const typed = toTypedParams(methodAbi, params);
  const parsed = await runCmc('get', contractKey, method, typed, opts);
  const raw = parsed.contract_result && parsed.contract_result.result;
  const result = decodeResult(raw, methodAbi.outputs || []);
  return {
    result,
    raw,
    txId: parsed.tx_id,
    gasUsed: parsed.contract_result && parsed.contract_result.gas_used,
  };
}

/**
 * 写事务：cmc client contract user invoke（带 --sync-result=true）
 * @returns {Promise<{code, result, raw, txId}>}
 */
async function invoke(contractKey, method, params = [], opts = {}) {
  const abi = await loadAbi(contractKey);
  const methodAbi = findAbiMethod(abi, method);
  const typed = toTypedParams(methodAbi, params);
  const parsed = await runCmc('invoke', contractKey, method, typed, opts);
  const raw = parsed.contract_result && parsed.contract_result.result;
  const result = decodeResult(raw, methodAbi.outputs || []);
  return {
    result,
    raw,
    txId: parsed.tx_id,
    blockHeight: parsed.tx_block_height,
    gasUsed: parsed.contract_result && parsed.contract_result.gas_used,
    // 链上事件（ABI 编码的 event_data 数组），用于解析 SkillRegistered 等
    events: (parsed.contract_result && parsed.contract_result.contract_event) || null,
  };
}

/**
 * 链可达性探测（/api/health 使用）。
 * 用一次最轻量的查询（nextSkillId）确认 cmc + 容器 + 链三者在位。
 */
async function health() {
  const out = await get('AS_SkillRegistry', 'nextSkillId', []);
  return {
    chainId: CHAIN_ID,
    orgId: ORG_ID,
    status: 'ok',
    skillCount: out.result,
    txId: out.txId,
  };
}

/**
 * 按 txId 查询链上交易回执（public query，无需 TLS 证书）。
 * 返回：{ blockHeight, blockTimestamp, payloadMethod, contractName, events, gasUsed, result }
 */
async function queryTx(txId) {
  const argv = [
    ...CONTAINER_CMD.trim().split(/\s+/),
    'cmc',
    'query',
    'tx',
    txId,
    '--sdk-conf-path=' + env('CHAINMAKER_SDK_CONF', '/work/sdk_config.yml'),
    '--chain-id=' + env('CHAINMAKER_CHAIN_ID', 'chain1'),
    '--with-rw-set=false',
  ];
  let res;
  try {
    res = await execFileAsync(argv[0], argv.slice(1), {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    throw new Error(`cmc query tx 失败: ${(err.stderr || err.message).slice(0, 500)}`);
  }
  const raw = String(res.stdout || '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const parsed = JSON.parse(raw.slice(start, end + 1));
  const txn = parsed.transaction || {};
  const cr = (txn.result && txn.result.contract_result) || {};
  return {
    blockHeight: parsed.block_height,
    blockTimestamp: parsed.block_timestamp,
    method: txn.payload && txn.payload.method,
    contractName: txn.payload && txn.payload.contract_name,
    events: cr.contract_event || null,
    gasUsed: cr.gas_used,
    result: cr.result,
  };
}

/**
 * 组合查询技能详情。
 * cmc 的 struct 输出（skills(id)）对含空格字符串字段无法可靠切分，
 * 因此只解析可靠锚点：
 *   - owner      头部 `[[bytes20]]`（数字数组格式稳定）
 *   - verified   独立查询 verifiedSkills(id)（bool，精确）
 *   - createdAt / updatedAt / fingerprint / version  尾部固定序列
 *   - 字符串字段（name/description/trigger/metadataIPFS）由调用方提交镜像
 *     （提交侧归档的真实参数）补齐，本函数负责链上存在性校验。
 * 返回 { exists, raw, owner, fingerprint, verified, createdAt, updatedAt, version }
 */
async function getSkill(skillId) {
  const s = await get('AS_SkillRegistry', 'skills', [skillId]);
  const raw = String(s.raw || '');
  const numsToHex = (numsText) => {
    const nums = String(numsText || '').trim().split(/\s+/).filter(Boolean).map(Number);
    return nums.length ? '0x' + Buffer.from(nums).toString('hex') : null;
  };
  // 头部：外层 [ 内层 [bytes20 数组]（20 个十进制字节，其后跟字符串区）
  const head = raw.match(/^\[\s*\[?\s*((?:\d+\s+){0,19}\d+)\s*\]/);
  // 尾部：`false <createdAt> <updatedAt> <version> [<32个fingerprint>] ]`
  const tail = raw.match(
    /(true|false)\s+(\d+)\s+(\d+)\s+(\S+)\s*\[\s*((?:\d+\s+){0,31}\d+)\s*\]\s*\]\s*$/
  );
  const v = await get('AS_SkillRegistry', 'verifiedSkills', [skillId]);
  return {
    exists: true, // skills(id) 不存在会 revert，能回包即存在
    raw,
    owner: head ? numsToHex(head[1]) : null,
    fingerprint: tail ? numsToHex(tail[5]) : null,
    verified: Boolean(v && v.result),
    createdAt: tail ? Number(tail[2]) : null,
    updatedAt: tail ? Number(tail[3]) : null,
    version: tail ? tail[4] : null,
  };
}

module.exports = {
  CONTRACTS,
  get,
  invoke,
  queryTx,
  getSkill,
  health,
  loadAbi,
  decodeRevertReason,
};