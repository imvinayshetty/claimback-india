import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { letterBlocker, letterDetails, txnId } from "./letter-rules";

async function requireAdmin(supabase: any) {
  const { data: user } = await supabase.auth.getUser();
  const email = user?.user?.email?.toLowerCase();
  if (!email) return false;
  const { data } = await supabase.from("admins").select("id").eq("email", email).maybeSingle();
  return !!data;
}

export const submitPayment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), txn: txnId }))
  .handler(async ({ data, context }) => {
    const { data: claim } = await context.supabase.from("claims").select("id, status, paid, payment_status").eq("id", data.id).maybeSingle();
    if (!claim) throw new Error("Claim not found.");
    if (claim.status !== "analyzed") throw new Error("Your claim analysis isn’t finished yet.");
    if (claim.paid) return { status: "approved" };
    if (claim.payment_status === "pending") throw new Error("We’re already checking a payment for this claim.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("claims").update({ payment_status: "pending", payment_txn_id: data.txn.toUpperCase(),
      payment_submitted_at: new Date().toISOString() }).eq("id", claim.id).eq("user_id", context.userId);
    if (error) throw new Error("Could not save your transaction ID. Please try again.");
    return { status: "pending" };
  });

export const adminPendingPayments = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await requireAdmin(context.supabase))) return { allowed: false, payments: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("claims").select("id, user_id, payment_txn_id, payment_submitted_at")
      .eq("payment_status", "pending").order("payment_submitted_at", { ascending: true });
    if (error) throw new Error("Could not load payments.");
    const payments = [];
    for (const row of data ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
      payments.push({ id: row.id, txn: row.payment_txn_id ?? "", submittedAt: row.payment_submitted_at ?? "", email: u?.user?.email ?? "" });
    }
    return { allowed: true, payments };
  });

export const reviewPayment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), approve: z.boolean() }))
  .handler(async ({ data, context }) => {
    if (!(await requireAdmin(context.supabase))) throw new Error("Not allowed.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("claims")
      .update(data.approve ? { paid: true, payment_status: "approved" } : { payment_status: "rejected" })
      .eq("id", data.id).eq("payment_status", "pending").select("id").maybeSingle();
    if (error || !row) throw new Error("Could not update this payment.");
    return { ok: true };
  });

export const generateLetter = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), details: letterDetails }))
  .handler(async ({ data, context }) => {
    const { data: claim } = await context.supabase.from("claims").select("*").eq("id", data.id).maybeSingle();
    if (!claim) throw new Error("Claim not found.");
    const blocker = letterBlocker(claim);
    if (blocker) throw new Error(blocker);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Letter drafting is not configured. Please contact support.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Reserve a generation slot atomically before calling the AI.
    const { data: slot } = await supabaseAdmin.from("claims").update({ letter_generations: claim.letter_generations + 1 })
      .eq("id", claim.id).eq("user_id", context.userId).eq("letter_generations", claim.letter_generations).select("id").maybeSingle();
    if (!slot) throw new Error("Please try again.");
    const json = (claim.analysis_json ?? {}) as Record<string, any>;
    const analysis = json.ai ?? json.analysis ?? {};
    try {
      const { draftLetter } = await import("./letter.server");
      const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
      const out = await draftLetter({ ...analysis, insurer: claim.insurer, claim_amount: claim.claim_amount, rejected_amount: claim.rejected_amount }, data.details, today, key);
      const { error } = await context.supabase.from("claims").update({ letter_text: out.letter,
        analysis_json: { ...json, escalation: out.escalation, input: { ...(json.input ?? {}), ...data.details } } as Json }).eq("id", claim.id);
      if (error) throw new Error("save");
      return out;
    } catch (error) {
      const status = error && typeof error === "object" && "statusCode" in error ? (error as any).statusCode : undefined;
      throw new Error(status === 402 || status === 403 ? "Letter drafting is temporarily unavailable. Please contact support." : "We couldn’t draft your letter. Please try again.");
    }
  });
