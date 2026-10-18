ALTER TABLE public.claims ADD COLUMN payment_status text NOT NULL DEFAULT 'none' CHECK (payment_status IN ('none','pending','approved','rejected'));
ALTER TABLE public.claims ADD COLUMN payment_txn_id text;
ALTER TABLE public.claims ADD COLUMN payment_submitted_at timestamptz;
ALTER TABLE public.claims ADD COLUMN letter_generations integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.protect_claim_payment_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user NOT IN ('postgres','service_role','supabase_admin') THEN
    IF NEW.paid IS DISTINCT FROM OLD.paid OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_txn_id IS DISTINCT FROM OLD.payment_txn_id OR NEW.payment_submitted_at IS DISTINCT FROM OLD.payment_submitted_at
       OR NEW.letter_generations IS DISTINCT FROM OLD.letter_generations THEN
      RAISE EXCEPTION 'Payment and letter fields can only be changed by the server';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER claims_protect_payment BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.protect_claim_payment_columns();

CREATE OR REPLACE FUNCTION public.protect_claim_payment_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user NOT IN ('postgres','service_role','supabase_admin') THEN
    NEW.paid := false; NEW.payment_status := 'none'; NEW.payment_txn_id := NULL; NEW.payment_submitted_at := NULL; NEW.letter_generations := 0;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER claims_protect_payment_insert BEFORE INSERT ON public.claims FOR EACH ROW EXECUTE FUNCTION public.protect_claim_payment_insert();