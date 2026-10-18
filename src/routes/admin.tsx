import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminClaims } from "@/lib/claims.functions";
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
      <h1 className="text-3xl">Claims</h1>
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
