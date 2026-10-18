import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileText, LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { deleteClaimDocuments } from "@/lib/document-claims.functions";
import { shouldPollClaim } from "@/lib/claim-documents";
import { Button } from "@/components/Button";
import { analyse, getClaim, inr, REASONS, type Claim } from "@/lib/claims";
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
  return useQuery({ queryKey: ["claim", user?.id, id], queryFn: () => getClaim(id), enabled: !!user,
    refetchInterval: (query) => shouldPollClaim(query.state.data?.status) ? 2000 : false,
    refetchIntervalInBackground: true });
}

function DocumentDeletion({ id }: { id: string }) {
  const remove = useServerFn(deleteClaimDocuments);
  const [state, setState] = useState("");
  return <div className="border-t pt-6"><Button className="btn btn-ghost" disabled={state === "Deleting…" || state === "Documents deleted"} onClick={async () => {
    if (!window.confirm("Delete all uploaded documents for this claim? This cannot be undone. Your saved analysis and letter will remain.")) return;
    setState("Deleting…"); try { await remove({ data: { id } }); setState("Documents deleted"); } catch (error) { setState(error instanceof Error ? error.message : "Could not delete your documents."); }
  }}><Trash2 size={18} />Delete my documents</Button>{state && <p role="status" className="mt-2 text-sm text-muted-foreground">{state}</p>}</div>;
}

const tone = { Strong: "bg-success", Fair: "bg-warning", Uncertain: "bg-muted-foreground" };

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
  if (c.status === "failed") return <div className="container-page max-w-2xl space-y-6 py-16"><h1 className="text-3xl">We couldn’t complete your review</h1><p role="alert" className="text-muted-foreground">{c.error || "Your document review failed. Please submit a new claim with readable documents."}</p><Link to="/new-claim" className="btn btn-primary">Start a new claim</Link><DocumentDeletion id={id} /></div>;
  const a = c.analysis ?? analyse(c);
  return (
    <div className="container-page max-w-2xl space-y-8 py-12">
      <div>
        <p className="text-sm text-muted-foreground">{c.insurer || "Your claim"} · {REASONS.find((r) => r.id === c.reason)?.label}</p>
        <h1 className="mt-1 text-3xl">Here's what we found</h1>
      </div>
      <div className="card-soft p-6">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${tone[a.chance]}`} />
          <span className="font-semibold">Appeal chance: {a.chance}</span>
        </div>
        <p className="mt-3 text-lg">{a.summary}</p>
        <p className="mt-4 text-muted-foreground">Amount in dispute: <b className="text-foreground">{inr(Math.max(c.amountClaimed - c.amountPaid, 0))}</b></p>
      </div>
      <section>
        <h2 className="text-2xl">Points to raise</h2>
        <ul className="mt-4 space-y-3">{a.points.map((p) => <li key={p} className="flex gap-3"><CheckCircle2 className="mt-1 shrink-0 text-primary" size={20} />{p}</li>)}</ul>
      </section>
      <section>
        <h2 className="text-2xl">Documents to attach</h2>
        <ul className="mt-4 list-disc space-y-1 pl-6">{a.documents.map((d) => <li key={d}>{d}</li>)}</ul>
      </section>
      <section className="card-soft bg-secondary p-6">
        <h2 className="text-2xl">If the insurer doesn't help</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6">
          <li>Send the appeal letter to the insurer's Grievance Officer. Wait 15 days.</li>
          <li>File a complaint on the IRDAI Bima Bharosa portal or call 155255.</li>
          <li>Approach the Insurance Ombudsman (free, within 1 year of the insurer's final reply).</li>
        </ol>
      </section>
      <Link to="/claim/$id/letter" params={{ id }} className="btn btn-primary w-full"><FileText size={20} />Get my appeal letter</Link>
      <Disclaimer />
      <DocumentDeletion id={id} />
    </div>
  );
}
