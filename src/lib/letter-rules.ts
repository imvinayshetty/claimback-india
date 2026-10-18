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

export const ESCALATION_VERIFIED_ON = "18 October 2026";
export const ESCALATION_SOURCES = ["https://bimabharosa.irdai.gov.in/Home/FAQ", "https://cioins.co.in/Procedure/Index", "https://consumeraffairs.nic.in/acts-and-rules/consumer-protection"];
export const ESCALATION_DEFAULT = [
  { step: "Insurer’s Grievance Redressal Officer", when: "First, in writing; IRDAI says grievances should be resolved within 15 days", how: "Use the grievance contact on your insurer’s official website. Keep the acknowledgement." },
  { step: "IRDAI Bima Bharosa portal", when: "If the insurer’s response is unsatisfactory or unresolved", how: "Register at https://bimabharosa.irdai.gov.in. Check the official FAQ for current contact details." },
  { step: "Insurance Ombudsman", when: "After an unsatisfactory insurer/broker response, or no response within 30 days", how: "Check https://cioins.co.in/Procedure/Index: normally within one year of the relevant rejection/response or expiry of the response period, claim value including expenses up to ₹50 lakh; the same matter must not be before or decided by a court, consumer forum or arbitrator. Eligibility and territorial rules apply; filing is free." },
  { step: "Consumer Commission", when: "An alternative forum, subject to limitation and jurisdiction rules", how: "Check https://consumeraffairs.nic.in/acts-and-rules/consumer-protection and seek advice before choosing a forum: another proceeding can affect Ombudsman eligibility. Do not assume this is an automatic next step after an Ombudsman decision." },
];
