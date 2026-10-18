# Synthetic review harness

No private health data or owner opt-in is used. The 20 quote cases in `src/lib/quote-eval-cases.ts` cover numbering, typography, page boundaries, unsupported text and scans.

- `bun scripts/evaluate-claims.ts`: deterministic 20-case matcher evaluation, no AI cost.
- `bun scripts/evaluate-claims.ts --live --limit=20`: sequential bounded evaluation of 20 synthetic insurer/policy PDF pairs against the app's actual analysis prompt. Requires the existing server-held AI key and incurs AI usage. Stops at the first gateway error; never retries denials or swaps models.
- `bunx vitest run`: regular probes and offline migration-security contracts.
- `bunx vitest run src/test/security.integration.test.ts`: additionally checks hosted security when the managed database test connection is present. Hosted checks are separate from offline contracts.

Review `live-report.json`: each synthetic output includes saved analysis, exact amount checks, and grounded quoted-clause counts using the same matcher. Inspect all 20 outputs before a pilot; passing quote/amount metrics do not establish legal accuracy, completeness or clinical relevance. Reports include only synthetic content.

Scanned transcription is AI-assisted OCR, not independent ground truth. Its matches are explicitly close/unverified, never automatically admitted to a letter. Review scanned policy wording manually before sending any appeal.
