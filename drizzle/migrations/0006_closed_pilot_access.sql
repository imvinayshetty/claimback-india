CREATE TABLE public.pilot_testers (
 user_id uuid PRIMARY KEY,
 email text NOT NULL UNIQUE CHECK (email = lower(email)),
 invited_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pilot_testers TO authenticated;
GRANT ALL ON public.pilot_testers TO service_role;
ALTER TABLE public.pilot_testers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Testers read their own invitation" ON public.pilot_testers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE FUNCTION public.enforce_pilot_invitation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.pilot_testers WHERE user_id = NEW.user_id) THEN
  RAISE EXCEPTION 'ClaimBack is currently limited to invited testers.' USING ERRCODE = '42501';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_pilot_invitation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_pilot_invitation() TO service_role;
CREATE TRIGGER claims_require_pilot_invitation BEFORE INSERT ON public.claims FOR EACH ROW EXECUTE FUNCTION public.enforce_pilot_invitation();
CREATE TRIGGER analysis_runs_require_pilot_invitation BEFORE INSERT ON public.analysis_runs FOR EACH ROW EXECUTE FUNCTION public.enforce_pilot_invitation();