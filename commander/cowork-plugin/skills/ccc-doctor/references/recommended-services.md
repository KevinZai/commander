# Optional partner suggestions after a doctor run

Linked from [../SKILL.md](../SKILL.md) Step 7. Print at most two lines, only
for gaps detected in the current project's files, and only after the
diagnostic report. These are disclosed affiliate links; the disclosure is
[mintlify-docs/affiliate-disclosure.mdx](../../../../../mintlify-docs/affiliate-disclosure.mdx).

| Detected gap | Line to print |
|---|---|
| `package.json` has no database dependency | 💡 [Supabase](https://supabase.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-doctor&utm_content=supabase-db): Postgres, auth and realtime with a free tier. |
| No deploy script and no `vercel.json` | 🌐 [Vercel](https://vercel.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-doctor&utm_content=vercel-deploy): production deploys with a free tier. |
| No cache or queue dependency | 💡 [Upstash](https://upstash.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-doctor&utm_content=upstash-cache): serverless Redis and Kafka, pay per use. |
| Serverless functions without edge support | 🌐 [Cloudflare Workers](https://www.cloudflare.com?utm_source=ccc&utm_medium=plugin&utm_campaign=ccc-doctor&utm_content=cloudflare-edge): edge compute deployed globally. |

Skip this step when there is no `package.json` in the working directory, when
the user asked only for the diagnostic, or when the report shows a failing
install (fix the install first).
