import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminClaims = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: user, error: authError } = await context.supabase.auth.getUser();
  if (authError || !user.user?.email) throw new Error("Please sign in again.");
  const { data: admin, error } = await context.supabase.from("admins").select("id").eq("email", user.user.email.toLowerCase()).maybeSingle();
  if (error || !admin) return { allowed: false, claims: [] };
  // Admin membership does not grant access to other owners' health data.
  const { data: claims, error: readError } = await context.supabase.from("claims").select("*").order("created_at", { ascending: false });
  if (readError) throw new Error("Could not load claims.");
  return { allowed: true, claims: claims ?? [] };
});

export const saveLetter = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), text: z.string().max(50000) }))
  .handler(async ({ data, context }) => {
    const { data: owned } = await context.supabase.from("claims").select("id").eq("id", data.id).eq("user_id", context.userId).eq("paid", true).maybeSingle();
    if (!owned) throw new Error("Claim not found or not unlocked.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("claims").update({ letter_text: data.text }).eq("id", data.id).eq("user_id", context.userId).eq("status", "analyzed").eq("paid", true).select("id").maybeSingle();
    if (error || !row) throw new Error("Could not save your letter.");
    return { saved: true };
  });
/** Aggregate counts only — no claim contents leave the server. */
export const adminStats = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: user } = await context.supabase.auth.getUser();
  const email = user.user?.email?.toLowerCase();
  if (!email) throw new Error("Please sign in again.");
  const { data: admin } = await context.supabase.from("admins").select("id").eq("email", email).maybeSingle();
  if (!admin) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const count = async (f?: (q: any) => any) => {
    let q = supabaseAdmin.from("claims").select("id", { count: "exact", head: true });
    if (f) q = f(q);
    const { count, error } = await q;
    if (error) throw new Error("Could not load counts.");
    return count ?? 0;
  };
  const [total, paid, failed, pending, processing] = await Promise.all([
    count(), count((q) => q.eq("paid", true)), count((q) => q.eq("status", "failed")),
    count((q) => q.eq("payment_status", "pending")), count((q) => q.in("status", ["uploaded", "processing"])),
  ]);
  return { total, paid, failed, pending, processing };
});
