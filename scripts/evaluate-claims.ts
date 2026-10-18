import { PDFDocument, StandardFonts } from 'pdf-lib';
import { writeFile, mkdir } from 'node:fs/promises';
import { quoteEvalCases } from '../src/lib/quote-eval-cases';
import { matchQuote, verifyQuotes } from '../src/lib/review-rules';
import { analyzeDocuments } from '../src/lib/analyze-claim.server';
const live = process.argv.includes('--live');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const limit = Math.min(20, Math.max(1, Number(limitArg?.split('=')[1] ?? 20)));
const report: { id: string; pass: boolean; output?: unknown; grounded?: number; totalQuotes?: number; details?: unknown }[] = [];
for (const probe of quoteEvalCases) {
  const actual = matchQuote(probe.quote, probe.pages, probe.claimedPage);
  report.push({ id: probe.id, pass: actual.status === probe.expected && (!probe.page || actual.page === probe.page) && (!probe.endPage || actual.endPage === probe.endPage), details: { probe, actual } });
}
if (live) {
  const key = process.env['LOVABLE_API_KEY']; if (!key) throw new Error('AI evaluation needs a server-side key.');
  for (let i = 0; i < limit; i++) {
    const rejected = 2000 + i * 100;
    const policy = `Example Insurance policy SYNTH-${i + 1}. Hospitalization cover Rs 500000. Room rent limit Rs 5000 per day.`;
    const letter = `Example Insurance. Policy SYNTH-${i + 1}. Claim amount Rs 10000. Paid Rs ${10000 - rejected}. Rejected Rs ${rejected} due to room rent limit. No other details provided.`;
    const files = [];
    for (const [kind, text] of [['policy', policy], ['rejection_letter', letter]]) {
      const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica);
      pdf.addPage().drawText(text ?? '', { x: 30, y: 700, size: 10, font, maxWidth: 530 });
      files.push({ kind: kind ?? '', name: `${kind}.pdf`, blob: new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' }) });
    }
    try {
      const output = await analyzeDocuments(files, key);
      const matches = verifyQuotes(output, [policy]);
      const totalQuotes = output.clauses_cited.length + output.arguments.filter(a => a.supporting_quote_or_not_found !== 'not found').length;
      const grounded = [...matches.clauses, ...matches.arguments].filter(m => m.status === 'verified').length;
      report.push({ id: `synthetic-output-${i + 1}`, pass: output.rejected_amount === rejected && output.claim_amount === 10000 && grounded === totalQuotes, output, grounded, totalQuotes });
    } catch (error) {
      // One failed gateway request ends the run; no endpoint/model substitutions or automatic replay.
      report.push({ id: `synthetic-output-${i + 1}`, pass: false, details: { error: error instanceof Error ? error.message.slice(0, 200) : 'Evaluation failed' } });
      break;
    }
  }
}
await mkdir('evals', { recursive: true });
const path = live ? 'evals/live-report.json' : 'evals/matcher-report.json';
await writeFile(path, JSON.stringify({ generatedAt: new Date().toISOString(), mode: live ? 'live' : 'offline', report }, null, 2));
console.log(`${report.filter(r => r.pass).length}/${report.length} passed. Review: ${path}`);
if (report.some(r => !r.pass)) process.exitCode = 1;
