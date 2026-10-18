import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyse, letterText, type Claim } from "./claims";
import { claimInput, ownedClaimValues } from "./claim-schema";
import type { Json } from "@/integrations/supabase/types";

export const createClaim = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(claimInput).handler(async ({ data, context }) => {
    const claim: Claim = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const analysis = analyse(claim);
    const { error } = await context.supabase.from("claims").insert({
      ...ownedClaimValues(data, context.userId), id: claim.id, status: "analyzed", case_strength: analysis.chance,
      analysis_json: { analysis, input: data } as unknown as Json, letter_text: letterText(claim, analysis),
    });
    if (error) throw new Error("Could not save your claim. Please try again.");
    return claim;
  });

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
    const { data: row, error } = await context.supabase.from("claims").update({ letter_text: data.text }).eq("id", data.id).select("id").maybeSingle();
    if (error || !row) throw new Error("Could not save your letter.");
    return { saved: true };
  });