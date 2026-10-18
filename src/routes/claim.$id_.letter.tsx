import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { analyse, getClaim, letterText } from "@/lib/claims";
import { Disclaimer } from "@/components/Disclaimer";

export const Route = createFileRoute("/claim/$id_/letter")({
  head: () => ({ meta: [
    { title: "Your appeal letter — ClaimBack" },
    { name: "description", content: "A ready-to-send appeal letter for your insurer." },
    { property: "og:title", content: "Your appeal letter — ClaimBack" },
    { property: "og:description", content: "Edit, copy and send your appeal letter." },
  ] }),
  component: Letter,
});

function Letter() {
  const { id } = Route.useParams();
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { const c = getClaim(id); setText(c ? letterText(c, analyse(c)) : ""); }, [id]);
  if (text === null) return <div className="container-page py-20" />;
  return (
    <div className="container-page max-w-2xl space-y-6 py-12">
      <Link to="/claim/$id" params={{ id }} className="text-sm text-muted-foreground">← Back to analysis</Link>
      <h1 className="text-3xl">Your appeal letter</h1>
      <p className="text-muted-foreground">Check the details, edit anything, then email or print it.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={28} className="field font-mono text-sm leading-relaxed" />
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); }}>{copied ? "Copied" : "Copy letter"}</button>
        <button className="btn btn-ghost" onClick={() => window.print()}>Print / Save PDF</button>
      </div>
      <Disclaimer />
    </div>
  );
}
