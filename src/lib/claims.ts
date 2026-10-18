import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
};

export type Analysis = {
  chance: "Strong" | "Fair" | "Uncertain";
  summary: string;
  points: string[];
  documents: string[];
};

export function rowToClaim(row: Tables<"claims">): Claim {
  const json = row.analysis_json as { input?: Partial<Claim>; analysis?: Analysis; error?: string } | null;
  const input = json?.input;
  const reason = REASONS.find((r) => r.id === row.reason_category)?.id ?? "other";
  return { id: row.id, createdAt: row.created_at, name: input?.name ?? "", insurer: row.insurer ?? "",
    policyNo: input?.policyNo ?? "", claimNo: input?.claimNo ?? "", details: input?.details ?? "",
    amountClaimed: row.claim_amount, amountPaid: row.claim_amount - row.rejected_amount,
    reason, fileName: input?.fileName, letter: row.letter_text ?? undefined,
    status: row.status, analysis: json?.analysis, error: json?.error };
}
export async function getClaim(id: string) {
  const { data, error } = await supabase.from("claims").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load your claim.");
  return data ? rowToClaim(data) : null;
}

export function analyse(c: Claim): Analysis {
  const map: Record<Reason, Analysis> = {
    ped: {
      chance: "Fair",
      summary: "Pre-existing disease rejections are often challenged successfully when the condition wasn't diagnosed or treated before the policy began, or when the PED waiting period (max 3 years under IRDAI rules from 2024) is over.",
      points: [
        "Ask the insurer for the exact evidence they relied on to call it pre-existing.",
        "If your policy has run 5+ years continuously, the moratorium rule means it generally cannot be contested except for proven fraud.",
        "A doctor's certificate stating when the condition was first diagnosed helps a lot.",
      ],
      documents: ["Policy schedule showing start date", "Doctor's certificate on first diagnosis", "Earlier health records (if any)"],
    },
    room_rent: {
      chance: "Strong",
      summary: "Proportionate deductions are commonly applied to all charges, but IRDAI guidelines say they should not apply to medicines, implants and consumables billed at actuals, or to ICU charges.",
      points: [
        "Check whether deductions were applied to pharmacy and implants — these are usually excluded from proportionate deduction.",
        "If no room within your limit was available, ask the hospital for a written note.",
        "Request an itemised settlement breakup.",
      ],
      documents: ["Final hospital bill (itemised)", "Settlement letter with breakup", "Hospital note on room availability"],
    },
    non_payable: {
      chance: "Fair",
      summary: "IRDAI publishes a standard list of non-payable items. Anything removed that isn't on that list, or is part of a procedure package, can be questioned.",
      points: [
        "Compare each deducted item against the IRDAI non-payable list.",
        "Items that form part of a surgery or procedure cost are often payable.",
        "Check if your policy has a consumables add-on.",
      ],
      documents: ["Itemised bill", "Settlement breakup", "Policy wording / add-on details"],
    },
    waiting: {
      chance: "Uncertain",
      summary: "Waiting-period rejections are valid only if the treatment truly falls inside the period. Portability and continuous renewals count towards waiting periods.",
      points: [
        "Confirm your first policy start date, including any ported policy.",
        "Check if the treatment is in the specific-disease waiting list at all.",
        "Accidents are usually covered from day one.",
      ],
      documents: ["All previous policy schedules", "Portability documents", "Discharge summary"],
    },
    documents: {
      chance: "Strong",
      summary: "Rejections for missing papers can usually be reopened by submitting them. Insurers should not reject only for delayed documents if the claim is otherwise genuine.",
      points: [
        "Ask for the exact list of documents still needed in writing.",
        "Send them with a covering letter and keep proof of delivery.",
      ],
      documents: ["Requested documents", "Proof of earlier submission", "Claim form"],
    },
    other: {
      chance: "Uncertain",
      summary: "We could not map this to a common reason. A clear written appeal asking the insurer to explain their decision with policy clauses is still a good first step.",
      points: ["Ask for the policy clause relied upon.", "Request all claim documents and reports used in the decision."],
      documents: ["Rejection letter", "Policy wording", "Discharge summary and bills"],
    },
  };
  return map[c.reason];
}

export const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

export function letterText(c: Claim, a: Analysis) {
  const r = REASONS.find((x) => x.id === c.reason)?.label ?? "Other reason";
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return `To,
The Grievance Redressal Officer
${c.insurer || "[Insurer name]"}

Date: ${today}

Subject: Request for review of claim no. ${c.claimNo || "[claim no.]"} under policy no. ${c.policyNo || "[policy no.]"}

Dear Sir/Madam,

I, ${c.name || "[your name]"}, am the policyholder of the above policy. My claim for ${inr(c.amountClaimed)} was ${c.amountPaid > 0 ? `settled for only ${inr(c.amountPaid)}` : "rejected"}, citing "${r}".

I respectfully disagree with this decision for the following reasons:
${a.points.map((p, i) => `${i + 1}. ${p}`).join("\n")}
${c.details ? `\nAdditional facts: ${c.details}\n` : ""}
I request you to:
- Share the specific policy clause and documents relied upon for this decision;
- Review the claim and settle the balance amount of ${inr(Math.max(c.amountClaimed - c.amountPaid, 0))}.

Enclosed: ${a.documents.join("; ")}.

If I do not receive a satisfactory reply within 15 days, I will escalate this to the Bima Bharosa portal and the Insurance Ombudsman as provided under the Insurance Ombudsman Rules, 2017.

Yours faithfully,
${c.name || "[your name]"}`;
}
