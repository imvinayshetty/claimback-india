import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "@/components/Auth";
import { Button } from "@/components/Button";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-5xl text-primary">404</h1>
      <p className="mt-4 text-muted-foreground">This page doesn't exist.</p>
      <Link to="/" className="btn btn-primary mt-6">Go home</Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl">This page didn't load</h1>
      <button onClick={() => { router.invalidate(); reset(); }} className="btn btn-primary mt-6">Try again</button>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ClaimBack — Appeal rejected health insurance claims" },
      { name: "description", content: "Help appealing rejected or reduced health insurance claims in India." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider><AppLayout /></AuthProvider>
    </QueryClientProvider>
  );
}

function AppLayout() {
  const { user } = useAuth();
  return <>
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between">
          <Link to="/" className="font-display text-xl font-semibold text-primary">ClaimBack</Link>
          <nav className="flex items-center gap-2 text-sm">
            {user ? <Button className="px-3 py-2 text-muted-foreground" onClick={() => supabase.auth.signOut()}>Log out</Button> : <Link to="/login" className="px-3 py-2 text-muted-foreground hover:text-foreground">Log in</Link>}
            <Link to="/new-claim" className="btn btn-primary !min-h-0 !py-2 !px-4 text-sm">Start</Link>
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="mt-20 border-t py-10 text-sm text-muted-foreground">
        <div className="container-page flex flex-col gap-3 sm:flex-row sm:justify-between">
          <p>© 2026 ClaimBack. Drafting help, not legal advice.</p>
          <div className="flex gap-5">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/admin">Admin</Link>
          </div>
        </div>
      </footer>
    </>;
}
