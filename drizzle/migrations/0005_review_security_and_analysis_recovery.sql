CREATE TABLE public.submission_runs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.submission_runs TO service_role;
ALTER TABLE public.submission_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX submission_runs_user_time ON public.submission_runs(user_id, created_at);
ALTER TABLE public.claims ADD COLUMN analysis_started_at timestamptz;
ALTER TABLE public.claims ADD COLUMN analysis_lease_id uuid;
CREATE UNIQUE INDEX claims_unique_payment_reference ON public.claims (upper(trim(payment_txn_id))) WHERE payment_txn_id IS NOT NULL;
REVOKE INSERT, UPDATE, DELETE ON public.claims FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.claim_files FROM authenticated;
REVOKE INSERT ON public.analysis_runs FROM authenticated;
GRANT SELECT ON public.claims, public.claim_files, public.analysis_runs, public.admins TO authenticated;
GRANT ALL ON public.claims, public.claim_files, public.analysis_runs, public.admins TO service_role;
ALTER POLICY claim_docs_insert_own ON storage.objects WITH CHECK (false);
ALTER POLICY claim_docs_update_own ON storage.objects USING (false) WITH CHECK (false);
CREATE OR REPLACE FUNCTION public.limit_claim_submissions() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text,0));
 IF (SELECT count(*) FROM public.submission_runs WHERE user_id=NEW.user_id AND created_at>now()-interval '1 day') >= 15 THEN RAISE EXCEPTION 'You can submit at most 15 claims per day.'; END IF;
 INSERT INTO public.submission_runs(user_id) VALUES(NEW.user_id);
 RETURN NEW;
END $$;
CREATE TRIGGER claims_limit_submissions BEFORE INSERT ON public.claims FOR EACH ROW EXECUTE FUNCTION public.limit_claim_submissions();
CREATE OR REPLACE FUNCTION public.reserve_claim_analysis(p_id uuid,p_user uuid,p_retry boolean DEFAULT false) RETURNS SETOF public.claims LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.claims;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 SELECT * INTO c FROM public.claims WHERE id=p_id AND user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found'; END IF;
 IF c.status='analyzed' THEN RETURN; END IF;
 IF c.status='failed' AND (NOT p_retry OR coalesce((c.analysis_json->>'retryable')::boolean,false)=false) THEN RETURN; END IF;
 IF c.analysis_started_at > now()-interval '5 minutes' AND c.status='processing' THEN RETURN; END IF;
 IF (SELECT count(*) FROM public.analysis_runs WHERE user_id=p_user AND created_at>now()-interval '1 hour')>=5 THEN RAISE EXCEPTION 'You can run 5 analyses per hour.'; END IF;
 IF (SELECT count(*) FROM public.analysis_runs WHERE user_id=p_user AND created_at>now()-interval '1 day')>=15 THEN RAISE EXCEPTION 'You can run 15 analyses per day.'; END IF;
 INSERT INTO public.analysis_runs(user_id,claim_id) VALUES(p_user,p_id);
 RETURN QUERY UPDATE public.claims SET status='processing',analysis_started_at=now(),analysis_lease_id=gen_random_uuid(),analysis_json=coalesce(analysis_json,'{}'::jsonb)-'error'-'retryable' WHERE id=p_id AND user_id=p_user RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.reserve_claim_analysis(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_claim_analysis(uuid,uuid,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.refund_letter_slot(p_id uuid,p_user uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ UPDATE public.claims SET letter_generations=greatest(0,letter_generations-1) WHERE id=p_id AND user_id=p_user; $$;
REVOKE ALL ON FUNCTION public.refund_letter_slot(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refund_letter_slot(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.protect_claim_payment_columns() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' AND current_user NOT IN ('postgres','service_role','supabase_admin') THEN
  IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Claims may only be changed through authenticated server actions'; END IF;
 END IF;
 IF NOT NEW.paid THEN NEW.letter_text := NULL; END IF;
 RETURN NEW;
END $$;