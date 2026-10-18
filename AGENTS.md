<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Claims use authenticated server mutations with validated-session ownership and RLS-scoped reads; this prevents submitted owner IDs from affecting access.
- Store ancillary claim form fields in analysis_json.input to preserve the requested table schema.
- Keep admin membership checks server-side and restricted to /admin; membership does not bypass owner-only access.
- Document paths use user UUID/claim UUID/file to align private Storage policies with claim ownership.
- Document submission and analysis use authenticated TanStack server functions, not separate Edge Functions, to preserve the supported runtime and validate ownership.
- Validate document requirements and file sizes through shared rules on both client and server; a private bucket limit adds storage enforcement.
- Reserve analysis with a database-atomic timed lease and run counter; stale results cannot overwrite a replacement lease, and results reads expire interrupted work.
- Analysis rate limits are counted from the analysis_runs table and PDF page limits use pdf-lib in shared rules, so client and server enforce the same values.
- All claim/file mutations and uploads use privileged clients only after validated ownership; authenticated clients retain owner-scoped reads but no direct writes, preventing workflow and retention tampering.
- Policy evidence extraction is server-only; normalize and search PDF text across physical pages, but AI-assisted scanned transcription and fuzzy matches never independently verify letter quotations.
- Unpaid claims contain no letter text; payment availability is a server-enforced launch gate, and transaction references are uniquely indexed.
- Submission quotas are database-atomic and retained separately from deletable claims; failed letter-generation reservations are refunded atomically.
- Retention uses analysis completion or upload time when analysis never completes, including failed claims; keep the managed daily cleanup schedule.
- Synthetic evaluation scripts reuse the production analysis prompt and matcher, stop on a gateway failure and retain only synthetic reports, so review never exposes owner-private claims.
