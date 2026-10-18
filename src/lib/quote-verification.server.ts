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
