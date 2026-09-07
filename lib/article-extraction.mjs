import { load } from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { articleRevision, normalizeArticleUrl, isCompleteArticle } from './article-contract.mjs';

const markdown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
markdown.use(gfm);

export function extractArticle(html, id, indexedAt = new Date().toISOString()) {
  const $ = load(html);
  const title = $('head > title').first().text().trim().replace(/\s+/g, ' ');
  if (!title || /^(Help Center|Log[ -]?in|Sign[ -]?in|Loading)[.!…\s]*$/i.test(title)) return null;
  const roots = $('.slds-rich-text-editor__output, .slds-rich-text').filter((_, el) =>
    !$(el).parents('.slds-rich-text-editor__output, .slds-rich-text').length);
  if (!roots.length) return null;
  roots.find('script, style, nav, form, button, [aria-hidden="true"]').remove();
  // Resolve useful relative links; never include javascript/data URLs.
  roots.find('a').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const u = new URL(href, `https://support.clever.com/s/articles/${id}`);
      if (['https:', 'mailto:'].includes(u.protocol)) $(el).attr('href', u.href);
      else $(el).removeAttr('href');
    } catch { $(el).removeAttr('href'); }
  });
  const plain = roots.text().replace(/\s+/g, ' ').trim();
  const linkText = roots.find('a').text().replace(/\s+/g, ' ').trim();
  if (plain.length < 100 || linkText.length / plain.length > 0.8) return null;
  const text = markdown.turndown(roots.toArray().map(el => $.html(el)).join('\n\n')).trim();
  if (text.length < 100) return null;
  // A TOC without its linked sections is an incomplete extraction.
  const anchors = roots.find('a[href*="#"]').toArray().filter(el => {
    const href = $(el).attr('href') ?? '';
    try { return new URL(href).pathname === `/s/articles/${id}`; } catch { return false; }
  });
  const missing = anchors.filter(el => {
    const hash = new URL($(el).attr('href')).hash.slice(1);
    return hash && !roots.find('[id], [name]').toArray().some(n => $(n).attr('id') === hash || $(n).attr('name') === hash);
  });
  if (anchors.length >= 3 && missing.length === anchors.length && plain.length < 1500) return null;
  const article = {
    id, url: normalizeArticleUrl(`https://support.clever.com/s/articles/${id}`).url,
    title, text, audience: /^For ([^:]+):/i.exec(title)?.[1] ?? null,
    language: 'en_US', indexedAt, sourceUpdatedAt: null, bodyComplete: true,
  };
  // A source date is only recorded when explicitly published as article metadata.
  const sourceDate = $('meta[property="article:modified_time"]').attr('content');
  if (sourceDate && Number.isFinite(Date.parse(sourceDate))) article.sourceUpdatedAt = new Date(sourceDate).toISOString();
  return { ...article, revision: articleRevision(article) };
}

export function acceptArticle(previous, next) {
  if (!next) return false;
  // A dramatic shrink can be a loading shell or missing procedure: retain the
  // last good copy until a later successful crawl or reviewed source deletion.
  return !(isCompleteArticle(previous) && previous.text.length > 1000 && next.text.length < previous.text.length * 0.5);
}
