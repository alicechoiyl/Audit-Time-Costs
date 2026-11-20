import type { EngagementDocument } from '../types/audit';

export interface ExtractedFinancials {
  client_name: string;
  fye_date: string;
  py_revenue: number;
  cy_revenue: number;
  py_assets: number;
  cy_assets: number;
  py_expenses: number;
  cy_expenses: number;
  quotation_ref?: string;
  quotation_date?: string;
  quoted_audit_fee?: number;
  extraction_notes: string;
}

export async function extractFinancialsFromEngagementDocs(documents: EngagementDocument[]): Promise<ExtractedFinancials> {
  const response = await fetch('/api/extract-financials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documents,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to extract financials from Gemini server.');
  }

  return data as ExtractedFinancials;
}

export async function extractFinancialsFromFiles(files: File[]): Promise<ExtractedFinancials> {
  const docs: EngagementDocument[] = await Promise.all(
    files.map(async (file, idx) => {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      return {
        id: `legacy-${idx}`,
        file_name: file.name,
        category: 'CY_FINANCIAL_STATEMENTS',
        mime_type: file.type || 'application/octet-stream',
        file_size_bytes: file.size,
        data_url: dataUrl,
        uploaded_by_id: 'legacy',
        uploaded_by_name: 'Legacy',
        uploaded_at: new Date().toISOString(),
      };
    })
  );
  return extractFinancialsFromEngagementDocs(docs);
}
