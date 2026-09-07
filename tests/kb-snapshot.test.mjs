import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSnapshot } from '../lib/kb-snapshot.mjs';
const snapshot = { kb: [{ id: 'example' }], vectors: [Array(512).fill(0)] };
test('a transient cold storage failure recovers within the same request', async () => {
  let calls = 0; const warnings = [];
  const result = await readSnapshot({ read: async () => { if (++calls === 1) throw new Error('sensitive credentials'); return snapshot; }, warn: (...args) => warnings.push(args) });
  assert.equal(result, snapshot); assert.equal(calls, 2);
  assert.equal(warnings.length, 1); assert.ok(!JSON.stringify(warnings).includes('sensitive'));
});
test('missing or invalid snapshot is retried without publishing partial data', async () => {
  for (const bad of [null, { kb: snapshot.kb, vectors: [[1]] }]) {
    let calls = 0;
    assert.equal(await readSnapshot({ read: async () => { calls++; return bad; }, warn: () => {} }), null);
    assert.equal(calls, 2);
  }
});
test('persistent storage failure stops after two attempts', async () => {
  let calls = 0;
  assert.equal(await readSnapshot({ read: async () => { calls++; throw new Error('offline'); }, warn: () => {} }), null);
  assert.equal(calls, 2);
});
