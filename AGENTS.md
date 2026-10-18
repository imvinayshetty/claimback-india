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
- Persist processing status and a per-claim analysis lease before document analysis; results poll durable status and render saved analysis, avoiding duplicate runs.
- Analysis rate limits are counted from the analysis_runs table and PDF page limits use pdf-lib in shared rules, so client and server enforce the same values.
- Payment and letter-quota columns on claims are writable only by the server (admin client) via DB triggers; owners cannot self-approve payment.
