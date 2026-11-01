/**
 * skill-package.test.cjs — P3 技能包真实解包/校验测试（node --test）
 *
 * 覆盖：
 *   - .md 直读（UTF-8 / 非 UTF-8 / 无 frontmatter）
 *   - .zip 解包（根级 SKILL.md、子目录 SKILL.md、.skill.zip、无 SKILL.md）
 *   - 安全：zip-slip（../ 路径）、zip bomb（总量/单文件/数量上限）、坏 zip
 *   - 编码：zip 内 SKILL.md 非 UTF-8 拒绝
 *   - validateSkillData 必填字段
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');

const {
  extractSkillPackage,
  validateSkillData,
  SkillPackageError,
  setLimits,
} = require('../../server/skill-package');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-pkg-test-'));
const tmpFile = (name) => path.join(tmpDir, name);

const GOOD_FRONTMATTER = `---
name: test-skill
description: 测试技能描述
trigger: test trigger
version: "1.0.0"
---
# Test Skill

正文内容
`;

/** 构造 zip buffer */
function buildZip(entries) {
  const zip = new AdmZip();
  for (const [name, content] of entries) {
    zip.addFile(name, typeof content === 'string' ? Buffer.from(content, 'utf-8') : content);
  }
  return zip.toBuffer();
}

// ── .md 直读 ──────────────────────────────────────────────────────────

test('P3: .md 直读返回文本与 frontmatter', () => {
  const p = tmpFile('a.md');
  fs.writeFileSync(p, GOOD_FRONTMATTER, 'utf-8');
  const pkg = extractSkillPackage(p, 'a.md');
  assert.equal(pkg.source, 'md');
  assert.equal(pkg.skillData.name, 'test-skill');
  assert.ok(pkg.content.includes('# Test Skill'));
});

test('P3: .SKILL.md 直读', () => {
  const p = tmpFile('a.SKILL.md');
  fs.writeFileSync(p, GOOD_FRONTMATTER, 'utf-8');
  const pkg = extractSkillPackage(p, 'a.SKILL.md');
  assert.equal(pkg.source, 'md');
  assert.equal(pkg.skillData.description, '测试技能描述');
});

test('P3: .md 非 UTF-8（GBK 字节）→ ENCODING_INVALID 如实拒绝', () => {
  const p = tmpFile('gbk.md');
  // GBK 编码的「文件已上传」字节序列（非 UTF-8）
  fs.writeFileSync(p, Buffer.from([0xce, 0xc4, 0xbc, 0xfe]));
  assert.throws(
    () => extractSkillPackage(p, 'gbk.md'),
    (err) => err instanceof SkillPackageError && err.code === 'ENCODING_INVALID'
  );
});

test('P3: .md 无 frontmatter → FRONTMATTER_INVALID', () => {
  const p = tmpFile('nofm.md');
  fs.writeFileSync(p, '# No Frontmatter\nplain text', 'utf-8');
  assert.throws(
    () => extractSkillPackage(p, 'nofm.md'),
    (err) => err instanceof SkillPackageError && err.code === 'FRONTMATTER_INVALID'
  );
});

// ── .zip 解包 ─────────────────────────────────────────────────────────

test('P3: zip 根级 SKILL.md 解包成功', () => {
  const p = tmpFile('b.zip');
  fs.writeFileSync(p, buildZip([
    ['SKILL.md', GOOD_FRONTMATTER],
    ['assets/icon.svg', '<svg/>'],
  ]));
  const pkg = extractSkillPackage(p, 'b.zip');
  assert.equal(pkg.source, 'zip');
  assert.equal(pkg.skillFile, 'SKILL.md');
  assert.equal(pkg.skillData.name, 'test-skill');
  assert.equal(pkg.entryCount, 2);
});

test('P3: zip 子目录内 SKILL.md 定位成功', () => {
  const p = tmpFile('c.zip');
  fs.writeFileSync(p, buildZip([
    ['my-skill/SKILL.md', GOOD_FRONTMATTER],
    ['my-skill/README.md', 'readme'],
  ]));
  const pkg = extractSkillPackage(p, 'c.zip');
  assert.equal(pkg.skillFile, 'my-skill/SKILL.md');
  assert.equal(pkg.skillData.name, 'test-skill');
});

test('P3: .skill.zip 扩展名走 zip 解包', () => {
  const p = tmpFile('d.skill.zip');
  fs.writeFileSync(p, buildZip([['SKILL.md', GOOD_FRONTMATTER]]));
  const pkg = extractSkillPackage(p, 'd.skill.zip');
  assert.equal(pkg.source, 'zip');
  assert.equal(pkg.skillData.name, 'test-skill');
});

test('P3: zip 无 SKILL.md → NO_SKILL_MD', () => {
  const p = tmpFile('e.zip');
  fs.writeFileSync(p, buildZip([['README.md', 'no skill here']]));
  assert.throws(
    () => extractSkillPackage(p, 'e.zip'),
    (err) => err instanceof SkillPackageError && err.code === 'NO_SKILL_MD'
  );
});

test('P3: 坏 zip（非 zip 字节）→ ZIP_INVALID 如实拒绝', () => {
  const p = tmpFile('f.zip');
  fs.writeFileSync(p, Buffer.from('this is not a zip archive at all'));
  assert.throws(
    () => extractSkillPackage(p, 'f.zip'),
    (err) => err instanceof SkillPackageError && err.code === 'ZIP_INVALID'
  );
});

// ── 安全防御 ──────────────────────────────────────────────────────────

test('P3: zip-slip（../ 路径）→ ZIP_SLIP 拒绝', () => {
  const p = tmpFile('slip.zip');
  fs.writeFileSync(p, buildZip([['../evil.md', GOOD_FRONTMATTER]]));
  assert.throws(
    () => extractSkillPackage(p, 'slip.zip'),
    (err) => err instanceof SkillPackageError && err.code === 'ZIP_SLIP'
  );
});

test('P3: zip 内 SKILL.md 非 UTF-8 → ENCODING_INVALID', () => {
  const p = tmpFile('zipgbk.zip');
  // 用 GBK 字节作为 SKILL.md 内容
  const gbk = Buffer.concat([
    Buffer.from('---\nname: x\n---\n', 'utf-8'),
    Buffer.from([0xce, 0xc4, 0xbc, 0xfe]), // GBK「文件」
  ]);
  fs.writeFileSync(p, buildZip([['SKILL.md', gbk]]));
  assert.throws(
    () => extractSkillPackage(p, 'zipgbk.zip'),
    (err) => err instanceof SkillPackageError && err.code === 'ENCODING_INVALID'
  );
});

test('P3: zip bomb（总量超限）→ ZIP_BOMB', () => {
  setLimits({ maxTotalBytes: 32 });
  try {
    const p = tmpFile('bomb.zip');
    fs.writeFileSync(p, buildZip([
      ['SKILL.md', GOOD_FRONTMATTER],
      ['big.bin', Buffer.alloc(64, 1)],
    ]));
    assert.throws(
      () => extractSkillPackage(p, 'bomb.zip'),
      (err) => err instanceof SkillPackageError && err.code === 'ZIP_BOMB'
    );
  } finally {
    setLimits();
  }
});

test('P3: entry 数量超限 → ZIP_BOMB', () => {
  setLimits({ maxEntries: 2 });
  try {
    const p = tmpFile('many.zip');
    fs.writeFileSync(p, buildZip([
      ['SKILL.md', GOOD_FRONTMATTER],
      ['a.txt', '1'],
      ['b.txt', '2'],
    ]));
    assert.throws(
      () => extractSkillPackage(p, 'many.zip'),
      (err) => err instanceof SkillPackageError && err.code === 'ZIP_BOMB'
    );
  } finally {
    setLimits();
  }
});

// ── 结构化校验 ────────────────────────────────────────────────────────

test('P3: validateSkillData 缺 name/description → METADATA_MISSING', () => {
  assert.throws(
    () => validateSkillData({ name: 'x' }),
    (err) => err instanceof SkillPackageError && err.code === 'METADATA_MISSING'
  );
  assert.throws(
    () => validateSkillData({ description: 'x' }),
    (err) => err instanceof SkillPackageError && err.code === 'METADATA_MISSING'
  );
  assert.doesNotThrow(() => validateSkillData({ name: 'x', description: 'y' }));
});