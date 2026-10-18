import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy policy — ClaimBack" },
    { name: "description", content: "How ClaimBack collects, uses, stores and deletes your health and claim data." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:title", content: "Privacy policy — ClaimBack" },
    { property: "og:description", content: "Your data, your control." },
  ] }),
  component: () => (
    <article className="container-page max-w-2xl space-y-5 py-12">
      <p className="rounded-xl bg-warning/10 p-3 text-sm">Draft placeholder — to be reviewed before launch.</p>
      <h1 className="text-3xl">Privacy policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: 18 October 2026 (draft)</p>
      <h2 className="text-xl">What we collect</h2>
      <p>Your email address, the claim documents you upload (insurer letters, policy, bills, discharge summaries), the analysis we produce, your appeal letter, and payment reference numbers you submit.</p>
      <h2 className="text-xl">How we use it</h2>
      <p>Only to analyse your claim and draft your appeal letter. Documents are processed through Lovable’s AI Gateway using an OpenAI model. Lovable Cloud provides storage and sign-in. These providers and their subprocessors may process data outside India. Final processor locations, contractual safeguards and vendor retention terms require operator review before launch. We do not sell your data or use it for marketing.</p>
      <h2 className="text-xl">Who can see it</h2>
      <p>Other app users cannot access your claims. The admin page shows payment references and overall counts, not your documents or analysis. Authorised service operators and infrastructure/AI providers can technically access data as necessary to deliver, secure and support the service; access is not limited to you alone.</p>
      <h2 className="text-xl">How long we keep it</h2>
      <p>Uploaded documents are deleted by a daily cleanup job once 30 days have elapsed after analysis; if analysis never completes, the 30 days run from upload. Cleanup may occur up to one day after that deadline. Your analysis and letter stay until you delete them.</p>
      <h2 className="text-xl">Deleting your data</h2>
      <p>Use “Delete my data” on any claim to permanently remove the claim, its documents, analysis and letter.</p>
      <h2 className="text-xl">Your rights</h2>
      <p>You can view and delete your claims and withdraw consent for further processing by deleting them. Statutory rights and applicable obligations under India’s data protection law must be confirmed in the final legal review. Deletion from active app storage does not establish immediate deletion from provider backups or logs; their retention needs operator review.</p>
      <h2 className="text-xl">Contact</h2>
      <p>Grievance officer: [NAME], [EMAIL], [ADDRESS].</p>
    </article>
  ),
});
