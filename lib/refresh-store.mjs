import { readJson, putJson } from './blob-json.mjs';
import { crawlKb, embedKb, diffKb } from './kb-refresh.mjs';
import { isCompleteArticle } from './article-contract.mjs';
import { EMBED_DIMS, KB_SNAPSHOT_BLOB_PATH, KB_REFRESH_STATUS_PATH } from './kb-config.mjs';

export async function refreshAndStore({ seed = [] } = {}) {
  const attemptedAt = new Date().toISOString();
  // A storage read failure must abort, never masquerade as an empty baseline.
  const previous = await readJson(KB_SNAPSHOT_BLOB_PATH);
  const failures = [];
  try {
    const kb = await crawlKb({ previous: previous?.kb ?? seed, onFailure: failure => failures.push(failure) });
    const complete = kb.filter(isCompleteArticle);
    if (!complete.length) throw new Error('No verified complete articles fetched; refusing to publish.');
    const vectors = await embedKb(kb);
    if (vectors.length !== kb.length || vectors.some(v => v.length !== EMBED_DIMS || v.some(n => !Number.isFinite(n)))) throw new Error('Invalid aligned embeddings');
    const syncedAt = new Date().toISOString();
    const diff = diffKb(previous?.kb, kb);
    const counts = { added: diff.added.length, removed: diff.removed.length, modified: diff.modified.length, total: kb.length };
    const changed = !previous || counts.added + counts.removed + counts.modified > 0;
    const entry = {
      at: syncedAt, counts, added: diff.added.slice(0, 50), removed: diff.removed.slice(0, 50), modified: diff.modified.slice(0, 50),
      summary: `Indexed ${complete.length} complete articles; ${failures.length} fetch/extraction failures.`,
    };
    const manifest = {
      count: kb.length, completeCount: complete.length, dims: EMBED_DIMS,
      syncedAt, builtAt: syncedAt, changedAt: changed ? syncedAt : previous.manifest.changedAt,
      lastChange: changed ? counts : previous.manifest.lastChange,
      failedCount: failures.length, attemptedAt,
    };
    const snapshot = { schemaVersion: 2, kb, vectors, manifest, changelog: [entry, ...(previous?.changelog ?? [])].slice(0, 60) };
    // This is the publication point. Readers cannot observe mixed generations.
    await putJson(KB_SNAPSHOT_BLOB_PATH, snapshot);
    await putJson(KB_REFRESH_STATUS_PATH, { attemptedAt, finishedAt: syncedAt, status: failures.length ? 'partial' : 'ok', manifest, failures });
    return snapshot;
  } catch (error) {
    await putJson(KB_REFRESH_STATUS_PATH, {
      attemptedAt, finishedAt: new Date().toISOString(), status: 'failed',
      lastSuccessfulRefresh: previous?.manifest.syncedAt ?? null,
      error: 'Refresh failed; last published snapshot preserved. See server logs.', failures,
    }).catch(() => {});
    throw error;
  }
}
