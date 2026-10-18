import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { inr, listClaims, REASONS, type Claim } from "@/lib/claims";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Admin — ClaimBack" },
    { name: "description", content: "ClaimBack admin overview." },
    { property: "og:title", content: "Admin — ClaimBack" },
    { property: "og:description", content: "Claims overview." },
    { name: "robots", content: "noindex" },
  ] }),
  component: Admin,
});

function Admin() {
  const [claims, setClaims] = useState<Claim[]>([]);
  useEffect(() => setClaims(listClaims()), []);
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl">Claims</h1>
      <p className="mt-1 text-muted-foreground">{claims.length} submitted</p>
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
