import { z } from "zod";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export type DocumentKind = "rejection_letter" | "policy" | "other";
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function documentError(file: { size: number; type: string }, kind: DocumentKind) {
  if (!file.size) return "This file is empty. Choose another document.";
  if (file.size > MAX_FILE_BYTES) return "Each file must be 10 MB or smaller.";
  if (file.type !== "application/pdf" && (kind === "policy" || !IMAGE_TYPES.includes(file.type))) {
    return kind === "policy" ? "Choose a PDF policy document or schedule." : "Choose a PDF, JPG, PNG, WebP or GIF document.";
  }
  return "";
}

export const submissionConsent = z.literal(true);
export function validateDocuments(documents: { kind: DocumentKind; size: number; type: string }[], consent: boolean) {
  if (!submissionConsent.safeParse(consent).success) throw new Error("Please consent to document analysis before submitting.");
  if (!documents.some((f) => f.kind === "rejection_letter")) throw new Error("A rejection or settlement letter is required.");
  if (!documents.some((f) => f.kind === "policy")) throw new Error("A policy document or schedule is required.");
  for (const file of documents) {
    const error = documentError(file, file.kind);
    if (error) throw new Error(error);
  }
}

export const analysisOutput = z.object({
  name: z.string(), insurer: z.string(), policyNo: z.string(), claimNo: z.string(),
  amountClaimed: z.number(), amountPaid: z.number(),
  reason: z.enum(["ped", "room_rent", "non_payable", "waiting", "documents", "other"]),
  details: z.string(), chance: z.enum(["Strong", "Fair", "Uncertain"]),
  summary: z.string(), points: z.array(z.string()), documents: z.array(z.string()),
}).strict();

export function shouldPollClaim(status?: string) {
  return status === "processing" || status === "uploaded";
}