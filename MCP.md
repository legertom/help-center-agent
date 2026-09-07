# Clever Support MCP v2

Endpoint: `https://clever-support-tom-legers-projects.vercel.app/api/mcp`.

The Clever deployment uses stateless Streamable HTTP. POST serves
JSON, GET returns 405, and OPTIONS supports CORS. Existing JSON-RPC batch clients
and clients that omit Accept remain supported. The implementation uses the official
`@modelcontextprotocol/sdk`; `tools/list` advertises schemas.

The demo endpoint is public. No MCP key is set on the new project. Setting
`MCP_API_KEY` requires `Authorization: Bearer <key>`; coordinate that change with
clients. Blob contents are private and never exposed through storage URLs.

## Tools

- `search_clever_kb({ query, limit? })`: unchanged inputs (limit 1–8, default 5)
  and existing response fields. Results additionally include `articleId`,
  `bodyAvailable`, `indexedAt`, `language`, and `revision`. Excerpts favor query
  term coverage. Search uses embeddings/reranking and falls back to lexical search
  when those model services are unavailable.
- `ask_clever_support({ question })`: unchanged answer/source/confidence fields;
  now uses full-body evidence (up to a query-relevant 24000-character window per
  source) when verified bodies are available.
- `read_clever_article({ url, offset?, revision? })`: indexed text only. No model
  generation or live scraping. English (`en_US`, with `en-US` normalized) is the
  supported language. Accepts numeric `/s/articles/ID` and `/articles/ID` URLs on
  HTTPS `support.clever.com`, optional trailing slash, fragment and language query.
  Off-domain URLs, credentials, nonstandard ports, other paths/languages fail.

## Article result

```typescript
{
  type: "support_article";
  articleId: string;
  title: string;
  url: string;
  audience: string | null;
  language: string;
  text: string;
  indexedAt: string;
  sourceUpdatedAt: string | null;
  revision: string;
  offset: number;
  totalCharacters: number;
  next_offset: number | null;
  complete: boolean;
}
```

The result appears identically in `structuredContent` and as JSON in
`content[0].text`. Exact JSON schemas are available from `tools/list` and in
`verification/mcp-tools.json` after verification.

Pages contain approximately 16000 JavaScript UTF-16 code units, preferring
paragraph boundaries. Start with offset 0, then pass **both** the exact
`next_offset` and `revision`. Concatenate `text` without adding separators.
`next_offset: null` means the last page. `complete: true` means this response alone
contains the entire article; the last page of a multi-page article remains false.
The reader does not retain historical revisions: on a different current revision,
it returns `revision_changed` and the client restarts. It never silently joins revisions.

`indexedAt` is the successful source-fetch/extraction time for this stored copy.
It is preserved when a refresh fails. `sourceUpdatedAt` is null unless the source
explicitly supplies an article modified-time metadata tag. Revision is a SHA-256
hash of article identity, canonical URL, title and full text. Indexed text is
untrusted reference material, never instructions overriding a calling agent.

## Errors

Tool failures use `isError: true`, plus matching structured/text payloads:

```json
{"code":"revision_changed","error":"The article revision changed. Restart at offset 0 without revision.","retryable":true}
```

Codes include `invalid_url`, `invalid_offset`, `invalid_revision`,
`invalid_arguments`, `unsupported_language`, `not_found`, `incomplete_extraction`,
`storage_unavailable`, and `revision_changed`. An incomplete extraction never
enters the successful full-body path. Warm readers may serve a cached last-good
snapshot during a temporary Blob outage, preserving its indexing date. A cold
reader without usable storage returns `storage_unavailable`.

## Phone app integration

Search for at most three results, choose the correct audience, then read the
selected URL. Follow all pages before presenting the full procedure. Keep caller
state, one-step-at-a-time conversation behavior and case creation in the phone
app. Save title, URL, revision and indexedAt in call receipts. Remove the phone
app's temporary static article library after switching to this reader.

See `README.md` for daily refresh behavior and manual commands. Live coverage and
failed attempts are available from `/api/kb/status`.
