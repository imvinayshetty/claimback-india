import { createFileRoute, Link } from "@tanstack/react-router";
import { Upload, Search, FileText, Scale, ShieldCheck, Lock, Trash2 } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { REASONS } from "@/lib/claims";
import { Disclaimer } from "@/components/Disclaimer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClaimBack — Claim rejected? Find out if you can fight it" },
      { name: "description", content: "Check in 5 minutes if your rejected or reduced health insurance claim in India can be appealed, and get a ready appeal letter." },
      { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:title", content: "ClaimBack — Fight a rejected health insurance claim" },
      { property: "og:description", content: "Upload your rejection letter, get a plain-language analysis, an appeal letter and escalation steps." },
    ],
  }),
  component: Index,
});

const steps = [
  { icon: Upload, t: "Upload", d: "Share your rejection or settlement letter and your policy PDF. Add supporting documents if needed." },
  { icon: Search, t: "Analysis", d: "We explain the reason in simple words and how strong your case looks." },
  { icon: FileText, t: "Appeal letter", d: "Get a clear, polite letter ready to send to your insurer." },
  { icon: Scale, t: "Escalation", d: "If they don't respond, know exactly when to go to the Ombudsman." },
];

const faqs = [
  ["Is this free?", "Claim analysis is available in early access. Payments for the proposed ₹599 appeal-letter unlock are not open yet."],
  ["Do I need a lawyer?", "Most first appeals to an insurer and complaints to the Insurance Ombudsman don't need a lawyer. Complex cases may benefit from one."],
  ["How long does the insurer have to reply?", "IRDAI says insurers should resolve grievances within 15 days. Ombudsman eligibility is separate: complain to the insurer first, then check the 30-day no-response rule or an unsatisfactory reply, the deadline and claim-value limit."],
  ["Will my insurer know I used ClaimBack?", "The letter is sent by you, in your name; we do not contact your insurer."],
];

function Index() {
  return (
    <>
      <section className="bg-hero">
        <div className="container-page grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">For health insurance claims in India</p>
            <h1 className="text-4xl md:text-5xl">Claim rejected? Find out if you can fight it, in 5 minutes</h1>
            <p className="mt-5 text-lg text-muted-foreground">Upload your letter. We'll explain what went wrong, how strong your case is, and draft your appeal.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/new-claim" className="btn btn-primary">Check my claim</Link>
              <a href="#how" className="btn btn-ghost">How it works</a>
            </div>
          </div>
          <img src={hero} width={1024} height={896} alt="A woman reading her insurance letter with relief" className="rounded-3xl" />
        </div>
      </section>

      <section id="how" className="container-page py-16">
        <h2 className="text-3xl">How it works</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.t} className="card-soft flex gap-4 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><s.icon /></span>
              <div>
                <p className="text-sm text-muted-foreground">Step {i + 1}</p>
                <h3 className="text-xl">{s.t}</h3>
                <p className="mt-1 text-muted-foreground">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-secondary py-16">
        <div className="container-page">
          <h2 className="text-3xl">Common reasons claims are cut</h2>
          <p className="mt-2 text-muted-foreground">Many of these can be challenged.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.filter((r) => r.id !== "other").map((r) => (
              <div key={r.id} className="card-soft p-6">
                <h3 className="text-lg">{r.label}</h3>
                <p className="mt-1 text-muted-foreground">{r.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="text-3xl">Your documents stay private</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            [Lock, "Encrypted", "Your files are encrypted in transit and at rest."],
            [ShieldCheck, "Never sold", "We do not sell your health data. Our storage and AI providers process it to review your claim."],
            [Trash2, "Delete anytime", "Remove your claim and files whenever you want."],
          ].map(([I, t, d]: any) => (
            <div key={t} className="p-2">
              <I className="text-primary" />
              <h3 className="mt-3 text-lg">{t}</h3>
              <p className="text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-8">
        <h2 className="text-3xl">Questions</h2>
        <div className="mt-6 divide-y rounded-2xl border">
          {faqs.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="cursor-pointer list-none font-semibold">{q}</summary>
              <p className="mt-2 text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10"><Disclaimer /></div>
      </section>
    </>
  );
}
