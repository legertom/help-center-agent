import { readJson } from './blob-json.mjs';
import { EMBED_DIMS, KB_SNAPSHOT_BLOB_PATH } from './kb-config.mjs';

// Retry a failed cold read once before falling back. Each Blob attempt is
// independently time-bounded by readJson; never log credentials or article data.
export async function readSnapshot({ read = readJson, warn = console.warn } = {}) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const snapshot = await read(KB_SNAPSHOT_BLOB_PATH);
      const { kb, vectors } = snapshot ?? {};
      if (!Array.isArray(kb) || !kb.length || !Array.isArray(vectors) || vectors.length !== kb.length ||
          !vectors.every(v => Array.isArray(v) && v.length === EMBED_DIMS && v.every(Number.isFinite))) {
        warn('[kb] snapshot unavailable', { attempt, reason: snapshot ? 'invalid_snapshot' : 'missing_snapshot' });
        continue;
      }
      return snapshot;
    } catch (error) {
      warn('[kb] snapshot read failed', { attempt, reason: error instanceof Error ? error.name : 'UnknownError' });
    }
  }
  return null;
}
