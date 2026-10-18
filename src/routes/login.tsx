import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth";
import { Button } from "@/components/Button";
import { Link } from "@tanstack/react-router";
import { LOGIN_REDIRECT_URL, loginLinkError } from "@/lib/auth-rules";

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
  useEffect(() => {
    const message = loginLinkError(window.location.hash);
    if (message) {
      setError(message);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);
  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: LOGIN_REDIRECT_URL } });
      if (error) setError(error.message); else setSent(true);
    } catch { setError("Could not send your sign-in email. Please try again."); }
    finally { setBusy(false); }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
      if (error) setError(error.message);
    } catch { setError("Could not verify your code. Please try again."); }
    finally { setBusy(false); }
  }
  if (user) return <div className="container-page py-16"><h1 className="text-3xl">You’re logged in</h1><Link to="/new-claim" className="btn btn-primary mt-6">Check my claim</Link></div>;
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="text-3xl">Log in</h1>
      <p className="mt-2 text-muted-foreground">No password needed. We'll email you a secure sign-in link.</p>
      {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
      {!sent ? (
        <form className="mt-8 space-y-4" onSubmit={send}>
          <label className="block"><span className="mb-1 block font-medium">Email</span>
            <input required type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <Button disabled={busy} className="btn btn-primary w-full">{busy ? "Sending…" : "Send sign-in email"}</Button>
        </form>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={verify}>
          <p className="rounded-lg bg-secondary p-4">Check <b>{email}</b> for your sign-in link. If the email includes a code, you can enter it below.</p>
          <input aria-label="One-time code" autoComplete="one-time-code" inputMode="numeric" maxLength={8} className="field text-center text-2xl" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Your code" />
          <Button disabled={code.length < 4 || busy} className="btn btn-primary w-full">Verify</Button>
          <Button type="button" onClick={() => setSent(false)} className="w-full text-sm text-muted-foreground">Use a different email</Button>
        </form>
      )}
    </div>
  );
}
