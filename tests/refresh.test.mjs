import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { articleRevision } from '../lib/article-contract.mjs';
import { KB_SNAPSHOT_BLOB_PATH, KB_REFRESH_STATUS_PATH } from '../lib/kb-config.mjs';
const a = { id: '000001612', url: 'https://support.clever.com/s/articles/000001612?language=en_US', title: 'Test', text: 'Complete evidence', language: 'en_US', indexedAt: '2026-09-07T00:00:00.000Z', bodyComplete: true };
a.revision = articleRevision(a);
let stored = { kb: [a], vectors: [Array(512).fill(0.1)], manifest: { syncedAt: a.indexedAt, changedAt: a.indexedAt, lastChange: {} }, changelog: [] };
let fail = false; const writes = [];
mock.module('../lib/blob-json.mjs', { namedExports: {
  readJson: async () => stored,
  putJson: async (path, value) => { writes.push([path, value]); },
} });
mock.module('../lib/kb-refresh.mjs', { namedExports: {
  crawlKb: async ({ previous, onFailure }) => { onFailure({ articleId: a.id, retained: true }); return previous; },
  embedKb: async () => { if (fail) throw new Error('Embedding unavailable'); return [Array(512).fill(0.2)]; },
  diffKb: () => ({ added: [], removed: [], modified: [] }),
} });
const { refreshAndStore } = await import('../lib/refresh-store.mjs');
test('partial extraction preserves last good body and its actual indexedAt; snapshot publication is atomic', async () => {
  const next = await refreshAndStore();
  assert.equal(next.kb[0].indexedAt, a.indexedAt);
  assert.equal(next.kb[0].revision, a.revision);
  assert.equal(next.manifest.failedCount, 1);
  assert.deepEqual(writes.map(w => w[0]), [KB_SNAPSHOT_BLOB_PATH, KB_REFRESH_STATUS_PATH]);
  assert.equal(writes[0][1].vectors.length, writes[0][1].kb.length);
});
test('failed embeddings cannot overwrite the published corpus', async () => {
  writes.length = 0; fail = true;
  await assert.rejects(refreshAndStore(), /Embedding unavailable/);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], KB_REFRESH_STATUS_PATH);
  assert.equal(writes[0][1].status, 'failed');
  assert.equal(stored.kb[0].revision, a.revision);
});
