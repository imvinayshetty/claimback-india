// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
const migration = readFileSync('drizzle/migrations/0005_review_security_and_analysis_recovery.sql', 'utf8');
describe('Offline security migration contracts (not hosted verification)', () => {
  it('revokes direct claim and file writes from authenticated clients', () => { for (const table of ['claims','claim_files']) expect(migration).toMatch(new RegExp(`REVOKE INSERT, UPDATE, DELETE ON public\\.${table} FROM authenticated;`)); });
  it('restricts analysis reservation to the service role', () => { expect(migration).toContain('REVOKE ALL ON FUNCTION public.reserve_claim_analysis(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;'); expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.reserve_claim_analysis(uuid,uuid,boolean) TO service_role;'); });
  it('indexes normalized payment references uniquely', () => expect(migration).toContain('CREATE UNIQUE INDEX claims_unique_payment_reference ON public.claims (upper(trim(payment_txn_id))) WHERE payment_txn_id IS NOT NULL;'));
});
