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
      <h1 className="text-3xl">Terms of use</h1>
      <p>ClaimBack provides general information and drafting assistance. It is not legal advice and does not create a lawyer–client relationship.</p>
      <p>You are responsible for checking the accuracy of any letter before sending it. Outcomes depend on your insurer and policy terms; we cannot guarantee results.</p>
      <p>We are not affiliated with IRDAI, any insurer or the Insurance Ombudsman.</p>
    </article>
  ),
});
