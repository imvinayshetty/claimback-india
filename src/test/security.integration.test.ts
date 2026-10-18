// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
const connection = process.env['SUPABASE_DB_URL'];
describe('Hosted database security', () => {
  it('denies direct client writes and protects privileged analysis functions', () => {
    if (!connection) {
      const raw = execFileSync('lovable', ['supabase', 'query', `SELECT
        NOT has_table_privilege('authenticated','public.claims','INSERT,UPDATE,DELETE') AND NOT has_table_privilege('authenticated','public.claim_files','INSERT,UPDATE,DELETE') AS writes_blocked,
        NOT has_function_privilege('authenticated','public.reserve_claim_analysis(uuid,uuid,boolean)','EXECUTE') AS privileged_rpc,
        EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='claims_unique_payment_reference' AND indexdef LIKE '%UNIQUE%') AS unique_utr,
        EXISTS (SELECT 1 FROM storage.buckets WHERE id='claim-docs' AND public=false AND file_size_limit=10485760) AS private_bucket;`, '--json'], { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
      const result = JSON.parse(raw).rows[0];
      expect(result).toEqual({ writes_blocked: true, privileged_rpc: true, unique_utr: true, private_bucket: true });
      return;
    }
    const url = new URL(connection);
    const result = execFileSync('psql', ['-X','-v','ON_ERROR_STOP=1','-At'], { env: { ...process.env, PGHOST: url.hostname, PGPORT: url.port, PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: url.pathname.slice(1) }, input: `SELECT CASE WHEN has_table_privilege('authenticated','public.claims','UPDATE') OR has_table_privilege('authenticated','public.claims','INSERT') OR has_table_privilege('authenticated','public.claim_files','INSERT') THEN 'BAD_WRITES' ELSE 'WRITES_BLOCKED' END;
SELECT 'PRIVILEGED_RPC='||has_function_privilege('authenticated','public.reserve_claim_analysis(uuid,uuid,boolean)','EXECUTE');
SELECT 'UNIQUE_UTR='||count(*) FROM pg_indexes WHERE schemaname='public' AND indexname='claims_unique_payment_reference' AND indexdef LIKE '%UNIQUE%';
SELECT 'PRIVATE_BUCKET='||count(*) FROM storage.buckets WHERE id='claim-docs' AND public=false AND file_size_limit=10485760;`, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
    expect(result).toContain('WRITES_BLOCKED'); expect(result).toContain('PRIVILEGED_RPC=false'); expect(result).toContain('UNIQUE_UTR=1'); expect(result).toContain('PRIVATE_BUCKET=1');
  }, 30000);
});
