/**
 * skill-package.js — 技能包真实解包与结构校验（P3）
 *
 * 目标（对齐 PLAN P3 上传真实核验，杜绝 F7「zip 二进制当文本审计」）：
 *   - `.md` / `.SKILL.md`：直读 UTF-8 文本
 *   - `.zip` / `.skill.zip`：真实解包 → 定位 SKILL.md → frontmatter 校验 → 提取文本
 *   - 失败一律如实拒绝并返回原因（坏包、zip-slip、zip bomb、无 frontmatter、非 UTF-8）
 *
 * 安全设计：
 *   - 防 zip-slip：绝不按 entry 路径写盘（只用 entry.getData() 读内存内容），
 *     并对 entryName 做规范化校验（`..` / 绝对路径 / 盘符一律拒绝），纵深防御。
 *   - 防 zip bomb：总解压字节 / 单文件字节 / entry 数量三重上限。
 *   - 编码：SKILL.md 必须为合法 UTF-8（fatal 解码），非 UTF-8 如实拒绝，
 *     不猜测、不转码、不伪造清理（对齐 F9「skill6 脏数据如实上报」纪律）。
 *
 * 零新增运行时依赖：复用 node_modules 已有 adm-zip（0.4.16）；
 * js-yaml 已在依赖中（与 audit-agent 共用同一解析逻辑）。
 */

const AdmZip = require('adm-zip');
const yaml = require('js-yaml');
const path = require('path');

// ── 资源上限（生产默认；测试可通过 setLimits() 收紧）──────────────────
const DEFAULT_LIMITS = {
  maxTotalBytes: 20 * 1024 * 1024, // zip 内所有文件解压后合计 ≤ 20MB
  maxSingleBytes: 10 * 1024 * 1024, // 单个文件解压后 ≤ 10MB
  maxEntries: 200, // entry 数量上限
  maxContentBytes: 2 * 1024 * 1024, // 提取出的 SKILL.md 文本 ≤ 2MB
};

let LIMITS = { ...DEFAULT_LIMITS };

/** 测试专用：覆盖资源上限 */
function setLimits(overrides) {
  if (overrides) LIMITS = { ...DEFAULT_LIMITS, ...overrides };
  else LIMITS = { ...DEFAULT_LIMITS };
  return LIMITS;
}

// ── 错误类型：带 code/原因的可如实上报错误 ─────────────────────────────

class SkillPackageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SkillPackageError';
    this.code = code;
  }
}

// ── frontmatter 解析（与 audit-agent.runAudit 同一逻辑）────────────────

/**
 * 解析 SKILL.md frontmatter（--- 包裹的 YAML 头）。
 * @returns {object} skillData
 * @throws SkillPackageError FRONTMATTER_INVALID
 */
function parseFrontmatter(content) {
  const parts = content.split('---');
  if (parts.length < 3) {
    throw new SkillPackageError(
      'FRONTMATTER_INVALID',
      'SKILL.md 缺少 frontmatter（须以 --- 包裹的 YAML 头）'
    );
  }
  const yamlContent = parts[1].split('---')[0];
  let skillData;
  try {
    skillData = yaml.load(yamlContent);
  } catch (err) {
    throw new SkillPackageError(
      'FRONTMATTER_INVALID',
      `frontmatter YAML 解析失败: ${err.message}`
    );
  }
  if (!skillData || typeof skillData !== 'object') {
    throw new SkillPackageError('FRONTMATTER_INVALID', 'frontmatter 必须为 YAML 映射对象');
  }
  return skillData;
}

// ── 文本提取与编码校验 ────────────────────────────────────────────────

/**
 * 严格 UTF-8 解码：非法序列（GBK 等）直接抛错，不替换字符、不猜测编码。
 */
function decodeUtf8Strict(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new SkillPackageError(
      'ENCODING_INVALID',
      'SKILL.md 内容不是合法 UTF-8（疑似 GBK 等其他编码），请转换后重新上传'
    );
  }
}

// ── zip 解包 ──────────────────────────────────────────────────────────

/** entryName 规范化安全校验：拒绝 zip-slip（..、绝对路径、盘符） */
function assertSafeEntryName(entryName) {
  if (
    entryName.includes('..') ||
    entryName.startsWith('/') ||
    entryName.startsWith('\\') ||
    /^[a-zA-Z]:/.test(entryName)
  ) {
    throw new SkillPackageError(
      'ZIP_SLIP',
      `zip 内含不安全路径 entry: ${JSON.stringify(entryName)}（拒绝解包）`
    );
  }
}

/**
 * 从 zip 定位 SKILL.md：
 *   优先级：根级 `SKILL.md` > 任意深度 `SKILL.md` > `*.SKILL.md`
 * @returns {{entry, entryName, dir}}
 */
function locateSkillMd(entries) {
  const names = entries.map((e) => e.entryName.replace(/\\/g, '/'));
  const isSkillMd = (n) => n.split('/').pop() === 'SKILL.md';
  const isDotSkillMd = (n) => n.split('/').pop().endsWith('.SKILL.md');

  // 1) 根级 SKILL.md（agentskills.io 规范包形如 <folder>/SKILL.md 或根 SKILL.md）
  const root = names.find((n) => n === 'SKILL.md');
  if (root !== undefined) return { raw: root, index: names.indexOf(root) };

  // 2) 任意深度 SKILL.md
  const any = names.find(isSkillMd);
  if (any !== undefined) return { raw: any, index: names.indexOf(any) };

  // 3) *.SKILL.md
  const dot = names.find(isDotSkillMd);
  if (dot !== undefined) return { raw: dot, index: names.indexOf(dot) };

  return null;
}

/**
 * 将上传文件路径解析为可审计的 SKILL.md 文本。
 * @param {string} filePath  multer 保存的实际文件路径
 * @param {string} originalName 用户原始文件名（决定 .md 直读 vs .zip 解包）
 * @returns {{ content: string, skillData: object, source: 'md'|'zip', skillFile: string, entryCount: number }}
 * @throws SkillPackageError 坏包/无 SKILL.md/frontmatter 非法/编码非法
 */
function extractSkillPackage(filePath, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const isZip = ext === '.zip';
  if (!isZip) {
    // 非 zip（.md / .SKILL.md）：直接读文本（multer fileFilter 已限制类型）
    const buf = require('fs').readFileSync(filePath);
    const content = decodeUtf8Strict(buf);
    const skillData = parseFrontmatter(content);
    return {
      content,
      skillData,
      source: 'md',
      skillFile: originalName,
      entryCount: 0,
    };
  }

  // ── zip 解包路径 ──
  let zip;
  try {
    zip = new AdmZip(filePath);
  } catch (err) {
    throw new SkillPackageError('ZIP_INVALID', `zip 解包失败: ${err.message}`);
  }

  const entries = zip.getEntries();

  // 数量上限
  if (entries.length > LIMITS.maxEntries) {
    throw new SkillPackageError(
      'ZIP_BOMB',
      `zip 内文件数 ${entries.length} 超过上限 ${LIMITS.maxEntries}`
    );
  }

  // 大小与路径安全校验（zip-slip / zip bomb）
  let totalBytes = 0;
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    assertSafeEntryName(entry.entryName);
    const size = entry.header.uncompressedSize || entry.getData().length;
    if (size > LIMITS.maxSingleBytes) {
      throw new SkillPackageError(
        'ZIP_BOMB',
        `zip 内文件 ${JSON.stringify(entry.entryName)} 解压后 ${size} 字节超过单文件上限 ${LIMITS.maxSingleBytes}`
      );
    }
    totalBytes += size;
  }
  if (totalBytes > LIMITS.maxTotalBytes) {
    throw new SkillPackageError(
      'ZIP_BOMB',
      `zip 解压后合计 ${totalBytes} 字节超过总上限 ${LIMITS.maxTotalBytes}`
    );
  }

  // 定位 SKILL.md
  const located = locateSkillMd(entries);
  if (!located) {
    throw new SkillPackageError(
      'NO_SKILL_MD',
      'zip 内未找到 SKILL.md（须包含名为 SKILL.md 或 *.SKILL.md 的技能定义文件）'
    );
  }
  const { raw, index } = located;
  assertSafeEntryName(raw);
  const entry = entries[index];
  const content = decodeUtf8Strict(entry.getData());

  // frontmatter 校验
  const skillData = parseFrontmatter(content);

  // 文本大小上限
  const contentBytes = Buffer.byteLength(content, 'utf-8');
  if (contentBytes > LIMITS.maxContentBytes) {
    throw new SkillPackageError(
      'ZIP_BOMB',
      `SKILL.md 文本 ${contentBytes} 字节超过上限 ${LIMITS.maxContentBytes}`
    );
  }

  return {
    content,
    skillData,
    source: 'zip',
    skillFile: raw,
    entryCount: entries.length,
  };
}

// ── 校验抽取结果（可复用：zip 解包后与 md 直读统一入口）────────────────

/**
 * 对已提取的 SKILL.md 文本做结构化校验（frontmatter 必填字段）。
 * @param {object} skillData parseFrontmatter 结果
 * @throws SkillPackageError METADATA_MISSING
 */
function validateSkillData(skillData) {
  const missing = [];
  if (!skillData.name || typeof skillData.name !== 'string') missing.push('name');
  if (!skillData.description || typeof skillData.description !== 'string') missing.push('description');
  if (missing.length > 0) {
    throw new SkillPackageError(
      'METADATA_MISSING',
      `SKILL.md frontmatter 缺少必填字段: ${missing.join(', ')}`
    );
  }
  return skillData;
}

module.exports = {
  SkillPackageError,
  extractSkillPackage,
  parseFrontmatter,
  validateSkillData,
  setLimits,
  DEFAULT_LIMITS,
};