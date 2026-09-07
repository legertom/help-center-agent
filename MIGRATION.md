# Clever deployment ownership

The new project is `clever-support` in **Tom Leger's Clever projects**
(`team_WCJP0Yaa0bLQrsP09BoQGs92`).

- Project: `prj_boGUemZroNfa2aypoIFonjzxB137`
- Production: `https://clever-support-tom-legers-projects.vercel.app`
- MCP: `https://clever-support-tom-legers-projects.vercel.app/api/mcp`
- Private Blob: `clever-support-content` (`store_qrlAhFW4KXKVc7RF`, iad1)
- Neon: `clever-support-db` (`store_kWDDXKlv7ECFybHq`, iad1)
- AI Gateway and eve Workflow/Sandbox: the new project's Clever OIDC identity
- Cron secret: newly generated, stored only in project environment settings

Inquiry, feedback and share history start fresh, as requested. No credentials,
Blob store, database, model key, domain or webhook from the personal Vercel
project was copied or reused. The GitHub source repository is still
`legertom/help-center-agent`, with Clever production on `codex/clever-support-mcp`.
The old `main` branch is unchanged. Deleting the old **Vercel project** does not delete
this repository.

The old Vercel project has not been modified or deleted. Once phone-demo clients
use the new MCP URL and the new deployment is verified, the old Vercel deployment
is not required by this app. Any clients still using its old URL would stop working
if it is deleted. Do not delete shared resources used by unrelated personal apps.
No old Discord credentials were copied; Discord integration is not part of this
new deployment's verified scope.

See `verification/` for deployed MCP examples, schemas, errors and measurements,
and `README.md` for refresh operations. The new reader returns a real error for
the two legacy-only entries until a complete source extraction succeeds.

Production access was explicitly approved by the user. Vercel login remains on
preview and deployment-specific URLs (`prod_deployment_urls_and_all_previews`).
The production domain is public and MCP has no bearer-key requirement.

Initial live verification passed: all three MCP tools, exact 11-page article
reconstruction, source procedures, structured/text equivalence and explicit errors.
First indexed read: 776 ms (function coldness not independently guaranteed). Five
warm reads: 53–111 ms including network round trip. Nine automated tests and
TypeScript checks pass; the patched dependency audit reports zero vulnerabilities.
