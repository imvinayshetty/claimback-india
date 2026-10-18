import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { countPdfPages, documentError, MAX_FILE_BYTES, sniffType, pageLimitError, rateLimitError, validateDocuments, type DocumentKind } from "./claim-documents";
import { analyzeDocuments } from "./analyze-claim.server";
import { aiToLegacy, type Claim } from "./claims";
import { analysisExpired, analysisFailure, cleanAnalysisState, verifyQuotes, MAX_TOTAL_BYTES, MAX_DOCUMENTS } from "./review-rules";
import { policyTextWithFallback } from "./quote-verification.server";
import type { Json } from "@/integrations/supabase/types";

async function checkRateLimit(supabase: any, userId: string) {
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const count = async (ms: number) => {
    const { count, error } = await supabase.from("analysis_runs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since(ms));
    if (error) throw new Error("Could not check your usage. Please try again.");
    return count ?? 0;
  };
  const message = rateLimitError(await count(3600_000), await count(86400_000));
  if (message) throw new Error(message);
}

export const submitDocuments = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: FormData) => { if (!(data instanceof FormData)) throw new Error("Choose your documents."); return data; })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let total = 0;
    const files: { file: File; kind: DocumentKind }[] = [];
    for (const kind of ["rejection_letter", "policy", "other"] as const) {
      for (const raw of data.getAll(kind)) {
        if (!(raw instanceof File)) throw new Error("Invalid document.");
        if (raw.size > MAX_FILE_BYTES) throw new Error("Each file must be 10 MB or smaller.");
        total += raw.size;
        if (total > MAX_TOTAL_BYTES || files.length >= MAX_DOCUMENTS) throw new Error("Choose at most 6 documents totalling 20 MB or smaller.");
        const bytes = new Uint8Array(await raw.arrayBuffer());
        // Trust the file's content, not the type the browser claims.
        const file = new File([bytes], raw.name, { type: sniffType(bytes.subarray(0, 16)) });
        files.push({ file, kind });
      }
    }
    validateDocuments(files.map(({ file, kind }) => ({ kind, size: file.size, type: file.type })), data.get("consent") === "true");
    for (const { file } of files) if (file.type === "application/pdf") { const e = pageLimitError(await countPdfPages(await file.arrayBuffer())); if (e) throw new Error(e); }
    await checkRateLimit(context.supabase, context.userId);
    const id = crypto.randomUUID();
    const { error } = await supabaseAdmin.from("claims").insert({ id, user_id: context.userId, status: "processing",
      analysis_json: { consent: { accepted: true, acceptedAt: new Date().toISOString() }, input: {} } });
    if (error) throw new Error(error.message.includes("15 claims") ? "You can submit at most 15 claims per day." : "Could not create your claim. Please try again.");
    const paths: string[] = [];
    try {
      for (const { file, kind } of files) {
        const path = `${context.userId}/${id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await supabaseAdmin.storage.from("claim-docs").upload(path, file, { contentType: file.type });
        if (uploadError) throw new Error("Could not upload your documents. Please try again.");
        paths.push(path);
        const { error: recordError } = await supabaseAdmin.from("claim_files").insert({ claim_id: id, user_id: context.userId, kind, storage_path: path });
        if (recordError) throw new Error("Could not save your documents. Please try again.");
      }
    } catch (error) {
      const { error: cleanupError } = await supabaseAdmin.storage.from("claim-docs").remove(paths);
      if (!cleanupError) await supabaseAdmin.from("claims").delete().eq("id", id);
      else await supabaseAdmin.from("claims").update({ status: "failed" }).eq("id", id);
      throw error;
    }
    return { id };
  });

export const analyzeClaim = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), retry: z.boolean().default(false) })).handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("claims").select("*").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (error || !row) throw new Error("Claim not found.");
    if (row.status === "analyzed" || (row.status === "failed" && !data.retry)) return { status: row.status };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: leases, error: leaseError } = await supabaseAdmin.rpc("reserve_claim_analysis", { p_id: row.id, p_user: context.userId, p_retry: data.retry });
    if (leaseError) throw new Error(leaseError.message.includes("analyses per") ? leaseError.message : "Could not start analysis.");
    const lease = leases?.[0];
    if (!lease) return { status: row.status };
    const json = cleanAnalysisState((lease.analysis_json ?? {}) as Record<string, Json | undefined>);
    try {
      const key = process.env["LOVABLE_API_KEY"];
      if (!key) throw new Error("Document analysis is not configured. Please contact support.");
      const { data: records, error: fileError } = await context.supabase.from("claim_files").select("*").eq("claim_id", data.id);
      if (fileError || !records) throw new Error("Could not read your documents.");
      const files = [];
      for (const record of records) {
        const { data: stored, error: downloadError } = await context.supabase.storage.from("claim-docs").download(record.storage_path);
        if (downloadError || !stored) throw new Error("Could not read your documents.");
        const raw = new Uint8Array(await stored.arrayBuffer());
        const blob = new Blob([raw], { type: sniffType(raw.subarray(0, 16)) });
        const validation = documentError(blob, record.kind as DocumentKind);
        if (validation) throw new Error(validation);
        if (blob.type === "application/pdf") { const pages = pageLimitError(await countPdfPages(await blob.arrayBuffer())); if (pages) throw new Error(pages); }
        files.push({ kind: record.kind, name: record.storage_path.split("/").at(-1) ?? "document", blob });
      }
      validateDocuments(files.map((f) => ({ kind: f.kind as DocumentKind, size: f.blob.size, type: f.blob.type })), true);
      const evidence = await policyTextWithFallback(files.find(f => f.kind === "policy")?.blob ?? new Blob(), key);
      const output = await analyzeDocuments(files, key);
      const verification = verifyQuotes(output, evidence.pages, evidence.ocrPages);
      const rejected = Math.max(0, output.rejected_amount);
      const ai = { ...output, rejected_amount: rejected, claim_amount: Math.max(output.claim_amount, rejected) };
      const { claim: legacy, analysis } = aiToLegacy(ai);
      const claim: Claim = { ...legacy, id: row.id, createdAt: row.created_at };
      const { error: saveError } = await supabaseAdmin.from("claims").update({ status: "analyzed", analyzed_at: new Date().toISOString(), insurer: ai.insurer || null,
        claim_amount: ai.claim_amount, rejected_amount: ai.rejected_amount, reason_category: ai.reason_category,
        case_strength: ai.case_strength, analysis_json: { ...json, analysisStarted: true, input: claim, analysis, ai, verification } as unknown as Json,
        letter_text: null }).eq("id", row.id).eq("user_id", context.userId).eq("status", "processing").eq("analysis_lease_id", lease.analysis_lease_id ?? "");
      if (saveError) throw new Error("Could not save your analysis.");
      return { status: "analyzed" };
    } catch (error) {
      const failure = analysisFailure(error);
      await supabaseAdmin.from("claims").update({ status: "failed", analysis_json: { ...json, error: failure.message, retryable: failure.retryable } as Json }).eq("id", row.id).eq("user_id", context.userId).eq("analysis_lease_id", lease.analysis_lease_id ?? "");
      return { status: "failed" };
    }
  });

export const deleteClaimDocuments = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: claim } = await context.supabase.from("claims").select("id").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (!claim) throw new Error("Claim not found.");
    const { data: files, error } = await context.supabase.from("claim_files").select("storage_path").eq("claim_id", data.id);
    if (error) throw new Error("Could not load your documents.");
    if (files?.length) {
      const { error: removeError } = await context.supabase.storage.from("claim-docs").remove(files.map((f) => f.storage_path));
      if (removeError) throw new Error("Could not delete your documents. Please try again.");
    }
    const { error: recordError } = await supabaseAdmin.from("claim_files").delete().eq("claim_id", data.id).eq("user_id", context.userId);
    if (recordError) throw new Error("Could not finish deleting your documents.");
    return { deleted: true };
  });

/** Deletes the whole claim: uploaded files, file records, analysis and letter. */
export const deleteClaimData = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: claim } = await context.supabase.from("claims").select("id").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (!claim) throw new Error("Claim not found.");
    const { data: files, error } = await context.supabase.from("claim_files").select("storage_path").eq("claim_id", data.id);
    if (error) throw new Error("Could not load your documents.");
    if (files?.length) {
      const { error: removeError } = await context.supabase.storage.from("claim-docs").remove(files.map((f) => f.storage_path));
      if (removeError) throw new Error("Could not delete your documents. Please try again.");
    }
    const { error: fileErr } = await supabaseAdmin.from("claim_files").delete().eq("claim_id", data.id).eq("user_id", context.userId);
    if (fileErr) throw new Error("Could not delete your document records.");
    const { error: claimErr } = await supabaseAdmin.from("claims").delete().eq("id", data.id).eq("user_id", context.userId);
    if (claimErr) throw new Error("Could not delete your claim.");
    return { deleted: true };
  });
export const expireClaimAnalysis = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("claims").select("*").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (!row || row.status !== "processing" || !analysisExpired(row.created_at, row.analysis_started_at)) return { expired: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const json = (row.analysis_json ?? {}) as Record<string, Json>;
    let update = supabaseAdmin.from("claims").update({ status: "failed", analysis_json: { ...json, error: "The review was interrupted or took too long. You can retry with the same documents.", retryable: true } })
      .eq("id", row.id).eq("user_id", context.userId).eq("status", "processing");
    update = row.analysis_lease_id ? update.eq("analysis_lease_id", row.analysis_lease_id) : update.is("analysis_lease_id", null);
    const { data: changed } = await update.select("id").maybeSingle();
    return { expired: !!changed };
  });
