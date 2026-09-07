import { readJson } from '@/lib/blob-json.mjs';
import { KB_REFRESH_STATUS_PATH } from '@/lib/kb-config.mjs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const status = await readJson(KB_REFRESH_STATUS_PATH);
    return Response.json(status ?? { status: 'unavailable' }, { status: status ? 200 : 503 });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }
}
