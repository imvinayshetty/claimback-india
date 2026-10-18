import type { AiAnalysis } from './claim-documents';
export const ANALYSIS_TIMEOUT_MS = 5 * 60 * 1000;
export const RETENTION_DAYS = 30;
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
export const MAX_DOCUMENTS = 6;
export type QuoteMatch = { status: 'verified' | 'not_found' | 'unverified'; page?: number };
export type QuoteVerification = { clauses: QuoteMatch[]; arguments: QuoteMatch[] };
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
export function matchQuote(quote: string, pages: string[], claimedPage?: string): QuoteMatch {
  const needle = normalize(quote);
  if (!needle || needle.toLowerCase() === 'not found') return { status: 'not_found' };
  if (!pages.some(p => normalize(p))) return { status: 'unverified' };
  if (claimedPage !== undefined) {
    const page = /^\d+$/.test(claimedPage.trim()) ? Number(claimedPage) : 0;
    return page > 0 && normalize(pages[page - 1] ?? '').includes(needle) ? { status: 'verified', page } : { status: 'not_found' };
  }
  const index = pages.findIndex(p => normalize(p).includes(needle));
  return index >= 0 ? { status: 'verified', page: index + 1 } : { status: 'not_found' };
}
export function verifyQuotes(ai: AiAnalysis, pages: string[]): QuoteVerification {
  return { clauses: ai.clauses_cited.map(c => matchQuote(c.quote, pages, c.page)), arguments: ai.arguments.map(a => matchQuote(a.supporting_quote_or_not_found, pages)) };
}
export function groundedAnalysis(ai: AiAnalysis, verification?: QuoteVerification): AiAnalysis {
  return { ...ai, clauses_cited: ai.clauses_cited.filter((_, i) => verification?.clauses[i]?.status === 'verified'),
    arguments: ai.arguments.map((a, i) => ({ ...a, supporting_quote_or_not_found: verification?.arguments[i]?.status === 'verified' ? a.supporting_quote_or_not_found : 'not found' })) };
}
export function analysisExpired(createdAt: string, startedAt?: string | null, now = Date.now()) {
  return now - Date.parse(startedAt ?? createdAt) >= ANALYSIS_TIMEOUT_MS;
}
export function retentionDue(createdAt: string, analyzedAt: string | null, now = Date.now()) {
  return now - Date.parse(analyzedAt ?? createdAt) >= RETENTION_DAYS * 86400000;
}
// Payments remain unavailable until the owner supplies and reviews launch prerequisites.
export const PAYMENTS_READY = false;
