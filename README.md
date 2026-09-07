# Clever Support

Clever-owned support app: Next.js frontend, eve agent, and a stateless MCP endpoint
at `/api/mcp`. The phone demo should use `search_clever_kb` followed by
`read_clever_article`. `ask_clever_support` remains available to existing clients.
See [MCP.md](MCP.md) for the tool contract and [MIGRATION.md](MIGRATION.md) for ownership.

## Development

Use Node 24. `npm ci`, then `vercel link --scope tom-legers-projects --project clever-support`
and `vercel env pull .env.local`. Never point this checkout at the personal project.
Run `npm run dev`. `npm run typecheck` and `npm test` verify the code.

## Deployment

`vercel deploy --prod --scope tom-legers-projects` builds both services. The current
Vercel `services` configuration routes `/eve/*` and `/.well-known/workflow/*` to eve,
and other paths to Next.js. Local development uses eve's `withEve` proxy.
Do not revert to the retired `experimentalServices` configuration.

The private Blob store contains the KB snapshot and new shared conversations.
Neon holds inquiry/feedback/report records and creates its tables on first use.
Model calls use the Clever project's Vercel OIDC identity and AI Gateway billing.
No personal-account credentials or resources are required.

Environment variables: `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL` (or `POSTGRES_URL`),
`CRON_SECRET`; optional `MCP_API_KEY`, `JINA_API_KEY`, `KB_INDEX_TTL_MS` (default 600000).
Local Gateway calls can use the pulled `VERCEL_OIDC_TOKEN` or a Clever-owned
`AI_GATEWAY_API_KEY`. OIDC credentials expire; pull again when needed.
Discord credentials are optional and have not been copied from the personal demo.

## Corpus refresh

The eve schedule `agent/schedules/refresh-kb.ts` runs daily at **08:00 UTC**.
Run `npm run kb:refresh` manually after pulling Clever env vars. Both invoke the same
pipeline. Check `/api/kb/status` for the latest attempt, per-article failures, and
coverage; `/changelog` shows refresh history. Vercel cron/runtime logs show execution failures.

A single private `kb/snapshot-v2.json` contains article bodies, aligned vectors,
manifest and changelog. A refresh publishes it only after successful embedding.
Failed extractions retain prior articles and their original indexing dates. Legacy
entries without verified complete extraction remain searchable but are rejected by
the reader. Discovery omissions do not automatically delete known articles; confirmed
source removals require review. `kb/refresh-status.json` records attempts and failures.

Bodies retain Markdown headings, numbered lists, links, and tables. They are never
truncated for storage. Embedding/reranking budgets are separate. The reader paginates
at about 16000 UTF-16 code units. Warm processes cache the snapshot for ten minutes;
they can continue serving the last good snapshot during a transient storage outage.
Cold reads without storage fail explicitly. Responses report indexing provenance,
not a claim that the indexed article is live.

## Verification

`node scripts/verify-mcp.mjs https://YOUR-HOST/api/mcp` checks the deployed transport,
all three tools, structured results, the teacher password procedure, error cases,
and retrieval latency. Results go in `verification/` without secrets.
