import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, LockKeyhole, Upload, X, LoaderCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { submitDocuments, analyzeClaim } from "@/lib/document-claims.functions";
import { countPdfPages, documentError, pageLimitError, validateDocuments, type DocumentKind } from "@/lib/claim-documents";
import { useAuth, SignInRequired } from "@/components/Auth";
import { Button } from "@/components/Button";

export const Route = createFileRoute("/new-claim")({
  head: () => ({ meta: [
    { title: "Upload your claim documents — ClaimBack" },
    { name: "description", content: "Securely submit your claim letter, policy and supporting documents for analysis." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    { property: "og:title", content: "Upload your claim documents — ClaimBack" },
    { property: "og:description", content: "A private three-step document submission for your health insurance appeal." },
  ] }), component: NewClaim,
});
const steps = [
  { kind: "rejection_letter" as const, title: "Your insurer’s letter", subtitle: "Upload the rejection or settlement letter", description: "The letter explaining why your claim was rejected or reduced.", accept: "application/pdf,image/jpeg,image/png,image/webp,image/gif", format: "PDF, JPG, PNG, WebP or GIF" },
  { kind: "policy" as const, title: "Your policy document", subtitle: "Upload your policy or schedule", description: "The PDF showing your coverage, limits and policy conditions.", accept: "application/pdf", format: "PDF only" },
  { kind: "other" as const, title: "Supporting documents", subtitle: "Add anything else that supports your claim", description: "Discharge summaries, hospital bills and other relevant records. This step is optional.", accept: "application/pdf,image/jpeg,image/png,image/webp,image/gif", format: "PDF, JPG, PNG, WebP or GIF" },
] as const;
function NewClaim() {
  const nav = useNavigate();
  const { user, ready } = useAuth();
  const submit = useServerFn(submitDocuments);
  const analyze = useServerFn(analyzeClaim);
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<Record<DocumentKind, File[]>>({ rejection_letter: [], policy: [], other: [] });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = steps[step] ?? steps[0];
  async function choose(selected: File[]) {
    setError("");
    for (const file of selected) {
      let message = documentError(file, current.kind);
      if (!message && file.type === "application/pdf") {
        try { message = pageLimitError(await countPdfPages(await file.arrayBuffer())); } catch (e) { message = e instanceof Error ? e.message : "This PDF could not be read."; }
      }
      if (message) { setError(message); return; }
    }
    setFiles((previous) => ({ ...previous, [current.kind]: current.kind === "other" ? [...previous.other, ...selected] : selected.slice(0, 1) }));
  }
  async function send() {
    if (!user || busy) return;
    setError("");
    try {
      const all = Object.entries(files).flatMap(([kind, group]) => group.map((file) => ({ kind: kind as DocumentKind, size: file.size, type: file.type })));
      validateDocuments(all, consent);
      setBusy(true);
      const form = new FormData();
      for (const [kind, group] of Object.entries(files)) for (const file of group) form.append(kind, file);
      form.append("consent", "true");
      const { id } = await submit({ data: form });
      // Keep the authenticated request alive while the result page polls durable status.
      void analyze({ data: { id } }).catch(() => {});
      await nav({ to: "/claim/$id", params: { id } });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not submit your documents."); setBusy(false); }
  }
  if (!ready) return <div className="container-page py-16">Loading…</div>;
  if (!user) return <SignInRequired />;
  if (busy) return <div className="container-page max-w-xl py-20 text-center" role="status"><LoaderCircle className="mx-auto animate-spin text-primary motion-reduce:animate-none" size={40} /><h1 className="mt-6 text-3xl">Uploading your documents</h1><p className="mt-3 text-muted-foreground">Your files are being saved privately. Please keep this page open.</p></div>;
  return <div className="container-page max-w-2xl py-10 sm:py-14">
    <p className="flex items-center gap-2 text-sm text-primary"><LockKeyhole size={16} />Private claim review</p>
    <h1 className="mt-3 text-3xl sm:text-4xl">Let’s check your claim</h1>
    <ol className="my-8 grid grid-cols-3 gap-3" aria-label="Submission steps">{steps.map((s, i) => <li key={s.kind} aria-current={i === step ? "step" : undefined} className={`border-t-2 pt-3 text-sm ${i <= step ? "border-primary text-primary" : "border-border text-muted-foreground"}`}><span className="flex items-center gap-2 font-semibold">{i < step ? <Check size={16} /> : <span>{i + 1}.</span>}{i === 0 ? "Letter" : i === 1 ? "Policy" : "Extras"}</span></li>)}</ol>
    <p className="text-sm text-muted-foreground">Step {step + 1} of 3 · {step < 2 ? "Required" : "Optional"}</p>
    <h2 className="mt-2 text-2xl">{current.title}</h2>
    <p className="mt-3 text-muted-foreground">{current.description}</p>
    <label className="mt-6 flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-input bg-card p-6 text-center focus-within:ring-2 focus-within:ring-ring" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); choose(Array.from(e.dataTransfer.files)); }}>
      <Upload className="text-primary" size={28} />
      <span className="font-semibold">{current.subtitle}</span>
      <span className="text-sm text-muted-foreground">{current.format} · Up to 10 MB per file</span>
      <input aria-label={current.subtitle} type="file" className="sr-only" accept={current.accept} multiple={step === 2} onChange={(e) => { void choose(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    </label>
    <ul className="mt-4 space-y-2">{files[current.kind].map((file, i) => <li key={`${file.name}-${i}`} className="flex min-w-0 items-center gap-3 rounded-lg border bg-secondary p-3"><FileText className="shrink-0 text-primary" size={22} /><div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div><Button aria-label={`Remove ${file.name}`} title="Remove document" className="shrink-0 rounded-md p-2 text-muted-foreground" onClick={() => setFiles((prev) => ({ ...prev, [current.kind]: prev[current.kind].filter((_, index) => index !== i) }))}><X size={18} /></Button></li>)}</ul>
    {step === 2 && <div className="mt-6 border-t pt-6"><p className="mb-4 text-sm text-muted-foreground">{files.rejection_letter.length + files.policy.length + files.other.length} documents ready to submit</p><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" /><span className="text-sm">I consent to my documents being used only to analyze this claim. I understand I can delete my documents at any time.</span></label></div>}
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    <div className="mt-8 flex items-center justify-between gap-3">{step > 0 ? <Button className="btn btn-ghost" onClick={() => { setStep(step - 1); setError(""); }}><ArrowLeft size={18} />Back</Button> : <span />}<Button disabled={step < 2 ? !files[current.kind].length : !consent} onClick={() => { if (step < 2) { setStep(step + 1); setError(""); } else void send(); }}>{step < 2 ? "Continue" : "Analyze my claim"}<ArrowRight size={18} /></Button></div>
    <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={14} />Your documents are private and accessible only to you.</p>
  </div>;
}
