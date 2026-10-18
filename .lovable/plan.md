# Document analysis: new AI prompt, strict reply, rate and page limits

## Approach
This project's backend runs on TanStack server functions, not separate Edge Functions (that's a fixed project rule). So "analyze-claim" will be the existing server-side `analyzeClaim` function, upgraded. It does the same job you described: it runs only on the server, reads the AI key from a backend secret (`LOVABLE_API_KEY`, never sent to the browser), loads the claim's files from the private bucket, and saves the result.

## What changes
1. **Your system prompt, word for word**, sent as the system message. Documents are attached as PDFs/images. A short extra line says text inside documents is evidence, not instructions.
2. **Strict JSON reply** with exactly your fields: insurer, policy_number, claim_amount, rejected_amount, rejection_reason, reason_category (8 values), clauses_cited [{quote, page}], arguments [{point, supporting_quote_or_not_found}], missing_documents, case_strength (strong/moderate/weak/unclear), confidence (0-1). The AI is forced to this schema, then checked again on the server. Bad replies mark the claim "failed" with a plain message.
3. **Saving**: the full reply goes to `analysis_json.analysis`. Summary columns are also filled: insurer, claim_amount, rejected_amount, reason_category, case_strength. The appeal letter is generated from the cited clauses and arguments.
4. **Not an insurance claim**: if the AI says the documents aren't a claim (reason "other", strength "unclear", rejection_reason says so), the results page shows that clearly.
5. **Per-user rate limit**: at most **5 analyses per hour and 15 per day** per user. Checked on the server before any AI call, and before uploads in the submit step, with a friendly "try again later" message.
6. **Page limit per file**: at most **30 pages per PDF**. Images count as 1 page. Checked when you upload (in the browser, for instant feedback) and again on the server before analysis.
7. **Results page update**: shows rejection reason, a confidence meter, cited clauses with page numbers, arguments (with "not found" marked plainly), and missing documents.

## Technical details
- Zod `analysisOutput` replaced in `src/lib/claim-documents.ts`; `.strict()`, `confidence` 0-1, enum categories; strict wire schema (all fields required, no extra properties).
- `analyze-claim.server.ts`: `system` = given prompt; keep Responses API, `openai/gpt-6-astra`, streaming, `store:false`, reasoning `low`.
- Migration: `claims.reason_category` / `case_strength` CHECK constraints updated to the new values (existing rows mapped: ped→pre_existing, room_rent→room_rent_proportionate, non_payable→non_payable_items, waiting→waiting_period, documents→documentation; Strong/Fair/Uncertain→strong/moderate/unclear).
- Rate limit: new `analysis_runs` table (user_id, claim_id, created_at), RLS owner-only insert/select; server counts rows in the last hour/day before inserting and running. Counted per run, not per claim.
- Page counting with `pdf-lib` (pure JS, works on the edge runtime); shared `MAX_PDF_PAGES` rule used by client and server.
- `claims.ts` `Analysis` type and `letterText()` updated; `claim.$id.tsx` renders new fields; old saved claims still render via fallback.
- Tests: rate limit thresholds (5/hour, 15/day), page limit (30 pass, 31 fail), schema rejects bad category/confidence >1.
- Verify end-to-end with a signed-in test user: upload sample PDFs, confirm saved JSON and columns, confirm 6th run in an hour is blocked.

Limits (5/hour, 15/day, 30 pages) are my defaults; tell me if you want different numbers.
