// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
const connection = process.env['SUPABASE_DB_URL'];
describe.skipIf(!connection)('Hosted database security', () => {
  it('enforces owner reads, prevents client writes and duplicate UTRs', () => {
    if (!connection) return;
    const result = execFileSync('psql', [connection, '-X', '-v', 'ON_ERROR_STOP=1', '-At'], { input: `BEGIN;
INSERT INTO public.claims(id,user_id,status) VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','analyzed'),('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000012','analyzed');
UPDATE public.claims SET payment_txn_id='REVIEW_UNIQUE_REFERENCE' WHERE id='00000000-0000-4000-8000-000000000001';
DO $$ BEGIN
BEGIN UPDATE public.claims SET payment_txn_id='review_unique_reference' WHERE id='00000000-0000-4000-8000-000000000002'; RAISE EXCEPTION 'Duplicate allowed'; EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
SELECT CASE WHEN has_table_privilege('authenticated','public.claims','UPDATE') OR has_table_privilege('authenticated','public.claims','INSERT') OR has_table_privilege('authenticated','public.claim_files','INSERT') THEN 'BAD_WRITES' ELSE 'WRITES_BLOCKED' END;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000011","role":"authenticated"}',true);
SELECT 'OWNER_ROWS='||count(*) FROM public.claims WHERE id IN ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
SELECT 'UNPAID_LETTERS='||count(*) FROM public.claims WHERE id='00000000-0000-4000-8000-000000000001' AND letter_text IS NOT NULL;
RESET ROLE;
ROLLBACK;`, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
    expect(result).toContain('WRITES_BLOCKED'); expect(result).toContain('OWNER_ROWS=1'); expect(result).toContain('UNPAID_LETTERS=0');
  }, 30000);
});
