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
      <p className="text-sm text-muted-foreground">Last updated: [DATE]</p>
      <h2 className="text-xl">What we collect</h2>
      <p>Your email address, the claim documents you upload (insurer letters, policy, bills, discharge summaries), the analysis we produce, your appeal letter, and payment reference numbers you submit.</p>
      <h2 className="text-xl">How we use it</h2>
      <p>Only to analyse your claim and draft your appeal letter. Documents are processed by an AI service to read them. We do not sell your data or use it for marketing.</p>
      <h2 className="text-xl">Who can see it</h2>
      <p>Only you. Our admin can see payment references and overall counts, not your documents or analysis.</p>
      <h2 className="text-xl">How long we keep it</h2>
      <p>Uploaded documents are deleted automatically 30 days after your claim is analysed. Your analysis and letter stay until you delete them.</p>
      <h2 className="text-xl">Deleting your data</h2>
      <p>Use “Delete my data” on any claim to permanently remove the claim, its documents, analysis and letter.</p>
      <h2 className="text-xl">Your rights</h2>
      <p>Under India’s Digital Personal Data Protection Act, 2023, you can access, correct or erase your data and withdraw consent.</p>
      <h2 className="text-xl">Contact</h2>
      <p>Grievance officer: [NAME], [EMAIL], [ADDRESS].</p>
    </article>
  ),
});
