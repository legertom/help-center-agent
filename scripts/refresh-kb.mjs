import { readFile } from 'node:fs/promises';
import { refreshAndStore } from '../lib/refresh-store.mjs';
const seed = JSON.parse(await readFile(new URL('../agent/data/kb.json', import.meta.url), 'utf8'));
const snapshot = await refreshAndStore({ seed });
console.log(JSON.stringify(snapshot.manifest, null, 2));
