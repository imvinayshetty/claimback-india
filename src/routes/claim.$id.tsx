import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileSearch, FileText, ListChecks, LoaderCircle, Lock, MessageSquareQuote, Scale, Trash2 } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { deleteClaimData, deleteClaimDocuments, analyzeClaim, expireClaimAnalysis } from "@/lib/document-claims.functions";
import { analysisExpired, type QuoteMatch } from "@/lib/review-rules";
import { ESCALATION_DEFAULT, ESCALATION_VERIFIED_ON } from "@/lib/letter-rules";
import { shouldPollClaim } from "@/lib/claim-documents";
import { Button } from "@/components/Button";
import { CATEGORY_LABELS, getClaim, inr, REASONS, type Claim } from "@/lib/claims";
import { Disclaimer } from "@/components/Disclaimer";
import { useAuth, SignInRequired } from "@/components/Auth";

export const Route = createFileRoute("/claim/$id")({
  head: () => ({ meta: [
    { title: "Your claim analysis — ClaimBack" },
    { name: "description", content: "Plain-language analysis of your insurance claim decision." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:title", content: "Your claim analysis — ClaimBack" },
    { property: "og:description", content: "See how strong your appeal is and what to do next." },
  ] }),
  component: Result,
});

export function useClaim(id: string) {
  const { user } = useAuth();
  const expire = useServerFn(expireClaimAnalysis);
  return useQuery({ queryKey: ["claim", user?.id, id], queryFn: async () => { let claim = await getClaim(id); if (claim && shouldPollClaim(claim.status) && analysisExpired(claim.createdAt, claim.analysisStartedAt)) { await expire({ data: { id } }); claim = await getClaim(id); } return claim; }, enabled: !!user,
    refetchInterval: (query) => shouldPollClaim(query.state.data?.status) ? 2000 : false,
    refetchIntervalInBackground: true });
}

function DocumentDeletion({ id }: { id: string }) {
  const remove = useServerFn(deleteClaimDocuments);
  const removeAll = useServerFn(deleteClaimData);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [state, setState] = useState("");
  const busy = state === "Deleting…";
  return <div className="space-y-3 border-t pt-6">
    <p className="text-sm text-muted-foreground">Uploaded documents are deleted automatically after 30 days: from analysis completion, or upload if no analysis completes.</p>
    <div className="flex flex-wrap gap-3">
      <Button className="btn btn-ghost" disabled={busy || state === "Documents deleted"} onClick={async () => {
        if (!window.confirm("Delete all uploaded documents for this claim? Your analysis and letter will remain.")) return;
        setState("Deleting…"); try { await remove({ data: { id } }); setState("Documents deleted"); } catch (error) { setState(error instanceof Error ? error.message : "Could not delete your documents."); }
      }}><Trash2 size={18} />Delete documents only</Button>
      <Button className="btn btn-ghost text-destructive" disabled={busy} onClick={async () => {
        if (!window.confirm("Delete this claim, its documents, analysis and letter permanently? This cannot be undone.")) return;
        setState("Deleting…");
        try { await removeAll({ data: { id } }); qc.removeQueries({ queryKey: ["claim"] }); navigate({ to: "/" }); }
        catch (error) { setState(error instanceof Error ? error.message : "Could not delete your data."); }
      }}><Trash2 size={18} />Delete my data</Button>
    </div>
    {state && <p role="status" className="text-sm text-muted-foreground">{state}</p>}
  </div>;
}

const STRENGTH = {
  strong: { label: "Looks contestable", note: "Your documents give solid grounds to appeal.", cls: "bg-success/15 border-success text-foreground", dot: "bg-success" },
  moderate: { label: "Possibly contestable", note: "There are some grounds to appeal, but gaps remain.", cls: "bg-warning/15 border-warning text-foreground", dot: "bg-warning" },
  weak: { label: "Hard to contest", note: "The documents mostly support the insurer’s decision.", cls: "bg-destructive/10 border-destructive text-foreground", dot: "bg-destructive" },
  unclear: { label: "Unclear", note: "We couldn’t tell from these documents. More papers may help.", cls: "bg-muted border-border text-foreground", dot: "bg-muted-foreground" },
} as const;
const LEGACY_STRENGTH = { Strong: "strong", Fair: "moderate", Uncertain: "unclear" } as const;

function Result() {
  const { id } = Route.useParams();
  const { user, ready } = useAuth();
  const { data: c, error, isPending } = useClaim(id);
  if (!ready) return <div className="container-page py-20">Loading…</div>;
  if (!user) return <SignInRequired />;
  if (error) return <div role="alert" className="container-page py-20">Could not load your claim. Please try again.</div>;
  if (isPending) return <div className="container-page py-20">Loading…</div>;
  if (!c) return <div className="container-page py-20 text-center"><p>Claim not found.</p><Link to="/new-claim" className="btn btn-primary mt-6">Start a new check</Link></div>;
  if (shouldPollClaim(c.status)) return <div className="container-page max-w-2xl space-y-8 py-16">
    <div role="status" aria-live="polite"><LoaderCircle className="animate-spin text-primary motion-reduce:animate-none" size={36} /><p className="mt-6 text-sm text-primary">Documents uploaded securely</p><h1 className="mt-2 text-3xl">Reviewing your claim</h1><p className="mt-4 text-muted-foreground">We’re reading your insurer’s letter and checking it against your policy and supporting documents. This may take a few minutes.</p></div>
    <ol className="space-y-4"><li className="flex items-center gap-3"><CheckCircle2 className="text-primary" size={20} />Documents received</li><li className="flex items-center gap-3"><LoaderCircle className="animate-spin text-primary motion-reduce:animate-none" size={20} />Analyzing your claim</li><li className="text-muted-foreground">Appeal points and letter next</li></ol>
    <DocumentDeletion id={id} />
  </div>;
  if (c.status === "failed") return <div className="container-page max-w-2xl space-y-6 py-16"><h1 className="text-3xl">We couldn’t complete your review</h1><p role="alert" className="text-muted-foreground">{c.error || "Your document review failed. Please submit a new claim with readable documents."}</p><Link to="/new-claim" className="btn btn-primary">Start a new claim</Link>{c.retryable && <RetryAnalysis id={id} />}<DocumentDeletion id={id} /></div>;
  const a = c.analysis ?? { chance: "Uncertain" as const, summary: "No saved analysis is available.", points: [], documents: [] };
  const ai = c.ai;
  const strength = STRENGTH[ai?.case_strength ?? LEGACY_STRENGTH[a.chance]];
  const reasonLabel = ai ? CATEGORY_LABELS[ai.reason_category] : REASONS.find((r) => r.id === c.reason)?.label;
  const disputed = ai ? ai.rejected_amount : Math.max(c.amountClaimed - c.amountPaid, 0);
  const args = ai ? ai.arguments : a.points.map((point) => ({ point, supporting_quote_or_not_found: "not found" }));
  const missing = ai ? ai.missing_documents : a.documents;
  return (
    <div className="container-page max-w-2xl space-y-6 py-12">
      <div>
        <p className="text-sm text-muted-foreground">{c.insurer || "Your claim"}{ai?.policy_number ? ` · Policy ${ai.policy_number}` : ""}</p>
        <h1 className="mt-1 text-3xl">Here’s what we found</h1>
      </div>
      <Disclaimer />

      <Card icon={<MessageSquareQuote size={20} />} title="What the insurer said">
        <p className="text-sm font-medium text-primary">{reasonLabel}</p>
        <p className="mt-2 text-lg">{ai?.rejection_reason || a.summary}</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-muted-foreground">Claimed</dt><dd className="text-lg font-semibold">{inr(ai?.claim_amount ?? c.amountClaimed)}</dd></div>
          <div><dt className="text-muted-foreground">Rejected or cut</dt><dd className="text-lg font-semibold">{inr(disputed)}</dd></div>
        </dl>
      </Card>

      <section className={`rounded-2xl border-2 p-6 ${strength.cls}`} aria-label="Case strength">
        <div className="flex items-center gap-3"><Scale size={20} /><h2 className="text-xl">Does it look contestable?</h2></div>
        <div className="mt-4 flex items-center gap-3"><span className={`h-4 w-4 rounded-full ${strength.dot}`} /><span className="text-2xl font-semibold">{strength.label}</span></div>
        <p className="mt-2">{strength.note}</p>
        {ai && <div className="mt-4"><p className="text-sm text-muted-foreground">How sure we are: {Math.round(ai.confidence * 100)}%</p>
          <div className="mt-1 h-2 rounded-full bg-background"><div className={`h-2 rounded-full ${strength.dot}`} style={{ width: `${Math.round(ai.confidence * 100)}%` }} /></div></div>}
      </section>

      <div role="note" className="flex gap-3 rounded-2xl border border-warning bg-warning/10 p-4 text-sm">
        <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={20} />
        <p><b>Quotes not verified in the PDF text must be checked against your policy.</b> Text matching confirms wording, not legal meaning; all quotes may need your review. Unsupported quotes are excluded from generated letters. Open your policy at the page shown and confirm the wording before using it in an appeal.</p>
      </div>

      <Card icon={<FileSearch size={20} />} title="Policy clauses">
        {ai && ai.clauses_cited.length > 0 ? <ul className="space-y-4">{ai.clauses_cited.map((cl, i) => <li key={i} className="rounded-xl bg-secondary p-4">
          <blockquote className="border-l-4 border-primary pl-3 italic">“{cl.quote}”</blockquote>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="text-muted-foreground">Page {cl.page || "not found"}</span><QuoteBadge match={c.verification?.clauses[i]} /></div>
        </li>)}</ul> : <p className="text-muted-foreground">No policy clauses were found in your documents.</p>}
      </Card>

      <Card icon={<CheckCircle2 size={20} />} title="Arguments for your appeal">
        {args.length ? <ul className="space-y-5">{args.map((p, i) => { const nf = isNotFound(p.supporting_quote_or_not_found); return <li key={i}>
          <p className="font-medium">{i + 1}. {p.point}</p>
          {nf ? <p className="mt-1 text-sm text-muted-foreground">No supporting policy clause found</p> :
            <div className="mt-2"><blockquote className="border-l-2 border-primary pl-3 text-sm italic text-muted-foreground">“{p.supporting_quote_or_not_found}”</blockquote><div className="mt-1"><QuoteBadge match={c.verification?.arguments[i]} /></div></div>}
        </li>; })}</ul> : <p className="text-muted-foreground">No appeal arguments were found in your documents.</p>}
      </Card>

      <Card icon={<ListChecks size={20} />} title="Missing documents">
        {missing.length ? <ul className="list-disc space-y-1 pl-6">{missing.map((d) => <li key={d}>{d}</li>)}</ul> : <p className="text-muted-foreground">Nothing obvious is missing.</p>}
      </Card>

      <Card icon={<Scale size={20} />} title="Next steps">
        <ol className="list-decimal space-y-3 pl-6">{ESCALATION_DEFAULT.map(step => <li key={step.step}><b>{step.step}</b><p>{step.when}. {step.how}</p></li>)}</ol>
        <p className="mt-4 text-xs text-muted-foreground">Official guidance checked {ESCALATION_VERIFIED_ON}. Eligibility and deadlines depend on your case.</p>
      </Card>

      <LetterPreview id={id} text={c.letter ?? ""} paid={c.paid ?? false} />
      <Disclaimer />
      <DocumentDeletion id={id} />
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="card-soft p-6"><div className="mb-4 flex items-center gap-3 text-primary">{icon}<h2 className="text-xl text-foreground">{title}</h2></div>{children}</section>;
}
function QuoteBadge({ match }: { match?: QuoteMatch | undefined }) {
  const verified = match?.status === "verified";
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${verified ? "border-success bg-success/15" : "border-warning bg-warning/15"}`}>{verified ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}{verified ? `Verified in PDF text, ${match.endPage ? `pages ${match.page}–${match.endPage}` : `page ${match.page}`}` : match?.status === "close_match" ? `Close match${match.source === "ocr" ? " in scanned text" : ""}, page ${match.page} — check wording` : match?.status === "not_found" ? "No reliable text match — check policy" : "Unverified — no readable text layer"}</span>;
}
function RetryAnalysis({ id }: { id: string }) {
  const retry = useServerFn(analyzeClaim);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div><Button disabled={busy} onClick={async () => { setBusy(true); setError(""); try { const work = retry({ data: { id, retry: true } }); window.setTimeout(() => { void qc.invalidateQueries({ queryKey: ["claim"] }); }, 1000); await work; await qc.invalidateQueries({ queryKey: ["claim"] }); } catch (e) { setError(e instanceof Error ? e.message : "Could not retry."); } finally { setBusy(false); } }}><LoaderCircle size={18} className={busy ? "animate-spin" : ""} />Retry document review</Button>{error && <p role="alert">{error}</p>}</div>;
}
function LetterPreview({ id, text, paid }: { id: string; text: string; paid: boolean }) {
  const preview = "To,\nThe Grievance Redressal Officer\n[INSURER]\n\nSubject: Request for review of claim [CLAIM NUMBER]\n\nDear Sir/Madam,\n\nGrounds for review\n1. [VERIFIED GROUNDS FROM YOUR DOCUMENTS]\n\nRequested resolution\n[REQUESTED RESOLUTION]\n\nYours faithfully,\n[POLICYHOLDER NAME]";
  return <section className="card-soft overflow-hidden" aria-label="Appeal letter preview">
    <div className="flex items-center gap-3 p-6 pb-0 text-primary"><FileText size={20} /><h2 className="text-xl text-foreground">Your appeal letter</h2></div>
    <div className="relative mt-4 px-6">
      <pre aria-hidden={!paid} className={`whitespace-pre-wrap font-sans text-sm ${paid ? "" : "max-h-56 select-none overflow-hidden blur-[3px]"}`}>{paid ? text : preview}</pre>
      {!paid && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/70 to-card" />}
    </div>
    <div className="p-6 pt-4">
      {paid ? <Link to="/claim/$id/letter" params={{ id }} className="btn btn-primary w-full"><FileText size={20} />Open appeal letter</Link> :
        <><Link to="/claim/$id/unlock" params={{ id }} className="btn btn-primary w-full"><Lock size={18} />Unlock appeal letter</Link>
        <p className="mt-2 text-center text-sm text-muted-foreground">Ready to send to your insurer’s Grievance Officer.</p></>}
    </div>
  </section>;
}

const isNotFound = (s: string) => s.trim().toLowerCase() === "not found" || !s.trim();
