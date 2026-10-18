import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { analyse, letterText } from "@/lib/claims";
import { Disclaimer } from "@/components/Disclaimer";
import { useClaim } from "./claim.$id";
import { useAuth, SignInRequired } from "@/components/Auth";
import { Button } from "@/components/Button";
import { useServerFn } from "@tanstack/react-start";
import { saveLetter } from "@/lib/claims.functions";

export const Route = createFileRoute("/claim/$id_/letter")({
  head: () => ({ meta: [
    { title: "Your appeal letter — ClaimBack" },
    { name: "description", content: "A ready-to-send appeal letter for your insurer." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:title", content: "Your appeal letter — ClaimBack" },
    { property: "og:description", content: "Edit, copy and send your appeal letter." },
  ] }),
  component: Letter,
});

function Letter() {
  const { id } = Route.useParams();
  const { user, ready } = useAuth();
  const { data: claim, error, isPending } = useClaim(id);
  const save = useServerFn(saveLetter);
  const [saveState, setSaveState] = useState("");
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (claim) setText(claim.letter ?? letterText(claim, analyse(claim))); }, [claim]);
  if (!ready) return <div className="container-page py-20">Loading…</div>;
  if (!user) return <SignInRequired />;
  if (error) return <div className="container-page py-20">Could not load your letter.</div>;
  if (isPending) return <div className="container-page py-20">Loading…</div>;
  if (!claim) return <div className="container-page py-20">Claim not found.</div>;
  if (text === null) return <div className="container-page py-20">Loading…</div>;
  return (
    <div className="container-page max-w-2xl space-y-6 py-12">
      <Link to="/claim/$id" params={{ id }} className="text-sm text-muted-foreground">← Back to analysis</Link>
      <h1 className="text-3xl">Your appeal letter</h1>
      <p className="text-muted-foreground">Check the details, edit anything, then email or print it.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={28} className="field font-mono text-sm leading-relaxed" />
      <div className="flex flex-wrap gap-3">
        <Button onClick={async () => { setSaveState("Saving…"); try { await save({ data: { id, text } }); setSaveState("Saved"); } catch { setSaveState("Could not save. Please try again."); } }}>Save changes</Button>
        <Button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); }}>{copied ? "Copied" : "Copy letter"}</Button>
        <Button className="btn btn-ghost" onClick={() => window.print()}>Print / Save PDF</Button>
      </div>
      {saveState && <p role="status">{saveState}</p>}
      <Disclaimer />
    </div>
  );
}
