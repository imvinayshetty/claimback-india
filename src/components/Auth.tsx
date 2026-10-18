import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const AuthContext = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: User | null; ready: boolean }>({ user: null, ready: false });
  const router = useRouter();
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setState({ user: data.user, ready: true }); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setState({ user: session?.user ?? null, ready: true });
      router.invalidate();
      if (event !== "SIGNED_OUT") router.options.context.queryClient.invalidateQueries();
      else router.options.context.queryClient.clear();
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [router]);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
export function SignInRequired() {
  return <div className="container-page py-16"><h1 className="text-3xl">Your claims stay private</h1><Link to="/login" className="btn btn-primary mt-6">Log in to continue</Link></div>;
}