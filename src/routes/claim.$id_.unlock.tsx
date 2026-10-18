import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Clock, QrCode } from "lucide-react";
import { useClaim } from "./claim.$id";
import { useAuth, SignInRequired } from "@/components/Auth";
import { Button } from "@/components/Button";
import { submitPayment } from "@/lib/letter.functions";
import { LETTER_PRICE_INR, txnId } from "@/lib/letter-rules";
import { PAYMENTS_READY } from "@/lib/review-rules";
import { inr } from "@/lib/claims";

const qrModules = import.meta.glob("@/assets/upi-qr.*", { eager: true, import: "default" }) as Record<string, string>;
const qrSrc = Object.values(qrModules)[0];

export const Route = createFileRoute("/claim/$id_/unlock")({
  head: () => ({ meta: [
    { title: "Unlock your appeal letter — ClaimBack" },
    { name: "description", content: "Pay by UPI to unlock your ready-to-send appeal letter." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { property: "og:title", content: "Unlock your appeal letter — ClaimBack" },
    { property: "og:description", content: "Pay by UPI to unlock your appeal letter." },
    { name: "robots", content: "noindex" },
  ] }),
  component: Unlock,
});

function Unlock() {
  const { id } = Route.useParams();
  const { user, ready } = useAuth();
  const { data: claim, isPending } = useClaim(id);
  const submit = useServerFn(submitPayment);
  const qc = useQueryClient();
  const [txn, setTxn] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!ready || (user && isPending)) return <div className="container-page py-16">Loading…</div>;
  if (!user) return <SignInRequired />;
  if (!claim) return <div className="container-page py-16">Claim not found.</div>;
  if (claim.paid) return <div className="container-page max-w-xl space-y-6 py-16"><CheckCircle2 className="text-success" size={40} /><h1 className="text-3xl">Your letter is unlocked</h1><Link to="/claim/$id/letter" params={{ id }} className="btn btn-primary">Open appeal letter</Link></div>;
  if (!PAYMENTS_READY) return <div className="container-page max-w-xl space-y-6 py-16"><h1 className="text-3xl">Payments aren’t open yet</h1><p className="text-muted-foreground">Please do not send money. Payment details and reviewed terms will be available before payments open.</p><Link to="/claim/$id" params={{ id }} className="btn btn-ghost">Back to my analysis</Link></div>;
  if (claim.paymentStatus === "pending") return <div className="container-page max-w-xl space-y-6 py-16"><Clock className="text-primary" size={40} /><h1 className="text-3xl">We’re checking your payment</h1><p className="text-lg text-muted-foreground">This usually takes a few hours. Come back to your claim page; the letter unlocks as soon as it’s confirmed.</p><Link to="/claim/$id" params={{ id }} className="btn btn-ghost">Back to my claim</Link></div>;
  async function send(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const parsed = txnId.safeParse(txn);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Invalid transaction ID."); return; }
    setBusy(true);
    try { await submit({ data: { id, txn: parsed.data } }); await qc.invalidateQueries({ queryKey: ["claim"] }); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not submit. Please try again."); }
    finally { setBusy(false); }
  }
  return (
    <div className="container-page max-w-xl space-y-6 py-12">
      <Link to="/claim/$id" params={{ id }} className="text-sm text-muted-foreground">← Back to analysis</Link>
      <h1 className="text-3xl">Unlock your appeal letter — {inr(LETTER_PRICE_INR)}</h1>
      {claim.paymentStatus === "rejected" && <p role="alert" className="rounded-xl border border-destructive bg-destructive/10 p-4">We couldn’t confirm your payment. Please check the transaction ID and submit again.</p>}
      <div className="card-soft flex flex-col items-center p-6">
        {qrSrc ? <img src={qrSrc} alt={`UPI QR code to pay ${inr(LETTER_PRICE_INR)}`} className="w-64 max-w-full rounded-xl" /> :
          <div className="flex h-64 w-64 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground"><QrCode size={48} /><span className="text-sm">UPI QR code coming soon</span></div>}
        <p className="mt-4 text-2xl font-semibold">{inr(LETTER_PRICE_INR)}</p>
      </div>
      <ol className="list-decimal space-y-2 pl-6 text-lg">
        <li>Scan the QR with any UPI app (GPay, PhonePe, Paytm).</li>
        <li>Pay exactly {inr(LETTER_PRICE_INR)}.</li>
        <li>Enter the UPI transaction ID (UTR) shown after payment.</li>
      </ol>
      <form onSubmit={send} className="space-y-3">
        <label className="block"><span className="text-sm font-medium">UPI transaction ID</span>
          <input value={txn} onChange={(e) => setTxn(e.target.value)} inputMode="text" autoComplete="off" placeholder="e.g. 412345678901" className="field mt-1" /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? "Submitting…" : "Submit transaction ID"}</Button>
      </form>
    </div>
  );
}
