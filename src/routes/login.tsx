import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth";
import { Button } from "@/components/Button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Log in — ClaimBack" },
    { name: "description", content: "Log in to ClaimBack with your email." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:title", content: "Log in — ClaimBack" },
    { property: "og:description", content: "Sign in with a one-time code or magic link." },
  ] }),
  component: Login,
});

function Login() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/login` } });
    setBusy(false); if (error) setError(error.message); else setSent(true);
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setBusy(false); if (error) setError(error.message);
  }
  if (user) return <div className="container-page py-16"><h1 className="text-3xl">You’re logged in</h1><Link to="/new-claim" className="btn btn-primary mt-6">Check my claim</Link></div>;
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="text-3xl">Log in</h1>
      <p className="mt-2 text-muted-foreground">No password needed. We'll email you a one-time code and a sign-in link.</p>
      {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
      {!sent ? (
        <form className="mt-8 space-y-4" onSubmit={send}>
          <label className="block"><span className="mb-1 block font-medium">Email</span>
            <input required type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <Button disabled={busy} className="btn btn-primary w-full">{busy ? "Sending…" : "Send code"}</Button>
        </form>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={verify}>
          <p className="rounded-xl bg-secondary p-4">We sent a code to <b>{email}</b>. You can also tap the link in that email.</p>
          <input inputMode="numeric" maxLength={8} className="field text-center text-2xl tracking-[0.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Your code" />
          <Button disabled={code.length < 4 || busy} className="btn btn-primary w-full">Verify</Button>
          <Button type="button" onClick={() => setSent(false)} className="w-full text-sm text-muted-foreground">Use a different email</Button>
        </form>
      )}
    </div>
  );
}
