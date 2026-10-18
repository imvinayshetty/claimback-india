# Synthetic review harness

No private health data or owner opt-in is used. The 20 quote cases in `src/lib/quote-eval-cases.ts` cover numbering, typography, page boundaries, unsupported text and scans.

- `bun scripts/evaluate-claims.ts`: deterministic 20-case matcher evaluation, no AI cost.
- `bun scripts/evaluate-claims.ts --live --limit=20`: sequential bounded evaluation of 20 synthetic insurer/policy PDF pairs against the app's actual analysis prompt. Requires the existing server-held AI key and incurs AI usage. Stops at the first gateway error; never retries denials or swaps models.
- `bunx vitest run`: regular probes and offline migration-security contracts.
- `bunx vitest run src/test/security.integration.test.ts`: checks hosted security using the managed database test connection, or the authenticated Lovable CLI when that connection is absent. Missing both fails the test rather than silently skipping it. Hosted checks are separate from offline contracts.

Review `live-report.json`: each synthetic output includes saved analysis, exact amount checks, and grounded quoted-clause counts using the same matcher. Inspect all 20 outputs before a pilot; passing quote/amount metrics do not establish legal accuracy, completeness or clinical relevance. Reports include only synthetic content.

Scanned transcription is AI-assisted OCR, not independent ground truth. Its matches are explicitly close/unverified, never automatically admitted to a letter. Review scanned policy wording manually before sending any appeal.

## Review on 18 October 2026

- Offline matcher: 20/20 probes passed. Hosted security test ran and passed; cleanup schedule was confirmed active at 21:30 UTC daily (03:00 India time).
- First 20 synthetic AI outputs: 18/20 fully grounded; every output had correct claim/rejected amounts. Outputs 4 and 9 included citation decorations in supporting-quote strings; the strict matcher withheld these strings instead of incorrectly verifying them. The report preserves both failures for review; it is not a legal-quality certification.
- Image-only PDF transcription was tested live: page 1 transcribed and the known clause classified `close_match`, never `verified`.
- Signed-in submission, saved results, payment hold, deletion and non-admin denial were verified without runtime errors.
- Durable analysis startup remains unavailable without a supported background worker integration; the existing authenticated request and five-minute recovery lease are retained. Closing the tab can still interrupt work. Blank pages have transcription fallback; partially garbled text extraction remains a manual-review limitation.
