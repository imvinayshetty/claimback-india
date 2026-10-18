import { describe, expect, it } from "vitest";
import { claimInput, ownedClaimValues } from "@/lib/claim-schema";

const input = { name: "Test", insurer: "Test insurer", policyNo: "P1", claimNo: "C1", amountClaimed: 100000, amountPaid: 40000, reason: "room_rent" as const, details: "" };
describe("Claim ownership", () => {
  it("derives ownership from the session and ignores a supplied owner", () => {
    const parsed = claimInput.parse({ ...input, user_id: "someone-else" });
    expect(ownedClaimValues(parsed, "signed-in-user").user_id).toBe("signed-in-user");
  });
  it("rejects a payment larger than the claim", () => {
    expect(claimInput.safeParse({ ...input, amountPaid: 100001 }).success).toBe(false);
  });
  it("calculates the rejected amount from the claim and payment", () => {
    expect(ownedClaimValues(input, "owner").rejected_amount).toBe(60000);
  });
});