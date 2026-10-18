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