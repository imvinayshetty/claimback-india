import { extractText, getDocumentProxy } from 'unpdf';
export async function policyTextPages(blob: Blob): Promise<string[]> {
  if (blob.type !== 'application/pdf') return [];
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(await blob.arrayBuffer()));
    const result = await extractText(pdf, { mergePages: false });
    return result.text;
  } catch { return []; }
  finally { if (pdf && "destroy" in pdf && typeof pdf.destroy === "function") await pdf.destroy(); }
}

export function mergePolicyOcr(pages: string[], scanned: { page: number; text: string }[]) {
  const merged = [...pages]; const ocrPages: number[] = [];
  for (const page of scanned) if (page.page >= 1 && page.page <= pages.length && !pages[page.page - 1]?.trim() && page.text.trim()) {
    merged[page.page - 1] = page.text; if (!ocrPages.includes(page.page)) ocrPages.push(page.page);
  }
  return { pages: merged, ocrPages };
}
export async function policyTextWithFallback(blob: Blob, apiKey: string) {
  const pages = await policyTextPages(blob);
  // Corrupt PDFs are rejected by the existing page-count validation before this point.
  const missing = pages.flatMap((text, i) => text.trim() ? [] : [i + 1]);
  if (!missing.length) return { pages, ocrPages: [] as number[] };
  const { transcribePolicy } = await import('./policy-ocr.server');
  return mergePolicyOcr(pages, await transcribePolicy(blob, missing, apiKey));
}
