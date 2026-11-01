'use strict';

/**
 * chain-read 单元测试（不依赖 cmc 容器 / 链上状态）
 *
 * 覆盖：validateAddress / parseIntId / buildLeaderboard 纯函数；
 *       以及经 __setDependenciesForTest 注入假依赖后的
 *       listSkills 分页与缓存命中、getSkillById 越界 404。
 *
 * 运行：
 *   node --test test/server/
 *   npm run test:unit
 */

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const chainRead = require('../../server/chain-read.js');

// ── 纯函数：validateAddress ──

test('validateAddress accepts 0x-prefixed lowercase/uppercase hex', () => {
  const addr = '0x3737f0d872f386f170c20e2ae73b81cfe6b7ecf3';
  assert.equal(chainRead.validateAddress(addr), addr);
  assert.equal(chainRead.validateAddress(addr.toUpperCase()), addr);
});

test('validateAddress accepts bare 40-hex and normalizes to 0x lowercase', () => {
  const bare = '3737f0d872f386f170c20e2ae73b81cfe6b7ecf3';
  assert.equal(chainRead.validateAddress(bare), '0x' + bare);
});

test('validateAddress rejects invalid inputs', () => {
  assert.equal(chainRead.validateAddress('0x123'), null); // 太短
  assert.equal(chainRead.validateAddress('0x' + 'z'.repeat(40)), null); // 非 hex
  assert.equal(chainRead.validateAddress('0x' + 'a'.repeat(39)), null); // 39 位
  assert.equal(chainRead.validateAddress(''), null);
  assert.equal(chainRead.validateAddress(null), null);
  assert.equal(chainRead.validateAddress(12345), null);
});

// ── 纯函数：parseIntId ──

test('parseIntId accepts positive integers and numeric strings', () => {
  assert.equal(chainRead.parseIntId(1), 1);
  assert.equal(chainRead.parseIntId('42'), 42);
  assert.equal(chainRead.parseIntId(' 7 '), 7);
});

test('parseIntId rejects zero / negative / decimal / garbage', () => {
  assert.equal(chainRead.parseIntId(0), null);
  assert.equal(chainRead.parseIntId(-3), null);
  assert.equal(chainRead.parseIntId(2.5), null);
  assert.equal(chainRead.parseIntId('abc'), null);
  assert.equal(chainRead.parseIntId('1.5'), null);
  assert.equal(chainRead.parseIntId(''), null);
  assert.equal(chainRead.parseIntId(null), null);
});

// ── 纯函数：buildLeaderboard ──

test('buildLeaderboard sorts by effectiveReputation desc, then reputation, then address', () => {
  const entries = [
    { address: '0xaaa', effectiveReputation: 10, reputation: 10, skillsOwned: 1 },
    { address: '0xbbb', effectiveReputation: 50, reputation: 60, skillsOwned: 2 },
    { address: '0xccc', effectiveReputation: 50, reputation: 70, skillsOwned: 1 },
    { address: '0xddd', effectiveReputation: -5, reputation: -5, skillsOwned: 1 },
  ];
  const board = chainRead.buildLeaderboard(entries, 10);
  assert.deepEqual(
    board.map((e) => e.address),
    ['0xccc', '0xbbb', '0xaaa', '0xddd']
  );
  assert.deepEqual(
    board.map((e) => e.rank),
    [1, 2, 3, 4]
  );
});

test('buildLeaderboard handles negative/missing values deterministically', () => {
  const entries = [
    { address: '0xb', effectiveReputation: undefined, reputation: 0 },
    { address: '0xa', effectiveReputation: -1, reputation: -1 },
  ];
  const board = chainRead.buildLeaderboard(entries, 10);
  // undefined → 0 > -1 → 0xb 在前
  assert.equal(board[0].address, '0xb');
  assert.equal(board[1].address, '0xa');
});

// ── DI 服务测试：listSkills 分页与缓存 ──

function makeFakeDeps() {
  const calls = { nextSkillId: 0, details: new Map() };
  return {
    calls,
    get: async (contractKey, method) => {
      if (method === 'nextSkillId') {
        calls.nextSkillId += 1;
        return { result: 6 }; // 5 个技能（id 1-5）
      }
      throw new Error('unexpected method: ' + method);
    },
    getSkillFromChain: async (id) => {
      const n = (calls.details.get(id) || 0) + 1;
      calls.details.set(id, n);
      return { skillId: id, name: 'skill-' + id, owner: '0x' + 'a'.repeat(40) };
    },
    loadMirror: () => ({}),
  };
}

beforeEach(() => {
  chainRead.__setDependenciesForTest(makeFakeDeps());
});

test('listSkills paginates ids 1..total and returns shape', async () => {
  const fake = makeFakeDeps();
  chainRead.__setDependenciesForTest(fake);
  const page1 = await chainRead.listSkills({ page: 1, pageSize: 3 });
  assert.equal(page1.total, 5);
  assert.equal(page1.skills.length, 3);
  assert.deepEqual(
    page1.skills.map((s) => s.skillId),
    [1, 2, 3]
  );
  const page2 = await chainRead.listSkills({ page: 2, pageSize: 3 });
  assert.deepEqual(
    page2.skills.map((s) => s.skillId),
    [4, 5]
  );
});

test('listSkills second call hits TTL cache (no duplicate chain reads)', async () => {
  const fake = makeFakeDeps();
  chainRead.__setDependenciesForTest(fake);
  await chainRead.listSkills({ page: 1, pageSize: 5 });
  await chainRead.listSkills({ page: 1, pageSize: 5 });
  assert.equal(fake.calls.nextSkillId, 1); // skillCount 被缓存
  for (let id = 1; id <= 5; id++) {
    assert.equal(fake.calls.details.get(id), 1, `skill ${id} 应只查一次`);
  }
});

test('getSkillById returns detail for valid id and 404 beyond total', async () => {
  const detail = await chainRead.getSkillById('3');
  assert.equal(detail.skillId, 3);
  await assert.rejects(chainRead.getSkillById(6), (err) => err.status === 404);
  await assert.rejects(chainRead.getSkillById('abc'), (err) => err.status === 404);
});

test('getSkillById 404 on empty registry (total=0)', async () => {
  const fake = makeFakeDeps();
  fake.get = async () => ({ result: 1 }); // nextSkillId=1 → 0 个技能
  chainRead.__setDependenciesForTest(fake);
  await assert.rejects(chainRead.getSkillById(1), (err) => err.status === 404);
});

// ── getLeaderboard：按 skillId 去重（owner ∪ 镜像提交者，非求和）──

const DEPLOYER = '0x3737f0d872f386f170c20e2ae73b81cfe6b7ecf3';

function makeLeaderboardDeps() {
  return {
    get: async (contractKey, method) => {
      if (method === 'nextSkillId') return { result: 4 }; // 3 个技能
      if (method === 'getUserReputation') return { result: 10 }; // 有效声誉
      if (method === 'userReputation') return { result: 12 };
      throw new Error('unexpected method: ' + method);
    },
    getSkillFromChain: async (id) => ({
      skillId: id,
      owner: DEPLOYER,
      name: 'skill-' + id,
    }),
    loadMirror: () => ({ 3: { skillId: 3, submitter: DEPLOYER } }), // 与 owner 同一地址、同一功能
  };
}

test('getLeaderboard counts distinct skills, not owner+submitter sum', async () => {
  chainRead.__setDependenciesForTest(makeLeaderboardDeps());
  const { leaderboard, coverageNote } = await chainRead.getLeaderboard({ limit: 5 });
  assert.equal(leaderboard.length, 1); // 只有一个参与地址
  assert.equal(leaderboard[0].address, DEPLOYER);
  assert.equal(leaderboard[0].skillsOwned, 3); // 3 个技能，而非 3(owner)+1(mirror)=4
  assert.equal(leaderboard[0].rank, 1);
  assert.equal(leaderboard[0].effectiveReputation, 10);
  assert.match(coverageNote, /无全局用户注册表/);
});

test('getLeaderboard merges submitter-only addresses (mirror 独有地址)', async () => {
  const fake = makeLeaderboardDeps();
  fake.loadMirror = () => ({
    1: { skillId: 1, submitter: DEPLOYER },
    2: { skillId: 2, submitter: '0x' + 'b'.repeat(40) }, // 非 owner 的提交者
  });
  chainRead.__setDependenciesForTest(fake);
  const { leaderboard, totalAddresses } = await chainRead.getLeaderboard({ limit: 5 });
  assert.equal(totalAddresses, 2);
  const b = leaderboard.find((e) => e.address === '0x' + 'b'.repeat(40));
  assert.equal(b.skillsOwned, 1);
  const deployer = leaderboard.find((e) => e.address === DEPLOYER);
  assert.equal(deployer.skillsOwned, 3); // 3 个 owner 技能（mirror skillId=1 已计入）
});

// ── getSkillLineage：祖先 / 后代 / 贡献者 ──

function makeLineageDeps() {
  const mirror = {
    1: { skillId: 1, name: 'root', creator: DEPLOYER, owner: DEPLOYER, parentSkillId: null, forkType: 'original', contributors: [] },
    2: { skillId: 2, name: 'fork-a', creator: '0x' + 'a'.repeat(40), owner: '0x' + 'a'.repeat(40), parentSkillId: 1, forkType: 'fork', contributors: [
      { address: DEPLOYER, role: 'originator', weight: 1.0, skillId: 1, contribution: 'Original creation', timestamp: 1000 },
      { address: '0x' + 'a'.repeat(40), role: 'forker', weight: 0.3, skillId: 2, contribution: 'Forked', timestamp: 2000 },
    ]},
    3: { skillId: 3, name: 'fork-b', creator: '0x' + 'b'.repeat(40), owner: '0x' + 'b'.repeat(40), parentSkillId: 1, forkType: 'modify', contributors: [] },
    4: { skillId: 4, name: 'sub-fork', creator: '0x' + 'c'.repeat(40), owner: '0x' + 'c'.repeat(40), parentSkillId: 2, forkType: 'extension', contributors: [] },
  };
  const skillDetails = {
    1: { skillId: 1, name: 'root', owner: DEPLOYER, createdAt: 1000 },
    2: { skillId: 2, name: 'fork-a', owner: '0x' + 'a'.repeat(40), createdAt: 2000 },
    3: { skillId: 3, name: 'fork-b', owner: '0x' + 'b'.repeat(40), createdAt: 3000 },
    4: { skillId: 4, name: 'sub-fork', owner: '0x' + 'c'.repeat(40), createdAt: 4000 },
  };
  return {
    get: async (contractKey, method) => {
      if (method === 'nextSkillId') return { result: 5 };
      throw new Error('unexpected method: ' + method);
    },
    getSkillFromChain: async (id) => skillDetails[id] || { skillId: id, name: 'unknown', owner: null },
    loadMirror: () => mirror,
  };
}

beforeEach(() => {
  chainRead.__setDependenciesForTest(makeLineageDeps());
});

test('getSkillLineage returns ancestors and descendants', async () => {
  const lineage = await chainRead.getSkillLineage(2);
  assert.equal(lineage.skillId, 2);
  assert.equal(lineage.name, 'fork-a');
  assert.deepEqual(lineage.ancestors.map((a) => a.skillId), [1]);
  assert.deepEqual(lineage.descendants.map((d) => d.skillId), [4]);
  assert.equal(lineage.depth, 1);
  assert.equal(lineage.branchCount, 1);
});

test('getSkillLineage handles skill with multiple descendants', async () => {
  const lineage = await chainRead.getSkillLineage(1);
  assert.equal(lineage.skillId, 1);
  assert.deepEqual(lineage.ancestors, []);
  assert.deepEqual(lineage.descendants.map((d) => d.skillId), [2, 3]);
  assert.equal(lineage.depth, 0);
  assert.equal(lineage.branchCount, 2);
});

test('getSkillLineage returns contributors from mirror', async () => {
  const lineage = await chainRead.getSkillLineage(2);
  assert.equal(lineage.contributors.length, 2);
  assert.equal(lineage.contributors[0].address, DEPLOYER);
  assert.equal(lineage.contributors[0].role, 'originator');
  assert.equal(lineage.contributors[0].weight, 1.0);
  assert.equal(lineage.contributors[1].address, '0x' + 'a'.repeat(40));
  assert.equal(lineage.contributors[1].role, 'forker');
});

test('getSkillLineage auto-adds originator when contributors empty', async () => {
  const lineage = await chainRead.getSkillLineage(1);
  assert.equal(lineage.contributors.length, 1);
  assert.equal(lineage.contributors[0].address, DEPLOYER);
  assert.equal(lineage.contributors[0].role, 'originator');
  assert.equal(lineage.contributors[0].weight, 1.0);
});

test('getSkillLineage 404 for invalid id', async () => {
  await assert.rejects(chainRead.getSkillLineage(999), (err) => err.status === 404);
  await assert.rejects(chainRead.getSkillLineage('abc'), (err) => err.status === 404);
});

// ── getSkillReceipt：存证回执 ──

test('getSkillReceipt returns verification data', async () => {
  const receipt = await chainRead.getSkillReceipt(1);
  assert.equal(receipt.skillId, 1);
  assert.equal(receipt.creator, DEPLOYER);
  assert.equal(receipt.txHash, null); // mirror 未设置 txId
  assert.equal(receipt.blockNumber, null);
  assert.equal(receipt.platform, 'chainmaker');
  assert.ok(receipt.verification);
  assert.equal(receipt.verification.fingerprintMatch, false);
  assert.equal(receipt.verification.chainVerified, false);
});

test('getSkillReceipt 404 for invalid id', async () => {
  await assert.rejects(chainRead.getSkillReceipt(999), (err) => err.status === 404);
});

// ── getSkillContributors：贡献者 attribution ──

test('getSkillContributors returns contributor list', async () => {
  const contributors = await chainRead.getSkillContributors(2);
  assert.equal(contributors.length, 2);
  assert.equal(contributors[0].address, DEPLOYER);
  assert.equal(contributors[0].role, 'originator');
  assert.equal(contributors[1].address, '0x' + 'a'.repeat(40));
  assert.equal(contributors[1].role, 'forker');
  assert.equal(contributors[1].weight, 0.3);
});

test('getSkillContributors auto-adds originator when empty', async () => {
  const contributors = await chainRead.getSkillContributors(1);
  assert.equal(contributors.length, 1);
  assert.equal(contributors[0].role, 'originator');
});

test('getSkillContributors 404 for invalid id', async () => {
  await assert.rejects(chainRead.getSkillContributors(999), (err) => err.status === 404);
});
