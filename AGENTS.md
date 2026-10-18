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
