import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "Terms of use — ClaimBack" },
    { name: "description", content: "Terms for using ClaimBack." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:title", content: "Terms of use — ClaimBack" },
    { property: "og:description", content: "Drafting help, not legal advice." },
  ] }),
  component: () => (
    <article className="container-page max-w-2xl space-y-5 py-12">
      <p className="rounded-xl bg-warning/10 p-3 text-sm">Draft placeholder — to be reviewed before launch.</p>
      <h1 className="text-3xl">Terms of use</h1>
      <p className="text-sm text-muted-foreground">Last updated: 18 October 2026 (draft)</p>
      <h2 className="text-xl">What ClaimBack is</h2>
      <p>ClaimBack provides general information and drafting assistance. It is not legal advice and does not create a lawyer–client relationship. We are not affiliated with IRDAI, any insurer or the Insurance Ombudsman.</p>
      <h2 className="text-xl">Your responsibilities</h2>
      <p>You must check every fact, amount and quoted clause against your own documents before sending a letter. Only upload documents you are entitled to share.</p>
      <h2 className="text-xl">No guarantee</h2>
      <p>Outcomes depend on your insurer and policy terms; we cannot guarantee any result.</p>
      <h2 className="text-xl">Payments</h2>
      <p>Payments are currently disabled. The proposed appeal-letter unlock price is ₹599 per claim; no payment should be sent until payment details and these terms have been reviewed. Refund policy: [TO BE DECIDED].</p>
      <h2 className="text-xl">Liability</h2>
      <p>[LIABILITY LIMITATION TO BE REVIEWED]</p>
      <h2 className="text-xl">Governing law</h2>
      <p>These terms are governed by the laws of India. Courts at [CITY] have jurisdiction.</p>
      <h2 className="text-xl">Contact</h2>
      <p>Questions about these terms: <a className="underline" href="mailto:supportatclaimback@gmail.com">supportatclaimback@gmail.com</a>.</p>
    </article>
  ),
});
