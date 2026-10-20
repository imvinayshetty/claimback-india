DROP TRIGGER IF EXISTS claims_require_pilot_invitation ON public.claims;
DROP TRIGGER IF EXISTS analysis_runs_require_pilot_invitation ON public.analysis_runs;
COMMENT ON TABLE public.pilot_testers IS 'DEPRECATED: unused invitation structure; access restriction requires owner approval before activation.';