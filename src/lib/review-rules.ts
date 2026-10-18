import type { AiAnalysis } from './claim-documents';
export const ANALYSIS_TIMEOUT_MS = 5 * 60 * 1000;
export const RETENTION_DAYS = 30;
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
export const MAX_DOCUMENTS = 6;
export type QuoteMatch = { status: 'verified' | 'close_match' | 'not_found' | 'unverified'; page?: number; endPage?: number; source?: 'pdf' | 'ocr' };
export type QuoteVerification = { clauses: QuoteMatch[]; arguments: QuoteMatch[] };
export const normalizeQuote = (text: string) => text.normalize('NFKC')
  .replace(/\u00ad/g, '').replace(/(\p{L})[-‐‑]\s*\r?\n\s*(?=\p{L})/gu, '$1')
  .replace(/[‘’`]/g, "'").replace(/[“”]/g, '"').replace(/[–—−‐‑]/g, '-')
  .toLowerCase().replace(/\s+/g, ' ').trim();
export function parsePolicyPage(value?: string) {
  const match = value?.trim().match(/^(?:page\s*)?(\d+)$/i);
  return match ? Number(match[1]) : undefined;
}
function distance(a: string[], b: string[]) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min((next[j - 1] ?? 0) + 1, (previous[j] ?? 0) + 1, (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = next;
  }
  return previous[b.length] ?? a.length;
}
export function matchQuote(quote: string, pages: string[], claimedPage?: string, ocrPages: number[] = []): QuoteMatch {
  const needle = normalizeQuote(quote);
  if (!needle || needle === 'not found') return { status: 'not_found' };
  const normalized = pages.map(normalizeQuote);
  if (!normalized.some(Boolean)) return { status: 'unverified' };
  const hinted = parsePolicyPage(claimedPage);
  const order = normalized.map((_, i) => i);
  if (hinted && hinted <= pages.length) { order.splice(hinted - 1, 1); order.unshift(hinted - 1); }
  const found = (page: number, endPage = page): QuoteMatch => ({ status: ocrPages.some(p => p >= page && p <= endPage) ? 'close_match' : 'verified', page, ...(endPage !== page ? { endPage } : {}), source: ocrPages.some(p => p >= page && p <= endPage) ? 'ocr' : 'pdf' });
  for (const index of order) if (normalized[index]?.includes(needle)) return found(index + 1);
  // Search the continuous document too; actual PDF pages, not printed numbering, are reported.
  const joined = normalized.join(' ');
  const offset = joined.indexOf(needle);
  if (offset >= 0) {
    let cursor = 0; let start = 1; let end = 1;
    normalized.forEach((text, index) => { if (offset >= cursor) start = index + 1; if (offset + needle.length - 1 >= cursor) end = index + 1; cursor += text.length + 1; });
    return found(start, end);
  }
  const words = needle.split(' ');
  // Only flag near matches for review. Numbers and negation may differ: NEVER auto-ground this tier.
  if (words.length >= 5 && words.length <= 160) for (const index of order) {
    const tokens = (normalized[index] ?? '').split(' ').slice(0, 12000);
    for (let i = 0; i <= tokens.length - words.length; i++) {
      if (tokens[i] !== words[0]) continue;
      if (distance(words, tokens.slice(i, i + words.length)) <= Math.max(1, Math.floor(words.length * 0.1))) return { status: 'close_match', page: index + 1, source: ocrPages.includes(index + 1) ? 'ocr' : 'pdf' };
    }
  }
  return { status: 'not_found' };
}
export function verifyQuotes(ai: AiAnalysis, pages: string[], ocrPages: number[] = []): QuoteVerification {
  return { clauses: ai.clauses_cited.map(c => matchQuote(c.quote, pages, c.page, ocrPages)), arguments: ai.arguments.map(a => matchQuote(a.supporting_quote_or_not_found, pages, undefined, ocrPages)) };
}
export function groundedAnalysis(ai: AiAnalysis, verification?: QuoteVerification): AiAnalysis {
  return { ...ai, clauses_cited: ai.clauses_cited.flatMap((c, i) => { const match = verification?.clauses[i]; return match?.status === 'verified' ? [{ ...c, page: match.endPage ? `${match.page}-${match.endPage}` : String(match.page) }] : []; }),
    arguments: ai.arguments.map((a, i) => ({ ...a, supporting_quote_or_not_found: verification?.arguments[i]?.status === 'verified' ? a.supporting_quote_or_not_found : 'not found' })) };
}
export function cleanAnalysisState<T>(json: Record<string, T>) {
  const { error: _error, retryable: _retryable, ...clean } = json;
  return clean;
}
export function analysisFailure(error: unknown): { retryable: boolean; message: string } {
  const status = error && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : undefined;
  const text = error instanceof Error ? error.message : '';
  const refused = /refus(?:al|ed)|content.?filter|provider.*deni|permission_error/i.test(text);
  if (refused || status === 401 || status === 402 || status === 403 || status === 404) return { retryable: false, message: 'Document analysis is unavailable because of a service configuration, access restriction or refusal. Please contact support.' };
  if (status === 400 || /pages\.|10 MB|20 MB|at most 6|Choose one|document.*required|could not be read|Invalid document|not configured/i.test(text)) return { retryable: false, message: text || 'Your documents could not be processed. Please check them before submitting again.' };
  if (status !== undefined && status !== 429 && status < 500) return { retryable: false, message: 'The service rejected this request. Please contact support.' };
  return { retryable: true, message: 'The review was interrupted by a temporary problem. You can retry using the same documents; analysis limits still apply.' };
}
export function analysisExpired(createdAt: string, startedAt?: string | null, now = Date.now()) {
  return now - Date.parse(startedAt ?? createdAt) >= ANALYSIS_TIMEOUT_MS;
}
export function retentionDue(createdAt: string, analyzedAt: string | null, now = Date.now()) {
  return now - Date.parse(analyzedAt ?? createdAt) >= RETENTION_DAYS * 86400000;
}
// Payments remain unavailable until the owner supplies and reviews launch prerequisites.
export const PAYMENTS_READY = false;
