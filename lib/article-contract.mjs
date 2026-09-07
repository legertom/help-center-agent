import { createHash } from 'node:crypto';

export class ArticleError extends Error {
  constructor(code, error, retryable = false) {
    super(error);
    this.code = code;
    this.retryable = retryable;
  }
  payload() { return { code: this.code, error: this.message, retryable: this.retryable }; }
}

export function normalizeArticleUrl(value) {
  let u;
  try { u = new URL(value); } catch { throw new ArticleError('invalid_url', 'Expected an HTTPS Clever Support article URL.'); }
  if (u.protocol !== 'https:' || u.hostname !== 'support.clever.com' || u.port || u.username || u.password) {
    throw new ArticleError('invalid_url', 'Only HTTPS support.clever.com article URLs are supported.');
  }
  const match = /^\/(?:s\/)?articles\/(\d{6,})\/?$/.exec(u.pathname);
  if (!match) throw new ArticleError('invalid_url', 'Expected a numeric Clever Support article URL.');
  const languages = u.searchParams.getAll('language');
  if (languages.length > 1 || (languages.length && !['en_US', 'en-US'].includes(languages[0]))) {
    throw new ArticleError('unsupported_language', 'This corpus supports en_US only.');
  }
  return { articleId: match[1], language: 'en_US', url: `https://support.clever.com/s/articles/${match[1]}?language=en_US` };
}

export function validateRead(args) {
  if (!args || typeof args !== 'object' || typeof args.url !== 'string') throw new ArticleError('invalid_url', 'url is required.');
  const normalized = normalizeArticleUrl(args.url);
  const offset = args.offset === undefined ? 0 : args.offset;
  if (!Number.isSafeInteger(offset) || offset < 0) throw new ArticleError('invalid_offset', 'offset must be a nonnegative safe integer (UTF-16 code units).');
  if (args.revision !== undefined && (typeof args.revision !== 'string' || !args.revision)) throw new ArticleError('invalid_revision', 'revision must be a nonempty string.');
  return { ...normalized, offset, revision: args.revision };
}

export function articleRevision(article) {
  return createHash('sha256').update(JSON.stringify([article.id, article.url, article.title, article.text])).digest('hex');
}

export function isCompleteArticle(a) {
  return Boolean(a && a.bodyComplete === true && a.text?.length && a.language === 'en_US' &&
    typeof a.indexedAt === 'string' && Number.isFinite(Date.parse(a.indexedAt)) && a.revision === articleRevision(a));
}

// Offsets are exact JS string indices. Paragraph boundaries are included in the
// preceding page; joining text pages reconstructs the original byte-for-byte.
export function articlePage(article, args) {
  const input = validateRead(args);
  if (!article) throw new ArticleError('not_found', 'Article is not in the maintained corpus.');
  if (!isCompleteArticle(article)) throw new ArticleError('incomplete_extraction', 'A verified full body is not available for this article.', true);
  if (input.revision && input.revision !== article.revision) throw new ArticleError('revision_changed', 'The article revision changed. Restart at offset 0 without revision.', true);
  const { text } = article;
  if (input.offset >= text.length) throw new ArticleError('invalid_offset', 'offset must be within the article body.');
  // An offset between surrogate halves would not be a valid text boundary.
  if (input.offset > 0 && /[\uD800-\uDBFF]/.test(text[input.offset - 1]) && /[\uDC00-\uDFFF]/.test(text[input.offset])) {
    throw new ArticleError('invalid_offset', 'offset splits a UTF-16 surrogate pair.');
  }
  let end = Math.min(input.offset + 16000, text.length);
  if (end < text.length) {
    const paragraph = text.lastIndexOf('\n\n', end - 2);
    if (paragraph >= input.offset + 8000) end = paragraph + 2;
    if (/[\uD800-\uDBFF]/.test(text[end - 1]) && /[\uDC00-\uDFFF]/.test(text[end])) end--;
  }
  return {
    type: 'support_article', articleId: article.id, title: article.title, url: input.url,
    audience: article.audience ?? null, language: article.language,
    text: text.slice(input.offset, end), indexedAt: article.indexedAt,
    sourceUpdatedAt: article.sourceUpdatedAt ?? null, revision: article.revision,
    offset: input.offset, totalCharacters: text.length,
    next_offset: end === text.length ? null : end,
    complete: input.offset === 0 && end === text.length,
  };
}

export async function readIndexedArticle(args, { available, lookup }) {
  const input = validateRead(args);
  if (!await available()) throw new ArticleError('storage_unavailable', 'The indexed article store is unavailable. Retry later.', true);
  return articlePage(await lookup(input.url), args);
}
