import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Disclaimer } from "@/components/Disclaimer";
import { useClaim } from "./claim.$id";
import { useAuth, SignInRequired } from "@/components/Auth";
import { Button } from "@/components/Button";
import { saveLetter } from "@/lib/claims.functions";
import { generateLetter } from "@/lib/letter.functions";
import { ESCALATION_DEFAULT, MAX_LETTER_GENERATIONS, type LetterDetails } from "@/lib/letter-rules";

export const Route = createFileRoute("/claim/$id_/letter")({
  head: () => ({ meta: [
    { title: "Your appeal letter — ClaimBack" },
    { name: "description", content: "A ready-to-send appeal letter for your insurer." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { property: "og:title", content: "Your appeal letter — ClaimBack" },
    { property: "og:description", content: "Edit, copy and print your appeal letter." },
    { name: "robots", content: "noindex" },
  ] }),
  component: Letter,
});

const FIELDS: { key: keyof LetterDetails; label: string; type?: string }[] = [
  { key: "name", label: "Your full name" }, { key: "policyNumber", label: "Policy number" }, { key: "claimNumber", label: "Claim number" },
  { key: "admissionDate", label: "Date of admission", type: "date" }, { key: "dischargeDate", label: "Date of discharge", type: "date" },
  { key: "rejectionDate", label: "Date of rejection letter", type: "date" },
];

function Letter() {
  const { id } = Route.useParams();
  const { user, ready } = useAuth();
  const { data: claim, error, isPending } = useClaim(id);
  const save = useServerFn(saveLetter);
  const generate = useServerFn(generateLetter);
  const qc = useQueryClient();
  const [details, setDetails] = useState<LetterDetails>({ name: "", policyNumber: "", claimNumber: "", admissionDate: "", dischargeDate: "", rejectionDate: "" });
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Record<number, boolean>>({});
  useEffect(() => {
    if (!claim) return;
    setText(claim.letter ?? "");
    setDetails((d) => ({ ...d, name: claim.name || d.name, policyNumber: claim.ai?.policy_number || claim.policyNo || d.policyNumber, claimNumber: claim.claimNo || d.claimNumber }));
  }, [claim?.id]);
  if (!ready) return <div className="container-page py-20">Loading…</div>;
  if (!user) return <SignInRequired />;
  if (error) return <div className="container-page py-20">Could not load your letter.</div>;
  if (isPending) return <div className="container-page py-20">Loading…</div>;
  if (!claim) return <div className="container-page py-20">Claim not found.</div>;
  if (claim.status !== "analyzed") return <div className="container-page space-y-4 py-20"><p>Your appeal letter will be available after analysis is complete.</p><Link to="/claim/$id" params={{ id }} className="btn btn-primary">View claim status</Link></div>;
  if (!claim.paid) return <Navigate to="/claim/$id/unlock" params={{ id }} replace />;
  const steps = claim.escalation?.length ? claim.escalation : ESCALATION_DEFAULT;
  async function run() {
    if (text && !window.confirm("Generate a new letter? Your current text will be replaced.")) return;
    setBusy(true); setStatus("Drafting your letter… this can take up to a minute.");
    try { const out = await generate({ data: { id, details } }); setText(out.letter); setStatus("Letter ready. Check every [PLACEHOLDER] before sending."); await qc.invalidateQueries({ queryKey: ["claim"] }); }
    catch (err) { setStatus(err instanceof Error ? err.message : "Could not draft your letter."); }
    finally { setBusy(false); }
  }
  return (
    <div className="container-page max-w-2xl space-y-6 py-12">
      <style>{`@media print { body * { visibility: hidden; } #print-letter, #print-letter * { visibility: visible; } #print-letter { position: absolute; inset: 0; display: block !important; white-space: pre-wrap; font: 12pt/1.6 serif; padding: 2cm; } }`}</style>
      <Link to="/claim/$id" params={{ id }} className="text-sm text-muted-foreground print:hidden">← Back to analysis</Link>
      <h1 className="text-3xl">Your appeal letter</h1>
      <section className="card-soft space-y-4 p-6">
        <h2 className="text-xl">Your details</h2>
        <p className="text-sm text-muted-foreground">Leave anything blank you don’t know — it will appear as a [PLACEHOLDER] to fill in later.</p>
        <div className="grid gap-4 sm:grid-cols-2">{FIELDS.map((f) => <label key={f.key} className="block"><span className="text-sm font-medium">{f.label}</span>
          <input type={f.type ?? "text"} value={details[f.key]} onChange={(e) => setDetails({ ...details, [f.key]: e.target.value })} className="field mt-1" /></label>)}</div>
        <Button className="btn btn-primary w-full" disabled={busy} onClick={run}>{busy ? "Drafting…" : text ? "Regenerate letter" : "Generate letter"}</Button>
        <p className="text-xs text-muted-foreground">Up to {MAX_LETTER_GENERATIONS} drafts per claim.</p>
      </section>
      {status && <p role="status" className="text-sm">{status}</p>}
      {text && <>
        <textarea aria-label="Appeal letter" value={text} onChange={(e) => setText(e.target.value)} rows={30} className="field font-mono text-sm leading-relaxed" />
        <div id="print-letter" className="hidden">{text}</div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={async () => { setStatus("Saving…"); try { await save({ data: { id, text } }); setStatus("Saved"); } catch { setStatus("Could not save. Please try again."); } }}>Save changes</Button>
          <Button className="btn btn-ghost" onClick={() => { void navigator.clipboard.writeText(text); setStatus("Copied"); }}>Copy letter</Button>
          <Button className="btn btn-primary" onClick={() => window.print()}>Print / Save as PDF</Button>
        </div>
      </>}
      <section className="card-soft p-6">
        <h2 className="text-xl">Escalation checklist</h2>
        <ol className="mt-4 space-y-4">{steps.map((s, i) => <li key={i}><label className="flex cursor-pointer gap-3">
          <input type="checkbox" checked={!!done[i]} onChange={(e) => setDone({ ...done, [i]: e.target.checked })} className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" />
          <span><b>{i + 1}. {s.step}</b><br /><span className="text-sm text-muted-foreground">{s.when} — {s.how}</span></span></label></li>)}</ol>
      </section>
      <Disclaimer />
    </div>
  );
}
