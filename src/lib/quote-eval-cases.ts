import type { QuoteMatch } from './review-rules';
export type QuoteProbe = { id: string; quote: string; pages: string[]; claimedPage?: string; expected: QuoteMatch['status']; page?: number; endPage?: number };
export const quoteEvalCases: QuoteProbe[] = [
  { id: 'printed-page-offset', quote: 'Room rent is limited to 5000.', pages: ['Cover', 'Room rent is limited to 5000.'], claimedPage: '1', expected: 'verified', page: 2 },
  { id: 'page-prefix', quote: 'Room rent is limited to 5000.', pages: ['Cover', 'Room rent is limited to 5000.'], claimedPage: 'Page 2', expected: 'verified', page: 2 },
  { id: 'case', quote: 'ROOM RENT IS LIMITED TO 5000.', pages: ['Room rent is limited to 5000.'], expected: 'verified', page: 1 },
  { id: 'curly-apostrophe', quote: "Insurer's liability", pages: ['Insurer’s liability'], expected: 'verified', page: 1 },
  { id: 'curly-double-quotes', quote: 'The "policy" covers treatment.', pages: ['The “policy” covers treatment.'], expected: 'verified', page: 1 },
  { id: 'line-hyphen', quote: 'Hospitalization expenses are covered.', pages: ['Hospitali-\nzation expenses are covered.'], expected: 'verified', page: 1 },
  { id: 'page-spanning', quote: 'Hospitalization expenses are covered subject to the policy limits.', pages: ['Hospitalization expenses are covered', 'subject to the policy limits.'], expected: 'verified', page: 1, endPage: 2 },
  { id: 'dash', quote: 'Waiting period - 30 days.', pages: ['Waiting period — 30 days.'], expected: 'verified', page: 1 },
  { id: 'whitespace', quote: 'Room rent is limited.', pages: ['Room  rent\n is\tlimited.'], expected: 'verified', page: 1 },
  { id: 'soft-hyphen', quote: 'Hospitalization', pages: ['Hospitali\u00adzation'], expected: 'verified', page: 1 },
  { id: 'ligature', quote: 'Benefits apply.', pages: ['Beneﬁts apply.'], expected: 'verified', page: 1 },
  { id: 'wrong-page', quote: 'Covered treatment', pages: ['Covered treatment'], claimedPage: 'Page 99', expected: 'verified', page: 1 },
  { id: 'unknown-page', quote: 'Covered treatment', pages: ['Cover', 'Covered treatment'], claimedPage: 'not found', expected: 'verified', page: 2 },
  { id: 'near-word', quote: 'Room rent is limited to 5000 per day.', pages: ['Room rent is capped to 5000 per day.'], expected: 'close_match', page: 1 },
  { id: 'amount-mismatch', quote: 'Room rent is limited to 6000 per day.', pages: ['Room rent is limited to 5000 per day.'], expected: 'close_match', page: 1 },
  { id: 'hallucination', quote: 'All hospital treatment is fully refundable without limits.', pages: ['Room rent is limited to 5000.'], expected: 'not_found' },
  { id: 'scanned', quote: 'Room rent is limited to 5000.', pages: [''], expected: 'unverified' },
  { id: 'no-support', quote: 'not found', pages: ['Room rent is limited.'], expected: 'not_found' },
  { id: 'hyphen-preserved', quote: 'Non-payable items are excluded.', pages: ['Non-payable items are excluded.'], expected: 'verified', page: 1 },
  { id: 'empty', quote: '', pages: ['Covered treatment'], expected: 'not_found' },
];
