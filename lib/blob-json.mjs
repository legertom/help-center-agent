import { get, put } from '@vercel/blob';

// The Clever project uses a private store. Never fall back to a personal store.
export async function readJson(pathname) {
  const result = await get(pathname, { access: 'private', abortSignal: AbortSignal.timeout(15000) });
  if (!result) return null;
  if (result.statusCode !== 200) throw new Error('Unexpected Blob response');
  return new Response(result.stream).json();
}

export function putJson(pathname, data) {
  return put(pathname, JSON.stringify(data), {
    access: 'private', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 60,
  });
}
