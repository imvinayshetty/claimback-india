import { describe, it, expect } from "vitest";
import { documentError, validateDocuments, MAX_FILE_BYTES, shouldPollClaim } from "@/lib/claim-documents";

const letter = { kind: "rejection_letter" as const, size: 100, type: "image/png" };
const policy = { kind: "policy" as const, size: 100, type: "application/pdf" };
describe("Document submission rules", () => {
  it("requires the rejection or settlement letter", () => {
    expect(() => validateDocuments([policy], true)).toThrow("letter is required");
  });
  it("requires a policy document", () => {
    expect(() => validateDocuments([letter], true)).toThrow("schedule is required");
  });
  it("accepts PDF and image letters", () => {
    expect(documentError(letter, "rejection_letter")).toBe("");
    expect(documentError({ ...letter, type: "application/pdf" }, "rejection_letter")).toBe("");
    expect(documentError({ ...letter, type: "text/plain" }, "rejection_letter")).not.toBe("");
  });
  it("requires the policy to be PDF", () => {
    expect(documentError(letter, "policy")).not.toBe("");
    expect(documentError(policy, "policy")).toBe("");
  });
  it("does not require extra documents", () => {
    expect(() => validateDocuments([letter, policy], true)).not.toThrow();
  });
  it("requires explicit consent", () => {
    expect(() => validateDocuments([letter, policy], false)).toThrow("consent");
    expect(() => validateDocuments([letter, policy], true)).not.toThrow();
  });
  it("enforces 10 MB on every file with an inclusive boundary", () => {
    expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
    for (const kind of ["policy", "rejection_letter", "other"] as const) {
      expect(documentError({ size: 10 * 1024 * 1024, type: "application/pdf" }, kind)).toBe("");
      expect(documentError({ size: 10 * 1024 * 1024 + 1, type: "application/pdf" }, kind)).not.toBe("");
    }
  });
  it("rejects empty uploads", () => {
    expect(documentError({ size: 0, type: "application/pdf" }, "policy")).not.toBe("");
  });
  it("polls processing but stops at analyzed or failed", () => {
    expect(shouldPollClaim("processing")).toBe(true);
    expect(shouldPollClaim("analyzed")).toBe(false);
    expect(shouldPollClaim("failed")).toBe(false);
  });
});
import { pageLimitError, rateLimitError, analysisOutput } from "@/lib/claim-documents";
describe("Analysis limits", () => {
  it("allows 30 PDF pages and rejects 31", () => {
    expect(pageLimitError(30)).toBe("");
    expect(pageLimitError(31)).not.toBe("");
  });
  it("allows 5 analyses per hour, blocks the 6th", () => {
    expect(rateLimitError(4, 4)).toBe("");
    expect(rateLimitError(5, 5)).not.toBe("");
  });
  it("blocks the 16th analysis in a day", () => {
    expect(rateLimitError(0, 14)).toBe("");
    expect(rateLimitError(0, 15)).not.toBe("");
  });
  const valid = { insurer: "X", policy_number: "P", claim_amount: 100, rejected_amount: 50, rejection_reason: "r",
    reason_category: "pre_existing", clauses_cited: [{ quote: "q", page: "3" }],
    arguments: [{ point: "p", supporting_quote_or_not_found: "not found" }], missing_documents: [], case_strength: "moderate", confidence: 0.6 };
  it("accepts a valid reply and rejects bad category or confidence", () => {
    expect(analysisOutput.safeParse(valid).success).toBe(true);
    expect(analysisOutput.safeParse({ ...valid, reason_category: "ped" }).success).toBe(false);
    expect(analysisOutput.safeParse({ ...valid, confidence: 1.2 }).success).toBe(false);
  });
});
