import { Info } from "lucide-react";

export function Disclaimer() {
  return (
    <p role="note" className="flex gap-3 rounded-xl border-2 border-warning bg-warning/10 p-4 text-sm text-foreground">
      <Info size={18} className="mt-0.5 shrink-0" />
      <span><b>Not legal advice.</b> ClaimBack gives drafting help and general information only. We are not a law firm or insurance intermediary. Check every fact and quote against your own documents before sending anything.</span>
    </p>
  );
}
