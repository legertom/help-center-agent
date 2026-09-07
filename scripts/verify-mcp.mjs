import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { mkdir, writeFile } from 'node:fs/promises';
const endpoint = process.argv[2];
if (!endpoint) throw new Error('Usage: node scripts/verify-mcp.mjs https://host/api/mcp');
const headers = { 'content-type': 'application/json' };
if (process.env.MCP_API_KEY) headers.authorization = `Bearer ${process.env.MCP_API_KEY}`;
const output = new URL('../verification/', import.meta.url);
await mkdir(output, { recursive: true });
let id = 0;
async function rpc(method, params) {
  const start = performance.now();
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }), signal: AbortSignal.timeout(90000) });
  assert.equal(res.status, 200, (await res.clone().text()).slice(0,300));
  const body = await res.json();
  assert.ok(!body.error, JSON.stringify(body.error));
  return { result: body.result, ms: Math.round(performance.now() - start) };
}
async function call(name, args) {
  const r = await rpc('tools/call', { name, arguments: args });
  assert.deepEqual(r.result.structuredContent, JSON.parse(r.result.content[0].text));
  return { ...r, data: r.result.structuredContent };
}
const initialization = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'clever-verification', version: '1' } });
const list = await rpc('tools/list');
assert.deepEqual(list.result.tools.map(t => t.name), ['search_clever_kb','ask_clever_support','read_clever_article']);
assert.ok(list.result.tools[2].outputSchema);
await writeFile(new URL('mcp-tools.json', output), JSON.stringify(list.result, null, 2));
const url = 'https://support.clever.com/s/articles/000001612?language=en_US';
// First content request after deploy: includes cold index loading, though Vercel
// function coldness is not guaranteed by this client.
const first = await call('read_clever_article', { url });
assert.equal(first.result.isError, false);
assert.match(first.data.text, /Student Tools/);
assert.match(first.data.text, /Set new password/i);
assert.match(first.data.text, /district/i);
await writeFile(new URL('article-example.json', output), JSON.stringify(first.result, null, 2));
const warm = [];
for (let i=0; i<5; i++) warm.push((await call('read_clever_article', { url })).ms);
const search = await call('search_clever_kb', { query: 'For Teachers: How to reset passwords for yourself and students', limit: 3 });
assert.equal(search.result.isError, false);
assert.ok(search.data.results.some(r => r.articleId === '000001612'));
for (const hit of search.data.results) { if(hit.bodyAvailable) assert.equal((await call('read_clever_article',{url:hit.url})).result.isError,false); }
await writeFile(new URL('search-example.json', output), JSON.stringify(search.data, null, 2));
const errors = [];
for (const [args, code] of [
  [{url:'https://example.com'},'invalid_url'], [{url,offset:-1},'invalid_offset'],
  [{url:url.replace('en_US','es')},'unsupported_language'], [{url,revision:'outdated'},'revision_changed'],
  [{url:'https://support.clever.com/s/articles/999999999999'},'not_found'],
  [{url:'https://support.clever.com/s/articles/000001577'},'incomplete_extraction'],
]) {
  const r=await call('read_clever_article',args);
  assert.equal(r.result.isError,true); assert.equal(r.data.code,code);
  errors.push({input:args,...r.data});
}
await writeFile(new URL('error-examples.json', output),JSON.stringify(errors,null,2));
const answer=await call('ask_clever_support',{question:'How can a teacher reset a student password in Clever?'});
assert.equal(answer.result.isError,false); assert.ok(answer.data.answer);
await writeFile(new URL('answer-example.json',output),JSON.stringify(answer.data,null,2));
const report={endpoint,verifiedAt:new Date().toISOString(),initialization:initialization.result.serverInfo,firstIndexedReadMs:first.ms,warmIndexedReadMs:warm,searchMs:search.ms,searchMethod:search.data.method,answerMs:answer.ms,checks:'initialize, tools/list, structuredContent equivalence, full password procedure, search-to-reader, invalid URL/offset/language/revision, missing/incomplete articles, synthesized answer'};
await writeFile(new URL('mcp-report.json',output),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

// Exercise SDK output-schema validation, including structured tool errors.
const client = new Client({ name: 'clever-sdk-verification', version: '1' });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint), { requestInit: { headers } }));
  await client.listTools();
  assert.equal((await client.callTool({ name: 'read_clever_article', arguments: { url } })).isError, false);
  for (const { input, code } of errors) {
    const result = await client.callTool({ name: 'read_clever_article', arguments: input });
    assert.equal(result.isError, true); assert.equal(result.structuredContent.code, code);
  }
  assert.equal((await client.callTool({ name: 'read_clever_article', arguments: { url, offset: null } })).structuredContent.code, 'invalid_offset');
  console.log('Official SDK success and structured-error validation passed.');
} finally { await client.close(); }
