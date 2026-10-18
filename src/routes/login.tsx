import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Log in — ClaimBack" },
    { name: "description", content: "Log in to ClaimBack with your email." },
    { property: "og:title", content: "Log in — ClaimBack" },
    { property: "og:description", content: "Sign in with a one-time code or magic link." },
  ] }),
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="text-3xl">Log in</h1>
      <p className="mt-2 text-muted-foreground">No password needed. We'll email you a 6-digit code and a sign-in link.</p>
      {!sent ? (
        <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          <label className="block"><span className="mb-1 block font-medium">Email</span>
            <input required type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <button className="btn btn-primary w-full">Send code</button>
        </form>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <p className="rounded-xl bg-secondary p-4">We sent a code to <b>{email}</b>. You can also tap the link in that email.</p>
          <input inputMode="numeric" maxLength={6} className="field text-center text-2xl tracking-[0.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" />
          <button disabled={code.length < 6} className="btn btn-primary w-full">Verify</button>
          <button type="button" onClick={() => setSent(false)} className="w-full text-sm text-muted-foreground">Use a different email</button>
        </form>
      )}
    </div>
  );
}
