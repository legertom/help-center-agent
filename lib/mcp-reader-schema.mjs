import { z } from 'zod';

const articleSuccess = z.object({
  type: z.literal('support_article'), articleId: z.string(), title: z.string(), url: z.string(),
  audience: z.string().nullable(), language: z.string(), text: z.string(), indexedAt: z.string(),
  sourceUpdatedAt: z.string().nullable(), revision: z.string(), offset: z.number().int().nonnegative(),
  totalCharacters: z.number().int().positive(), next_offset: z.number().int().nonnegative().nullable(), complete: z.boolean(),
});
const articleFailure = z.object({ code: z.string(), error: z.string(), retryable: z.boolean() });
const result = z.union([articleSuccess, articleFailure]);
// MCP requires an object root. Publish both result branches so SDK clients can
// validate structured tool errors as well as successful article pages.
export const readerOutput = z.object({ ...articleSuccess.partial().shape, ...articleFailure.partial().shape })
  .superRefine((value, ctx) => {
    if (!result.safeParse(value).success) ctx.addIssue({ code: 'custom', message: 'Expected an article page or retrieval error.' });
  })
  .meta({ anyOf: [z.toJSONSchema(articleSuccess), z.toJSONSchema(articleFailure)] });
