import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy policy — ClaimBack" },
    { name: "description", content: "How ClaimBack handles your health and claim data." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:title", content: "Privacy policy — ClaimBack" },
    { property: "og:description", content: "Your data, your control." },
  ] }),
  component: () => (
    <article className="container-page max-w-2xl space-y-5 py-12">
      <h1 className="text-3xl">Privacy policy</h1>
      <p>We collect only what's needed to analyse your claim: your email, claim details and the documents you upload.</p>
      <h2 className="text-xl">How we use it</h2>
      <p>To produce your analysis and appeal letter. We do not sell or share your data for marketing.</p>
      <h2 className="text-xl">Your rights</h2>
      <p>In line with India's Digital Personal Data Protection Act, 2023, you can access, correct or delete your data at any time.</p>
      <h2 className="text-xl">Contact</h2>
      <p>Write to our grievance officer at privacy@claimback.in.</p>
    </article>
  ),
});
