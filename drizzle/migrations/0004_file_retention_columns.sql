ALTER TABLE public.claims ADD COLUMN analyzed_at timestamptz;
ALTER TABLE public.claims ADD COLUMN files_purged_at timestamptz;
UPDATE public.claims SET analyzed_at = created_at WHERE status = 'analyzed' AND analyzed_at IS NULL;
CREATE INDEX claims_purge_due ON public.claims (analyzed_at) WHERE files_purged_at IS NULL;