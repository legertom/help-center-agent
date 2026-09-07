import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer, readerInput, toolError } from '@/lib/mcp-server';
import { ArticleError, validateRead } from '@/lib/article-contract.mjs';

export const runtime = 'nodejs';
export const maxDuration = 60;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id, mcp-protocol-version',
};
function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

async function dispatch(req: Request, body: unknown): Promise<Response> {
  // Preserve machine-readable tool errors even for inputs rejected by schemas.
  const msg = body as { id?: string | number; method?: string; params?: { name?: string; arguments?: unknown } } | null;
  if (msg?.method === 'tools/call' && msg.params?.name === 'read_clever_article') {
    try {
      validateRead(msg.params.arguments);
      if (!readerInput.safeParse(msg.params.arguments).success) throw new ArticleError('invalid_arguments', 'Unexpected article reader arguments.');
    } catch (err) {
      return json({ jsonrpc: '2.0', id: msg.id ?? null, result: toolError(err) });
    }
  }
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    // Earlier clients omit Accept. Supply the two MCP response types while
    // preserving the public stateless JSON POST contract.
    const headers = new Headers(req.headers);
    headers.set('accept', 'application/json, text/event-stream');
    headers.set('content-type', 'application/json');
    const response = await transport.handleRequest(new Request(req.url, { method: 'POST', headers, body: JSON.stringify(body) }));
    const responseBody = await response.text();
    return new Response(responseBody || null, { status: response.status, headers: { ...Object.fromEntries(response.headers), ...CORS } });
  } finally { await server.close(); }
}

export async function POST(req: Request) {
  const key = process.env.MCP_API_KEY;
  if (key && req.headers.get('authorization') !== `Bearer ${key}`) {
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized: missing or invalid bearer token.' } }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer realm="clever-support-mcp"' },
    });
  }
  let body: unknown;
  try { body = await req.json(); }
  catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: invalid JSON.' } }, 400); }
  // Compatibility with the previous server's batch extension.
  if (Array.isArray(body)) {
    if (!body.length) return json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Empty batch.' } }, 400);
    const results = await Promise.all(body.map(async item => {
      const response = await dispatch(req, item);
      return response.status === 202 ? null : response.json();
    }));
    const responses = results.filter(Boolean);
    return responses.length ? json(responses) : new Response(null, { status: 202, headers: CORS });
  }
  return dispatch(req, body);
}
export function GET() { return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, Allow: 'POST, OPTIONS' } }); }
export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }
