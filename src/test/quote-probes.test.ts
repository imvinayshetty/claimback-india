import { describe, it, expect } from 'vitest';
import { matchQuote, analysisFailure, cleanAnalysisState } from '@/lib/review-rules';
import { quoteEvalCases } from '@/lib/quote-eval-cases';
describe('Uploaded review quote probes', () => {
  for (const probe of quoteEvalCases) it(probe.id, () => {
    const actual = matchQuote(probe.quote, probe.pages, probe.claimedPage);
    expect(actual.status).toBe(probe.expected);
    if (probe.page) expect(actual.page).toBe(probe.page);
    if (probe.endPage) expect(actual.endPage).toBe(probe.endPage);
  });
});
describe('Analysis retry boundaries', () => {
  it('lets users retry transient 429 and 5xx errors without uploading', () => { for (const statusCode of [429, 500, 502, 503]) expect(analysisFailure({ statusCode }).retryable).toBe(true); });
  it('lets users retry a dropped network request', () => expect(analysisFailure(new Error('fetch failed')).retryable).toBe(true));
  it('never retries denials, refusals, unavailable endpoints or credit blocks', () => { for (const statusCode of [400, 401, 402, 403, 404]) expect(analysisFailure({ statusCode }).retryable).toBe(false); expect(analysisFailure(new Error('content refusal')).retryable).toBe(false); });
  it('does not retry invalid or oversized documents', () => expect(analysisFailure(new Error('Each file must be 10 MB or smaller.')).retryable).toBe(false));
  it('removes stale error and retryable data on successful retry', () => expect(cleanAnalysisState({ error: 'old', retryable: true, consent: 'retained' })).toEqual({ consent: 'retained' }));
});
