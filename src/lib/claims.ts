import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { QuoteVerification } from "./review-rules";
import type { AiAnalysis } from "./claim-documents";

export type Reason = "ped" | "room_rent" | "non_payable" | "waiting" | "documents" | "other";

export const REASONS: { id: Reason; label: string; blurb: string }[] = [
  { id: "ped", label: "Pre-existing disease", blurb: "Insurer says the illness existed before the policy." },
  { id: "room_rent", label: "Room rent deduction", blurb: "Bill cut because the room was above the policy limit." },
  { id: "non_payable", label: "Non-payable items", blurb: "Gloves, kits, admin charges and similar items removed." },
  { id: "waiting", label: "Waiting period", blurb: "Treatment fell within an initial or specific waiting period." },
  { id: "documents", label: "Missing documents", blurb: "Claim held or rejected for papers not submitted." },
  { id: "other", label: "Something else", blurb: "Another reason, or the letter is unclear." },
];

export type Claim = {
  id: string;
  createdAt: string;
  name: string;
  insurer: string;
  policyNo: string;
  claimNo: string;
  amountClaimed: number;
  amountPaid: number;
  reason: Reason;
  details: string;
  fileName?: string | undefined;
  letter?: string | undefined;
  status?: string;
  analysis?: Analysis | undefined;
  error?: string | undefined;
  ai?: AiAnalysis | undefined;
  verification?: QuoteVerification | undefined;
  retryable?: boolean | undefined;
  analysisStartedAt?: string | null;
  paid?: boolean;
  paymentStatus?: string;
  escalation?: { step: string; when: string; how: string }[] | undefined;
};

export type Analysis = {
  chance: "Strong" | "Fair" | "Uncertain";
  summary: string;
  points: string[];
  documents: string[];
};

const CATEGORY_TO_REASON: Record<string, Reason> = { pre_existing: "ped", non_disclosure: "ped", waiting_period: "waiting",
  room_rent_proportionate: "room_rent", non_payable_items: "non_payable", documentation: "documents" };
export const CATEGORY_LABELS: Record<string, string> = { pre_existing: "Pre-existing disease", non_disclosure: "Non-disclosure",
  waiting_period: "Waiting period", room_rent_proportionate: "Room rent / proportionate deduction", non_payable_items: "Non-payable items",
  not_medically_necessary: "Not medically necessary", documentation: "Missing documents", other: "Other reason" };
const STRENGTH_TO_CHANCE = { strong: "Strong", moderate: "Fair", weak: "Uncertain", unclear: "Uncertain" } as const;

export function aiToLegacy(ai: AiAnalysis): { claim: Omit<Claim, "id" | "createdAt">; analysis: Analysis } {
  const claim = { name: "", insurer: ai.insurer, policyNo: ai.policy_number, claimNo: "", amountClaimed: ai.claim_amount,
    amountPaid: ai.claim_amount - ai.rejected_amount, reason: CATEGORY_TO_REASON[ai.reason_category] ?? "other", details: "" };
  const points = ai.arguments.map((a) => a.supporting_quote_or_not_found.trim().toLowerCase() === "not found" ? a.point : `${a.point} (Policy: "${a.supporting_quote_or_not_found}")`);
  return { claim, analysis: { chance: STRENGTH_TO_CHANCE[ai.case_strength], summary: ai.rejection_reason, points, documents: ai.missing_documents } };
}

export function rowToClaim(row: Tables<"claims">): Claim {
  const json = row.analysis_json as { input?: Partial<Claim>; analysis?: Analysis; error?: string; ai?: AiAnalysis; escalation?: Claim["escalation"]; verification?: QuoteVerification | undefined; retryable?: boolean } | null;
  const input = json?.input;
  const reason = REASONS.find((r) => r.id === row.reason_category)?.id ?? CATEGORY_TO_REASON[row.reason_category ?? ""] ?? "other";
  return { id: row.id, createdAt: row.created_at, name: input?.name ?? "", insurer: row.insurer ?? "",
    policyNo: input?.policyNo ?? "", claimNo: input?.claimNo ?? "", details: input?.details ?? "",
    amountClaimed: row.claim_amount, amountPaid: row.claim_amount - row.rejected_amount,
    reason, fileName: input?.fileName, letter: row.paid ? row.letter_text ?? undefined : undefined,
    verification: json?.verification, retryable: json?.retryable, analysisStartedAt: row.analysis_started_at, status: row.status, analysis: json?.analysis, error: json?.error, ai: json?.ai, paid: row.paid, paymentStatus: row.payment_status, escalation: json?.escalation };
}
export async function getClaim(id: string) {
  const { data, error } = await supabase.from("claims").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load your claim.");
  return data ? rowToClaim(data) : null;
}

export const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

