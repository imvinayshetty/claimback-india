REVOKE ALL ON public.claims, public.claim_files, public.admins FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.admins FROM authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.claims, public.claim_files FROM authenticated;