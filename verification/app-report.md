# App and infrastructure verification — September 7, 2026

- Public production homepage renders its chat interface.
- A teacher password-reset question completed through eve, with cited answer and cost.
- The resulting inquiry appeared in the new Neon-backed Inquiries page (verification inquiries only; no old history imported).
- Browser logs contained no application errors. A prior Vercel login-page FedCM warning was unrelated to the app.
- Vercel runtime error-log query returned no errors.
- Production domain is public; preview and deployment-specific URLs retain Vercel authentication.
- All four cron definitions are registered: daily KB refresh at 08:00 UTC, ten-minute judge and segmentation, daily report at 09:00 UTC.
- The deployed KB cron was triggered with its configured secret and returned HTTP 200 after approximately 77 seconds. After the Blob cache propagation interval, its publication date advanced to 2026-09-07T15:05:12.797Z. Coverage remained 532 complete articles / 534 searchable entries.
- Two legacy bodies remain unverified and fail full-article reads explicitly. Ten discovery/fetch failures are listed in the refresh status; prior bodies and dates are preserved.
- Clever owns the project, Blob store, Neon database and model/runtime billing. Production source is codex/clever-support-mcp; the old main branch and personal production project are unchanged.

- The updated browser agent used `read_support_article` and returned the Student Tools → Set new password procedure with the district prerequisite.
- The official MCP SDK regression test validates both successful article pages and structured errors against the advertised output schema.
- Production verification with the official MCP SDK passed for normal article reads and every documented structured error, including a null offset.
- A synthetic conversation was written to the new private Blob store and rendered successfully through its public share page.
