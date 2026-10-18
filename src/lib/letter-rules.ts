import { z } from "zod";

export const LETTER_PRICE_INR = 599;
export const MAX_LETTER_GENERATIONS = 10;

export const txnId = z.string().trim().regex(/^[A-Za-z0-9]{8,35}$/, "Enter the UPI transaction ID (8–35 letters or numbers).");

export const letterDetails = z.object({
  name: z.string().trim().max(120), policyNumber: z.string().trim().max(80), claimNumber: z.string().trim().max(80),
  admissionDate: z.string().trim().max(40), dischargeDate: z.string().trim().max(40), rejectionDate: z.string().trim().max(40),
});
export type LetterDetails = z.infer<typeof letterDetails>;

export const letterOutput = z.object({
  letter: z.string(),
  escalation: z.array(z.object({ step: z.string(), when: z.string(), how: z.string() }).strict()),
}).strict();
export type LetterOutput = z.infer<typeof letterOutput>;

export function letterBlocker(claim: { status: string; paid: boolean; letter_generations: number }) {
  if (claim.status !== "analyzed") return "Your claim analysis isn’t finished yet.";
  if (!claim.paid) return "Please unlock the appeal letter first.";
  if (claim.letter_generations >= MAX_LETTER_GENERATIONS) return `You can generate the letter up to ${MAX_LETTER_GENERATIONS} times per claim.`;
  return "";
}

export const ESCALATION_DEFAULT = [
  { step: "Insurer’s Grievance Redressal Officer", when: "First, right away", how: "Send this letter by email to the grievance officer listed on your insurer’s website. Keep the acknowledgement." },
  { step: "IRDAI Bima Bharosa portal", when: "If no reply in 15 days or you disagree", how: "File at bimabharosa.irdai.gov.in or call 155255 / 1800 4254 732." },
  { step: "Insurance Ombudsman", when: "After the insurer’s final reply or 30 days, within 1 year", how: "File free at cioins.co.in with this letter and the insurer’s reply." },
  { step: "Consumer Commission", when: "If the Ombudsman route doesn’t resolve it", how: "File on edaakhil.nic.in at the District Consumer Commission." },
];
