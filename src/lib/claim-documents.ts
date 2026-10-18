import { z } from "zod";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export type DocumentKind = "rejection_letter" | "policy" | "other";
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Detects the real file type from its first bytes; the browser-declared type can be faked. */
export function sniffType(bytes: Uint8Array): string {
  const s = (o: number, sig: number[]) => sig.every((b, i) => bytes[o + i] === b);
  if (s(0, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (s(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (s(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (s(0, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (s(0, [0x52, 0x49, 0x46, 0x46]) && s(8, [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  return "application/octet-stream";
}

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

export const REASON_CATEGORIES = ["pre_existing", "non_disclosure", "waiting_period", "room_rent_proportionate", "non_payable_items", "not_medically_necessary", "documentation", "other"] as const;
export const CASE_STRENGTHS = ["strong", "moderate", "weak", "unclear"] as const;
export const analysisOutput = z.object({
  insurer: z.string(), policy_number: z.string(), claim_amount: z.number(), rejected_amount: z.number(),
  rejection_reason: z.string(), reason_category: z.enum(REASON_CATEGORIES),
  clauses_cited: z.array(z.object({ quote: z.string(), page: z.string() }).strict()),
  arguments: z.array(z.object({ point: z.string(), supporting_quote_or_not_found: z.string() }).strict()),
  missing_documents: z.array(z.string()), case_strength: z.enum(CASE_STRENGTHS), confidence: z.number().min(0).max(1),
}).strict();
export type AiAnalysis = z.infer<typeof analysisOutput>;

export const MAX_PDF_PAGES = 30;
export function pageLimitError(pages: number) {
  return pages > MAX_PDF_PAGES ? `Each PDF can have at most ${MAX_PDF_PAGES} pages.` : "";
}
export async function countPdfPages(bytes: ArrayBuffer) {
  const { PDFDocument } = await import("pdf-lib");
  try { return (await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })).getPageCount(); }
  catch { throw new Error("This PDF could not be read. Choose another file."); }
}

export const RATE_LIMITS = { perHour: 5, perDay: 15 };
export function rateLimitError(lastHour: number, lastDay: number) {
  if (lastHour >= RATE_LIMITS.perHour) return `You can run ${RATE_LIMITS.perHour} analyses per hour. Please try again later.`;
  if (lastDay >= RATE_LIMITS.perDay) return `You can run ${RATE_LIMITS.perDay} analyses per day. Please try again tomorrow.`;
  return "";
}

export function shouldPollClaim(status?: string) {
  return status === "processing" || status === "uploaded";
}