import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminClaims } from "@/lib/claims.functions";
import { adminPendingPayments, reviewPayment } from "@/lib/letter.functions";
import { LETTER_PRICE_INR } from "@/lib/letter-rules";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth, SignInRequired } from "@/components/Auth";
import { inr, rowToClaim, REASONS } from "@/lib/claims";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Admin — ClaimBack" },
    { name: "description", content: "ClaimBack admin overview." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:title", content: "Admin — ClaimBack" },
    { property: "og:description", content: "Claims overview." },
    { name: "robots", content: "noindex" },
  ] }),
  component: Admin,
});

function Admin() {
  const { user, ready } = useAuth();
  const fetchClaims = useServerFn(adminClaims);
  const { data, error, isPending } = useQuery({ queryKey: ["admin-claims", user?.id], queryFn: () => fetchClaims(), enabled: !!user });
  if (!ready) return <div className="container-page py-16">Loading…</div>;
  if (!user) return <SignInRequired />;
  if (error) return <div className="container-page py-16" role="alert">Could not check admin access.</div>;
  if (isPending) return <div className="container-page py-16">Checking access…</div>;
  if (!data?.allowed) return <div className="container-page py-16"><h1 className="text-3xl">Access denied</h1><p className="mt-4">This page is for authorised admins only.</p></div>;
  const claims = data.claims.map(rowToClaim);
  return (
    <div className="container-page py-12">
      <PendingPayments />
      <h1 className="mt-10 text-3xl">Claims</h1>
      <p className="mt-1 text-muted-foreground">{claims.length} of your claims submitted</p>
      <div className="mt-6 space-y-3">
        {claims.map((c) => (
          <Link key={c.id} to="/claim/$id" params={{ id: c.id }} className="card-soft flex justify-between gap-4 p-4">
            <span><b>{c.name || "Unnamed"}</b> · {c.insurer || "—"}<br /><span className="text-sm text-muted-foreground">{REASONS.find((r) => r.id === c.reason)?.label}</span></span>
            <span className="text-right">{inr(c.amountClaimed - c.amountPaid)}<br /><span className="text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("en-IN")}</span></span>
          </Link>
        ))}
        {!claims.length && <p className="text-muted-foreground">No claims yet.</p>}
      </div>
    </div>
  );
}

function PendingPayments() {
  const { user } = useAuth();
  const load = useServerFn(adminPendingPayments);
  const review = useServerFn(reviewPayment);
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const { data } = useQuery({ queryKey: ["admin-payments", user?.id], queryFn: () => load(), enabled: !!user });
  if (!data?.allowed) return null;
  async function act(id: string, approve: boolean) {
    if (!approve && !window.confirm("Reject this payment?")) return;
    setMsg(""); try { await review({ data: { id, approve } }); setMsg(approve ? "Approved" : "Rejected"); await qc.invalidateQueries({ queryKey: ["admin-payments"] }); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Could not update."); }
  }
  return <section>
    <h1 className="text-3xl">Pending payments</h1>
    <p className="mt-1 text-muted-foreground">{data.payments.length} waiting · ₹{LETTER_PRICE_INR} each</p>
    {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
    <div className="mt-6 space-y-3">
      {data.payments.map((p) => <div key={p.id} className="card-soft space-y-3 p-4">
        <div className="flex flex-wrap justify-between gap-2"><span className="font-mono text-lg font-semibold">{p.txn}</span><span className="text-sm text-muted-foreground">{p.submittedAt ? new Date(p.submittedAt).toLocaleString("en-IN") : ""}</span></div>
        <p className="text-sm text-muted-foreground">{p.email} · Claim {p.id.slice(0, 8)}</p>
        <div className="flex gap-3"><button className="btn btn-primary" onClick={() => act(p.id, true)}>Approve</button><button className="btn btn-ghost" onClick={() => act(p.id, false)}>Reject</button></div>
      </div>)}
      {!data.payments.length && <p className="text-muted-foreground">No payments waiting.</p>}
    </div>
  </section>;
}
