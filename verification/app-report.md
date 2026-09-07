# App and infrastructure verification — September 7, 2026

- Public production homepage renders its chat interface.
- A teacher password-reset question completed through eve, with cited answer and cost.
- The resulting inquiry appeared in the new Neon-backed Inquiries page (one test inquiry; no old history imported).
- Browser logs contained no application errors. A prior Vercel login-page FedCM warning was unrelated to the app.
- Vercel runtime error-log query returned no errors.
- Production domain is public; preview and deployment-specific URLs retain Vercel authentication.
- All four cron definitions are registered: daily KB refresh at 08:00 UTC, ten-minute judge and segmentation, daily report at 09:00 UTC.
- The deployed KB cron was triggered with its configured secret and returned HTTP 200 after approximately 77 seconds. After the Blob cache propagation interval, its publication date advanced to 2026-09-07T15:05:12.797Z. Coverage remained 532 complete articles / 534 searchable entries.
- Two legacy bodies remain unverified and fail full-article reads explicitly. Ten discovery/fetch failures are listed in the refresh status; prior bodies and dates are preserved.
- Clever owns the project, Blob store, Neon database and model/runtime billing. Production source is codex/clever-support-mcp; the old main branch and personal production project are unchanged.
