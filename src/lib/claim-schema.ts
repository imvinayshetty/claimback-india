import { z } from "zod";

export const claimInput = z.object({
  name: z.string().max(200), insurer: z.string().max(200), policyNo: z.string().max(200), claimNo: z.string().max(200),
  amountClaimed: z.number().finite().nonnegative(), amountPaid: z.number().finite().nonnegative(),
  reason: z.enum(["ped", "room_rent", "non_payable", "waiting", "documents", "other"]),
  details: z.string().max(10000), fileName: z.string().max(500).optional(),
}).refine((c) => c.amountPaid <= c.amountClaimed, { message: "Amount paid cannot exceed amount claimed." });

// The validated session, never submitted data, decides ownership.
export function ownedClaimValues(input: z.infer<typeof claimInput>, userId: string) {
  return { user_id: userId, insurer: input.insurer, claim_amount: input.amountClaimed,
    rejected_amount: input.amountClaimed - input.amountPaid, reason_category: input.reason };
}