CREATE TABLE public.claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','analyzed','failed')),
 insurer text,
 claim_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (claim_amount >= 0),
 rejected_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (rejected_amount >= 0 AND rejected_amount <= claim_amount),
 reason_category text,
 case_strength text,
 analysis_json jsonb,
 letter_text text,
 paid boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY claims_select_own ON public.claims FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY claims_insert_own ON public.claims FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY claims_update_own ON public.claims FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY claims_delete_own ON public.claims FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE INDEX claims_user_created_idx ON public.claims (user_id, created_at DESC);

CREATE TABLE public.claim_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 claim_id uuid NOT NULL,
 user_id uuid NOT NULL DEFAULT auth.uid(),
 kind text NOT NULL CHECK (kind IN ('rejection_letter','policy','other')),
 storage_path text NOT NULL UNIQUE,
 FOREIGN KEY (claim_id, user_id) REFERENCES public.claims(id, user_id) ON DELETE CASCADE,
 CHECK (split_part(storage_path, '/', 1) = user_id::text AND split_part(storage_path, '/', 2) = claim_id::text AND split_part(storage_path, '/', 3) <> '')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_files TO authenticated;
GRANT ALL ON public.claim_files TO service_role;
ALTER TABLE public.claim_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY claim_files_select_own ON public.claim_files FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY claim_files_insert_own ON public.claim_files FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY claim_files_update_own ON public.claim_files FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY claim_files_delete_own ON public.claim_files FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE INDEX claim_files_claim_owner_idx ON public.claim_files (claim_id, user_id);

CREATE TABLE public.admins (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE CHECK (email = lower(email)),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY admins_read_self ON public.admins FOR SELECT TO authenticated USING (email = lower((SELECT auth.jwt()) ->> 'email'));

CREATE POLICY claim_docs_select_own ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id = 'claim-docs' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
CREATE POLICY claim_docs_insert_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id = 'claim-docs' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
 AND EXISTS (SELECT 1 FROM public.claims c WHERE c.user_id = (SELECT auth.uid()) AND c.id::text = (storage.foldername(name))[2])
);
CREATE POLICY claim_docs_update_own ON storage.objects FOR UPDATE TO authenticated USING (
 bucket_id = 'claim-docs' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
) WITH CHECK (
 bucket_id = 'claim-docs' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
 AND EXISTS (SELECT 1 FROM public.claims c WHERE c.user_id = (SELECT auth.uid()) AND c.id::text = (storage.foldername(name))[2])
);
CREATE POLICY claim_docs_delete_own ON storage.objects FOR DELETE TO authenticated USING (
 bucket_id = 'claim-docs' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);