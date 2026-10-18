import { describe, it, expect } from "vitest";
import { letterBlocker, txnId, LETTER_PRICE_INR, MAX_LETTER_GENERATIONS } from "@/lib/letter-rules";
const ok = { status: "analyzed", paid: true, letter_generations: 0 };
describe("Letter unlock rules", () => {
  it("price is ₹599", () => expect(LETTER_PRICE_INR).toBe(599));
  it("unpaid claims cannot generate", () => expect(letterBlocker({ ...ok, paid: false })).not.toBe(""));
  it("paid analyzed claims can generate", () => expect(letterBlocker(ok)).toBe(""));
  it("caps generations at 10", () => {
    expect(MAX_LETTER_GENERATIONS).toBe(10);
    expect(letterBlocker({ ...ok, letter_generations: 9 })).toBe("");
    expect(letterBlocker({ ...ok, letter_generations: 10 })).not.toBe("");
  });
  it("validates UPI transaction IDs", () => {
    expect(txnId.safeParse("412345678901").success).toBe(true);
    expect(txnId.safeParse("12 34").success).toBe(false);
    expect(txnId.safeParse("1234567").success).toBe(false);
  });
});
