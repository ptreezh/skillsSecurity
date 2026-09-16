'use strict';

/**
 * chainmaker-client 纯函数单元测试（不依赖 cmc 容器 / 链上状态）
 *
 * 覆盖 decodeRevertReason：Solidity Error(string) ABI 编码的 revert reason 解析。
 * 该函数是后端错误消息可读性的基石——若回归，前端 REPUTATION_ERROR_RE 将无法
 * 匹配链上错误，MEDIUM+ 声誉不足的友好提示会静默失效。
 *
 * 运行：
 *   node --test test/server/
 *   npm run test:unit
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { decodeRevertReason } = require('../../server/chainmaker-client.js');

// 真实链上捕获：registerSkill MEDIUM 声誉不足 revert（chain1，2026-09-16）
const REAL_ABI_HEX =
  '08c379a0' +
  '0000000000000000000000000000000000000000000000000000000000000020' +
  '0000000000000000000000000000000000000000000000000000000000000032' +
  '496e73756666696369656e74206566666563746976652072657075746174696f' +
  '6e20666f72204d454449554d20736b696c6c';
const REAL_DECODED = 'Insufficient effective reputation for MEDIUM skill';

test('decodes pure hex with 0x prefix', () => {
  assert.equal(decodeRevertReason(`0x${REAL_ABI_HEX}`), REAL_DECODED);
});

test('decodes pure hex without 0x prefix', () => {
  assert.equal(decodeRevertReason(REAL_ABI_HEX), REAL_DECODED);
});

test('decodes cmc prefixed form (real error text shape)', () => {
  assert.equal(
    decodeRevertReason(
      `failed to execute evm contract, error reverted : 0x${REAL_ABI_HEX}`
    ),
    REAL_DECODED
  );
});

test('decodes prefixed form without 0x', () => {
  assert.equal(
    decodeRevertReason(`error reverted : ${REAL_ABI_HEX}`),
    REAL_DECODED
  );
});

test('returns null for panic selector (non-Error(string))', () => {
  // Panic(uint256) = 0x4e487b71
  assert.equal(
    decodeRevertReason(
      '0x4e487b710000000000000000000000000000000000000000000000000000000000000012'
    ),
    null
  );
});

test('returns null for truncated / malformed hex', () => {
  assert.equal(decodeRevertReason('0x08c379a0abcd'), null);
  assert.equal(decodeRevertReason('08c379a0'), null);
});

test('returns null when no 08c379a0 selector present', () => {
  assert.equal(decodeRevertReason('Insufficient effective reputation'), null);
  assert.equal(decodeRevertReason('plain text error'), null);
  assert.equal(decodeRevertReason(''), null);
  assert.equal(decodeRevertReason(null), null);
  assert.equal(decodeRevertReason(undefined), null);
});

test('returns null for non-printable decoded payload (garbage guard)', () => {
  // selector + offset=0x20 + length=16 + 16 bytes of 0x00 (non-printable)
  const hex =
    '08c379a0' +
    '0000000000000000000000000000000000000000000000000000000000000020' +
    '0000000000000000000000000000000000000000000000000000000000000010' +
    '00000000000000000000000000000000';
  assert.equal(decodeRevertReason(hex), null);
});

test('throws on 未注册合约 key (CONTRACTS registry integrity)', async () => {
  const { get } = require('../../server/chainmaker-client.js');
  await assert.rejects(get('NotARealContract', 'foo', []), /未注册的合约 key/);
});