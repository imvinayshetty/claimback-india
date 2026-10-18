import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { documentError, validateDocuments, type DocumentKind } from "./claim-documents";
import { analyzeDocuments } from "./analyze-claim.server";
import { letterText, type Claim } from "./claims";
import type { Json } from "@/integrations/supabase/types";

export const submitDocuments = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: FormData) => { if (!(data instanceof FormData)) throw new Error("Choose your documents."); return data; })
  .handler(async ({ data, context }) => {
    const files: { file: File; kind: DocumentKind }[] = [];
    for (const kind of ["rejection_letter", "policy", "other"] as const) {
      for (const file of data.getAll(kind)) {
        if (!(file instanceof File)) throw new Error("Invalid document.");
        files.push({ file, kind });
      }
    }
    validateDocuments(files.map(({ file, kind }) => ({ kind, size: file.size, type: file.type })), data.get("consent") === "true");
    const id = crypto.randomUUID();
    const { error } = await context.supabase.from("claims").insert({ id, user_id: context.userId, status: "processing",
      analysis_json: { consent: { accepted: true, acceptedAt: new Date().toISOString() }, input: {} } });
    if (error) throw new Error("Could not create your claim. Please try again.");
    const paths: string[] = [];
    try {
      for (const { file, kind } of files) {
        const path = `${context.userId}/${id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await context.supabase.storage.from("claim-docs").upload(path, file, { contentType: file.type });
        if (uploadError) throw new Error("Could not upload your documents. Please try again.");
        paths.push(path);
        const { error: recordError } = await context.supabase.from("claim_files").insert({ claim_id: id, user_id: context.userId, kind, storage_path: path });
        if (recordError) throw new Error("Could not save your documents. Please try again.");
      }
    } catch (error) {
      const { error: cleanupError } = await context.supabase.storage.from("claim-docs").remove(paths);
      if (!cleanupError) await context.supabase.from("claims").delete().eq("id", id);
      else await context.supabase.from("claims").update({ status: "failed" }).eq("id", id);
      throw error;
    }
    return { id };
  });

export const analyzeClaim = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("claims").select("*").eq("id", data.id).maybeSingle();
    if (error || !row) throw new Error("Claim not found.");
    if (row.status === "analyzed" || row.status === "failed") return { status: row.status };
    // Atomic lease prevents duplicate analysis calls across tabs or reloads.
    const json = (row.analysis_json ?? {}) as Record<string, Json | undefined>;
    const { data: lease, error: leaseError } = await context.supabase.from("claims")
      .update({ analysis_json: { ...json, analysisStarted: true } as Json }).eq("id", data.id)
      .eq("status", "processing").is("analysis_json->>analysisStarted", null).select("id").maybeSingle();
    if (leaseError) throw new Error("Could not start analysis.");
    if (!lease) return { status: "processing" };
    try {
      const key = process.env["LOVABLE_API_KEY"];
      if (!key) throw new Error("Document analysis is not configured. Please contact support.");
      const { data: records, error: fileError } = await context.supabase.from("claim_files").select("*").eq("claim_id", data.id);
      if (fileError || !records) throw new Error("Could not read your documents.");
      const files = [];
      for (const record of records) {
        const { data: blob, error: downloadError } = await context.supabase.storage.from("claim-docs").download(record.storage_path);
        if (downloadError || !blob) throw new Error("Could not read your documents.");
        const validation = documentError(blob, record.kind as DocumentKind);
        if (validation) throw new Error(validation);
        files.push({ kind: record.kind, name: record.storage_path.split("/").at(-1) ?? "document", blob });
      }
      validateDocuments(files.map((f) => ({ kind: f.kind as DocumentKind, size: f.blob.size, type: f.blob.type })), true);
      const output = await analyzeDocuments(files, key);
      const amountClaimed = Math.max(0, output.amountClaimed);
      const amountPaid = Math.min(amountClaimed, Math.max(0, output.amountPaid));
      const claim: Claim = { ...output, amountClaimed, amountPaid, id: row.id, createdAt: row.created_at };
      const analysis = { chance: output.chance, summary: output.summary, points: output.points, documents: output.documents };
      const { error: saveError } = await context.supabase.from("claims").update({ status: "analyzed", insurer: output.insurer,
        claim_amount: amountClaimed, rejected_amount: amountClaimed - amountPaid, reason_category: output.reason,
        case_strength: output.chance, analysis_json: { ...json, analysisStarted: true, input: claim, analysis } as unknown as Json,
        letter_text: letterText(claim, analysis) }).eq("id", row.id);
      if (saveError) throw new Error("Could not save your analysis.");
      return { status: "analyzed" };
    } catch (error) {
      // Never retry or substitute models for gateway denials or refusals.
      const status = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
      const message = status === 402 || status === 403 ? "Document analysis is unavailable because of an AI service access or credit limit. Please contact support." :
        "We could not analyze your documents. Please check that they are readable and submit a new claim.";
      await context.supabase.from("claims").update({ status: "failed", analysis_json: { ...json, error: message } as Json }).eq("id", row.id);
      return { status: "failed" };
    }
  });

export const deleteClaimDocuments = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
    const { data: claim } = await context.supabase.from("claims").select("id").eq("id", data.id).maybeSingle();
    if (!claim) throw new Error("Claim not found.");
    const { data: files, error } = await context.supabase.from("claim_files").select("storage_path").eq("claim_id", data.id);
    if (error) throw new Error("Could not load your documents.");
    if (files?.length) {
      const { error: removeError } = await context.supabase.storage.from("claim-docs").remove(files.map((f) => f.storage_path));
      if (removeError) throw new Error("Could not delete your documents. Please try again.");
    }
    const { error: recordError } = await context.supabase.from("claim_files").delete().eq("claim_id", data.id);
    if (recordError) throw new Error("Could not finish deleting your documents.");
    return { deleted: true };
  });