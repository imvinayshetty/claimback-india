CREATE TABLE public.analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  claim_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.analysis_runs TO authenticated;
GRANT ALL ON public.analysis_runs TO service_role;
ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY analysis_runs_select_own ON public.analysis_runs FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY analysis_runs_insert_own ON public.analysis_runs FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE INDEX analysis_runs_user_time ON public.analysis_runs (user_id, created_at DESC);
UPDATE public.claims SET reason_category = CASE reason_category WHEN 'ped' THEN 'pre_existing' WHEN 'room_rent' THEN 'room_rent_proportionate' WHEN 'non_payable' THEN 'non_payable_items' WHEN 'waiting' THEN 'waiting_period' WHEN 'documents' THEN 'documentation' ELSE reason_category END
 WHERE reason_category IN ('ped','room_rent','non_payable','waiting','documents');
UPDATE public.claims SET case_strength = CASE case_strength WHEN 'Strong' THEN 'strong' WHEN 'Fair' THEN 'moderate' WHEN 'Uncertain' THEN 'unclear' ELSE case_strength END
 WHERE case_strength IN ('Strong','Fair','Uncertain');