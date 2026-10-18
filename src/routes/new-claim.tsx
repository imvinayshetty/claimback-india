import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Upload } from "lucide-react";
import { REASONS, saveClaim, type Reason } from "@/lib/claims";

export const Route = createFileRoute("/new-claim")({
  head: () => ({ meta: [
    { title: "Check my claim — ClaimBack" },
    { name: "description", content: "Tell us about your rejected or reduced claim." },
    { property: "og:title", content: "Check my claim — ClaimBack" },
    { property: "og:description", content: "Upload your letter and answer a few simple questions." },
  ] }),
  component: NewClaim,
});

function NewClaim() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", insurer: "", policyNo: "", claimNo: "", amountClaimed: "", amountPaid: "0", reason: "" as Reason | "", details: "", fileName: "" });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = saveClaim({ ...f, reason: (f.reason || "other") as Reason, amountClaimed: +f.amountClaimed, amountPaid: +f.amountPaid });
    nav({ to: "/claim/$id", params: { id: c.id } });
  }

  return (
    <div className="container-page max-w-xl py-12">
      <h1 className="text-3xl">Tell us about your claim</h1>
      <p className="mt-2 text-muted-foreground">Takes about 5 minutes. You can skip anything you don't know.</p>
      <form onSubmit={submit} className="mt-8 space-y-6">
        <label className="card-soft flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center">
          <Upload className="text-primary" />
          <span className="font-semibold">{f.fileName || "Upload rejection or settlement letter"}</span>
          <span className="text-sm text-muted-foreground">PDF or photo</span>
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setF({ ...f, fileName: e.target.files?.[0]?.name || "" })} />
        </label>

        <fieldset>
          <legend className="mb-3 font-semibold">What reason did the insurer give?</legend>
          <div className="grid gap-2">
            {REASONS.map((r) => (
              <label key={r.id} className={`card-soft flex cursor-pointer gap-3 p-4 ${f.reason === r.id ? "ring-2 ring-primary" : ""}`}>
                <input type="radio" name="reason" value={r.id} checked={f.reason === r.id} onChange={set("reason")} className="mt-1 accent-[var(--color-primary)]" />
                <span><b>{r.label}</b><br /><span className="text-sm text-muted-foreground">{r.blurb}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        {([["name", "Your name"], ["insurer", "Insurance company"], ["policyNo", "Policy number"], ["claimNo", "Claim number"]] as const).map(([k, l]) => (
          <label key={k} className="block"><span className="mb-1 block font-medium">{l}</span>
            <input className="field" value={(f as any)[k]} onChange={set(k)} /></label>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <label><span className="mb-1 block font-medium">Amount claimed (₹)</span><input required type="number" min="0" className="field" value={f.amountClaimed} onChange={set("amountClaimed")} /></label>
          <label><span className="mb-1 block font-medium">Amount paid (₹)</span><input type="number" min="0" className="field" value={f.amountPaid} onChange={set("amountPaid")} /></label>
        </div>
        <label className="block"><span className="mb-1 block font-medium">Anything else we should know?</span>
          <textarea rows={4} className="field" value={f.details} onChange={set("details")} placeholder="e.g. I was never treated for this before" /></label>
        <button disabled={!f.reason} className="btn btn-primary w-full">See my analysis</button>
      </form>
    </div>
  );
}
