import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Upload } from "lucide-react";
import { REASONS, type Reason } from "@/lib/claims";
import { useServerFn } from "@tanstack/react-start";
import { createClaim } from "@/lib/claims.functions";
import { useAuth, SignInRequired } from "@/components/Auth";
import { Button } from "@/components/Button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/new-claim")({
  head: () => ({ meta: [
    { title: "Check my claim — ClaimBack" },
    { name: "description", content: "Tell us about your rejected or reduced claim." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:title", content: "Check my claim — ClaimBack" },
    { property: "og:description", content: "Upload your letter and answer a few simple questions." },
  ] }),
  component: NewClaim,
});

function NewClaim() {
  const nav = useNavigate();
  const { user, ready } = useAuth();
  const create = useServerFn(createClaim);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState({ name: "", insurer: "", policyNo: "", claimNo: "", amountClaimed: "", amountPaid: "0", reason: "" as Reason | "", details: "", fileName: "" });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || busy) return;
    setBusy(true); setError("");
    try {
      const c = await create({ data: { ...f, reason: f.reason || "other", amountClaimed: +f.amountClaimed, amountPaid: +f.amountPaid } });
      if (file) {
        const path = `${user.id}/${c.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("claim-docs").upload(path, file);
        if (uploadError) {
          await supabase.from("claims").delete().eq("id", c.id);
          throw new Error("Your document could not be uploaded. Please try again.");
        }
        const { error: fileError } = await supabase.from("claim_files").insert({ claim_id: c.id, user_id: user.id, kind: "rejection_letter", storage_path: path });
        if (fileError) {
          await supabase.storage.from("claim-docs").remove([path]);
          await supabase.from("claims").delete().eq("id", c.id);
          throw new Error("Your document could not be saved. Please try again.");
        }
      }
      await nav({ to: "/claim/$id", params: { id: c.id } });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save your claim."); }
    finally { setBusy(false); }
  }

  if (!ready) return <div className="container-page py-16">Loading…</div>;
  if (!user) return <SignInRequired />;

  return (
    <div className="container-page max-w-xl py-12">
      <h1 className="text-3xl">Tell us about your claim</h1>
      <p className="mt-2 text-muted-foreground">Takes about 5 minutes. You can skip anything you don't know.</p>
      <form onSubmit={submit} className="mt-8 space-y-6">
        <label className="card-soft flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center">
          <Upload className="text-primary" />
          <span className="font-semibold">{f.fileName || "Upload rejection or settlement letter"}</span>
          <span className="text-sm text-muted-foreground">PDF or photo</span>
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const selected = e.target.files?.[0] ?? null; setFile(selected); setF({ ...f, fileName: selected?.name || "" }); }} />
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
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <Button disabled={!f.reason || busy} className="btn btn-primary w-full">{busy ? "Saving…" : "See my analysis"}</Button>
      </form>
    </div>
  );
}
