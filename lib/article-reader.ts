import { readIndexedArticle } from './article-contract.mjs';
import { articleStorageAvailable, getArticleByUrl } from './search';

export async function readArticle(args: { url: string; offset?: number; revision?: string }) {
  return readIndexedArticle(args, { available: articleStorageAvailable, lookup: getArticleByUrl });
}
