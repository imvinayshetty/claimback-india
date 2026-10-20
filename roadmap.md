# ClaimBack private storage setup
# Production login correction
- [x] Send login links to https://claimback-india.vercel.app/login; unit tests and intercepted browser request confirm destination and expired-link recovery.
- [ ] Verify inbox link lands on Vercel: owner must add https://claimback-india.vercel.app to Site URL and Redirect URLs (Cloud → Users → Auth settings → Advanced) and redeploy Vercel.
- [ ] Include numeric codes in auth email: default managed template currently sends links; custom auth templates require an owner-verified sending domain.

- [x] Create claims, claim_files, admins and owner-only policies.
- [x] Create private claim-docs bucket and add the supplied admin email.
- [x] Connect sign-in, claims, uploads, results and admin access.
- [x] Verify owner isolation and report created policies.

# Three-step claim submission
- [x] Add required letter/policy uploads, optional extras, consent and 10 MB validation.
- [x] Store private documents and process claims with document-based analysis.
- [x] Show polling progress, failure states and document deletion.
- [x] Test submission rules and verify a real PDF/image analysis call.
- [x] Verify signed-in submission, polling and deletion end-to-end.

# Full code-review follow-up
- [x] Close unpaid letter exposure, expire analysis leases, support safe retries, and purge failed uploads.
- [x] Verify PDF text quotes and exclude unsupported quotations from letter drafting.
- [x] Harden owner mutations, atomic quotas, aggregate uploads, and unique payment references; refund failed letter slots.
- [x] Correct privacy disclosures and sourced escalation guidance; prevent payments until launch prerequisites are supplied.
- [x] Verify live grants/policies and existing daily schedule, regression tests and signed-in upload/results/deletion/admin-denial flows; evaluate synthetic AI letter and document examples.
- [ ] Production email delivery and redirect settings: pending owner sending domain and published address; hosted auth-setting read not available through current tools.
- [ ] Launch prerequisites: owner QR, legal identity/contact/refund/jurisdiction decisions, legal review and production email/domain settings.
# Second review follow-up
- [x] Normalize quote matching, search all pages, report real page ranges, and add close-match probes.
- [x] Repair transient retry classification and remove stale success fields; backfill unpaid letters.
- [x] Add blank scanned-policy transcription fallback with explicitly unverified OCR matches; verify live on image-only PDF.
- [x] Commit 20-case synthetic probes and repeatable harness; preserve 20 live outputs (18 fully grounded, two citation-decorated strings withheld).
- [x] Run hosted security tests without default skipping, confirm active daily cleanup, and verify signed-in submission/results/deletion/admin-denial.
- [ ] Durable analysis startup: blocked on supported background worker integration; authenticated inline request and five-minute recovery remain.

# New code and live-site review
- [ ] Correct document-upload and provider-sharing copy; remove the public Admin link.
- [ ] Display checked physical quote pages instead of raw model page labels.
- [ ] Make the production login destination configurable while preserving the Vercel default.
- [ ] Add automatic source checks with hosted security verification kept separate.
- [ ] Verify the changed pages and record deployment/security findings.
- [ ] Access restriction or final legal pages: awaiting owner decision and reviewed legal details.
- [ ] External operations: Vercel settings/headers/runtime/cron, production email and CAPTCHA credentials, spend-budget decision, monitoring service and durable-workflow connection require owner setup.
- [ ] Optional product changes: user-confirmed quotes, feedback consent and broader labelled evaluations require explicit approval; automatic analysis/letter expiry conflicts with the current retention requirement.
