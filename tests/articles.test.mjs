import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articlePage, articleRevision, normalizeArticleUrl } from '../lib/article-contract.mjs';
import { extractArticle, acceptArticle } from '../lib/article-extraction.mjs';
const url = 'https://support.clever.com/s/articles/000001612?language=en_US';
function article(text) {
  const a = { id: '000001612', title: 'Example', url, text, bodyComplete: true, language: 'en_US', indexedAt: '2026-09-07T12:00:00.000Z' };
  return { ...a, revision: articleRevision(a) };
}
test('pagination reconstructs a long article exactly, with stable revision and truthful complete', () => {
  const a = article(('## Procedure\n\n' + 'Step 🧑‍🏫 follow the instruction. '.repeat(180) + '\n\n').repeat(12));
  let offset = 0; const pages = [];
  do {
    const page = articlePage(a, { url, offset, revision: a.revision });
    assert.equal(page.complete, false);
    assert.ok(page.text.length <= 16000);
    pages.push(page.text); offset = page.next_offset;
  } while (offset !== null);
  assert.equal(pages.join(''), a.text);
  assert.ok(pages.length > 3);
  assert.equal(articlePage(article('Small article'), { url }).complete, true);
});
test('revision changes and incomplete copies never produce full-body success', () => {
  const a = article('An article');
  assert.throws(() => articlePage(a, { url, revision: 'old' }), e => e.code === 'revision_changed' && e.retryable);
  assert.throws(() => articlePage({ ...a, bodyComplete: false }, { url }), e => e.code === 'incomplete_extraction');
  assert.throws(() => articlePage(null, { url }), e => e.code === 'not_found');
  assert.throws(() => articlePage({ ...a, text: 'changed without revision' }, { url }), e => e.code === 'incomplete_extraction');
});
test('strict URL, language, offset validation', () => {
  assert.equal(normalizeArticleUrl('https://support.clever.com/articles/000001612/?language=en-US#steps').url, url);
  for (const bad of ['http://support.clever.com/s/articles/000001612', 'https://support.clever.com.evil.test/s/articles/000001612', 'https://user:pass@support.clever.com/s/articles/000001612', 'https://support.clever.com/s/topic/123', 'https://example.com/a']) {
    assert.throws(() => normalizeArticleUrl(bad), e => e.code === 'invalid_url');
  }
  assert.throws(() => normalizeArticleUrl(url.replace('en_US', 'es')), e => e.code === 'unsupported_language');
  for (const offset of [-1, 0.5, Infinity, NaN, '2', 1000]) assert.throws(() => articlePage(article('abc'), { url, offset }), e => e.code === 'invalid_offset');
});
test('extraction retains headings, ordered steps, links and tables; rejects shells and TOC-only', () => {
  const html = `<html><head><title>For Teachers: Test</title></head><body><nav>PRIVATE NAVIGATION</nav><svg><title>Back Button</title></svg><div class="slds-rich-text-editor__output"><h2>Prerequisite</h2><p>Your district must enable this feature before teachers can change student passwords. Follow all of the steps below.</p><ol><li>Open the roster.</li><li>Select <a href="/s/articles/000001612">Student Tools</a>.</li></ol><table><thead><tr><th>Role</th><th>Permission</th></tr></thead><tbody><tr><td>Teacher</td><td>District enabled</td></tr></tbody></table></div></body></html>`;
  const a = extractArticle(html, '000001612');
  assert.equal(a.title, 'For Teachers: Test');
  assert.match(a.text, /## Prerequisite/); assert.match(a.text, /1\.\s+Open/); assert.match(a.text, /2\.\s+Select/);
  assert.match(a.text, /https:\/\/support.clever.com/); assert.match(a.text, /\| Role/);
  assert.ok(!a.text.includes('PRIVATE NAVIGATION'));
  assert.equal(a.sourceUpdatedAt, null);
  assert.equal(extractArticle('<title>Help Center</title><div>Loading</div>', '000001612'), null);
  assert.equal(extractArticle('<title>Test</title><div class="slds-rich-text"><a href="#x">' + 'Contents '.repeat(50) + '</a></div>', '000001612'), null);
  assert.equal(acceptArticle(article('Full good content '.repeat(300)), null), false);
  assert.equal(acceptArticle(article('Full good content '.repeat(300)), a), false);
});

test('unavailable storage is a retryable error, never empty successful evidence', async () => {
  const { readIndexedArticle } = await import('../lib/article-contract.mjs');
  let lookedUp = false;
  await assert.rejects(readIndexedArticle({ url }, {
    available: async () => false,
    lookup: async () => { lookedUp = true; return article('Text'); },
  }), e => e.code === 'storage_unavailable' && e.retryable);
  assert.equal(lookedUp, false);
});

test('crawler rejects an off-domain redirect before following it', async () => {
  const { mock } = await import('node:test');
  const { getText } = await import('../lib/kb-refresh.mjs');
  const request = mock.method(globalThis, 'fetch', async () => new Response(null, { status: 302, headers: { location: 'https://evil.example/article' } }));
  try {
    await assert.rejects(getText(url), /Unapproved source destination/);
    assert.equal(request.mock.callCount(), 1);
  } finally { request.mock.restore(); }
});
