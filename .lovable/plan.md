# Appeal letter generation + UPI unlock flow

## Approach
This project runs server logic as TanStack server functions, not separate Edge Functions (fixed project rule). "generate-letter" will be a server-side `generateLetter` function doing exactly what you described. The AI key stays on the server.

## 1. Unlock screen (new page: /claim/:id/unlock)
- Shows "Unlock your appeal letter — ₹599", your UPI QR image, and short steps (scan, pay ₹599, enter transaction ID).
- Form: UPI transaction ID (12-digit UTR style, letters/numbers allowed, 8-35 characters). Submitting marks the claim **payment pending** and shows "We're checking your payment. This usually takes a few hours."
- Users can resubmit if their ID was rejected; they cannot mark themselves paid.
- Until you upload the QR, a clearly labelled placeholder shows. When you upload it in chat, I'll drop it in.
- "Unlock appeal letter" on the results page goes here. Paid claims go straight to the letter.

## 2. Admin approvals (/admin)
- New "Pending payments" list showing only payment info: transaction ID, ₹599, submitted date, user email, short claim ID. No health or document details.
- Buttons: **Approve** (sets paid = true) and **Reject** (user sees "We couldn't confirm your payment" and can resubmit).
- Admin check happens on the server; only you (admins table) can approve.

## 3. Letter page (/claim/:id/letter), paid claims only
- Unpaid: redirected to the unlock screen. Server also refuses to generate for unpaid claims.
- Small form for your details: full name, policy number, claim number, admission/discharge dates, date of rejection letter (pre-filled from the analysis where known; all optional).
- "Generate letter" calls the AI with only the saved analysis + these details and your rules: never invent facts/clauses/amounts, [PLACEHOLDER] for gaps, polite and firm, numbered grounds, ends with the requested resolution.
- Result in an editable box with Save, Copy, and Print / Save as PDF (print layout shows only the letter).
- Below it, the **escalation checklist** with tickboxes: insurer Grievance Officer, IRDAI Bima Bharosa portal, Insurance Ombudsman, Consumer Commission, each with a one-line "when and how".
- Regenerate allowed (overwrites unsaved edits after confirming); limited to 10 generations per claim.

## Technical details
- Migration on `claims`: add `payment_status` text default 'none' CHECK in (none, pending, approved, rejected), `payment_txn_id` text, `payment_submitted_at` timestamptz, `letter_generations` int default 0. Lock down owner updates so users cannot change `paid`, `payment_status` (except none/rejected -> pending via server fn), or `letter_generations`: a BEFORE UPDATE trigger rejecting changes to these columns unless done by service_role. Existing grants will be checked first and narrowed if needed.
- Server fns (`src/lib/payments.functions.ts`): `submitPayment` (owner, sets pending via admin client after verifying ownership through RLS read), `adminPendingPayments` and `reviewPayment` (verify admins row via user's client, then load `supabaseAdmin` inside the handler; return only payment fields + email from auth admin API).
- `generateLetter` (`src/lib/letter.functions.ts` + `letter.server.ts`): requires `paid = true`; Responses API `openai/gpt-6-astra`, streamed, strict schema `{ letter: string, escalation: [{ step, when, how }] }`; saves `letter_text` and `analysis_json.escalation`; user details stored in `analysis_json.input`.
- Payment price ₹599 kept in a shared constant; tests: unpaid cannot generate, txn ID validation, users cannot set paid (trigger), generation cap 10.
- QR asset: `src/assets/upi-qr.*` once uploaded.
- Verify end-to-end: test user submits txn ID, admin approves, letter generates and saves.
