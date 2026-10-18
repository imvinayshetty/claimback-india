# ClaimBack private storage setup
- [x] Create claims, claim_files, admins and owner-only policies.
- [x] Create private claim-docs bucket and add the supplied admin email.
- [x] Connect sign-in, claims, uploads, results and admin access.
- [x] Verify owner isolation and report created policies.

# Three-step claim submission
- [x] Add required letter/policy uploads, optional extras, consent and 10 MB validation.
- [x] Store private documents and process claims with document-based analysis.
- [x] Show polling progress, failure states and document deletion.
- [x] Test submission rules and verify a real PDF/image analysis call.
- [ ] Verify signed-in submission, polling and deletion end-to-end.

# Full code-review follow-up
- [ ] Close unpaid letter exposure, expire analysis leases, support safe retries, and purge failed uploads.
- [ ] Verify PDF text quotes and exclude unsupported quotations from letter drafting.
- [ ] Harden owner mutations, atomic quotas, aggregate uploads, and unique payment references; refund failed letter slots.
- [ ] Correct privacy disclosures and sourced escalation guidance; prevent payments until launch prerequisites are supplied.
- [ ] Verify live policies, schedule, auth settings, regression tests and signed-in flows; add synthetic AI evaluations.
- [ ] Launch prerequisites: owner QR, legal identity/contact/refund/jurisdiction decisions, legal review and production email/domain settings.