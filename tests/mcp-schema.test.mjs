import { test } from 'node:test';
import assert from 'node:assert/strict';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { readerOutput } from '../lib/mcp-reader-schema.mjs';
import { articlePage, articleRevision } from '../lib/article-contract.mjs';

test('official MCP client accepts structured article success and error responses', async () => {
  const server = new McpServer({ name: 'schema-test', version: '1' });
  const client = new Client({ name: 'schema-test', version: '1' });
  let data = { code: 'incomplete_extraction', error: 'Full article unavailable.', retryable: false };
  server.registerTool('read', { outputSchema: readerOutput }, async () => ({
    content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data, isError: 'code' in data,
  }));
  const [left, right] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(left); await client.connect(right);
    const list = await client.listTools();
    assert.equal(list.tools[0].outputSchema.type, 'object');
    assert.equal(list.tools[0].outputSchema.anyOf.length, 2);
    assert.deepEqual((await client.callTool({ name: 'read' })).structuredContent, data);
    const article = { id: '000001612', title: 'Example', url: 'https://support.clever.com/s/articles/000001612?language=en_US', text: 'Full article', bodyComplete: true, language: 'en_US', indexedAt: '2026-09-07T12:00:00Z' };
    article.revision = articleRevision(article);
    data = articlePage(article, { url: article.url });
    assert.deepEqual((await client.callTool({ name: 'read' })).structuredContent, data);
    assert.equal(readerOutput.safeParse({ text: 'Incomplete success' }).success, false);
  } finally { await client.close(); await server.close(); }
});
