import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // API Endpoint for Gemini Financial Extraction
  app.post('/api/extract-financials', async (req, res) => {
    try {
      const { documents } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

      if (!apiKey) {
        return res.status(400).json({ error: 'GEMINI_API_KEY or API_KEY is not configured on the server environment.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
      });

      const parts: any[] = [];
      for (const doc of (documents || [])) {
        const commaIdx = doc.data_url.indexOf(',');
        const base64Data = commaIdx >= 0 ? doc.data_url.slice(commaIdx + 1) : doc.data_url;
        const mime = doc.mime_type || 'application/octet-stream';

        if (mime.includes('text') || doc.file_name.endsWith('.csv') || doc.file_name.endsWith('.txt')) {
          try {
            const decodedText = Buffer.from(base64Data, 'base64').toString('utf-8');
            parts.push({
              text: `[Attached Document - Category: ${doc.category}, File: ${doc.file_name}]\n${decodedText}`,
            });
          } catch {
            parts.push({
              inlineData: { data: base64Data, mimeType: mime },
            });
          }
        } else if (mime.includes('pdf') || mime.includes('image') || mime.includes('webp')) {
          parts.push({
            inlineData: { data: base64Data, mimeType: mime },
          });
          parts.push({
            text: `[Above file is categorized as: ${doc.category}, Filename: ${doc.file_name}]`,
          });
        } else {
          parts.push({
            inlineData: { data: base64Data, mimeType: mime },
          });
        }
      }

      const prompt = `You are an expert Malaysian financial auditor assistant specializing in MIA (Malaysian Institute of Accountants) audit documentation and RPG 7 compliance.
Analyze the attached client audit evidence documents categorized into PY Financial Statements, CY Financial Statements, and Quotations.
Extract the following exact comparative figures:
1. client_name: Company name if found.
2. fye_date: Financial year end date in YYYY-MM-DD format if found.
3. py_revenue: Previous Year Gross Revenue / Turnover (from PY Financial Statements).
4. cy_revenue: Current Year Gross Revenue / Turnover (from CY Financial Statements).
5. py_assets: Previous Year Total Assets EXCLUDING Goodwill and Intangible Assets (Non-Current Assets + Current Assets - Intangibles/Goodwill).
6. cy_assets: Current Year Total Assets EXCLUDING Goodwill and Intangibles.
7. py_expenses: Previous Year Total Operating Expenses EXCLUDING Cost of Sales / Direct Costs (Admin expenses, selling & distribution expenses, other operating expenses).
8. cy_expenses: Current Year Total Operating Expenses EXCLUDING Cost of Sales / Direct Costs.
9. quotation_ref: Quotation reference number if quotation document is present.
10. quotation_date: Quotation date in YYYY-MM-DD format if present.
11. quoted_audit_fee: Quoted audit fee amount in RM if present.
12. extraction_notes: Brief audit note explaining line item mapping and exclusions (e.g. how Intangible Assets / Goodwill were excluded from Assets, and how Cost of Sales was excluded from Operating Expenses).

Return strict JSON matching the schema. Return numbers as plain numbers in RM without currency symbols or commas. If a number is not found, return 0.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [...parts, { text: prompt }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              client_name: { type: Type.STRING },
              fye_date: { type: Type.STRING },
              py_revenue: { type: Type.NUMBER },
              cy_revenue: { type: Type.NUMBER },
              py_assets: { type: Type.NUMBER },
              cy_assets: { type: Type.NUMBER },
              py_expenses: { type: Type.NUMBER },
              cy_expenses: { type: Type.NUMBER },
              quotation_ref: { type: Type.STRING },
              quotation_date: { type: Type.STRING },
              quoted_audit_fee: { type: Type.NUMBER },
              extraction_notes: { type: Type.STRING },
            },
            required: [
              'client_name',
              'fye_date',
              'py_revenue',
              'cy_revenue',
              'py_assets',
              'cy_assets',
              'py_expenses',
              'cy_expenses',
              'extraction_notes',
            ],
          },
        },
      });

      const text = response.text;
      if (!text) {
        return res.status(500).json({ error: 'No response received from Gemini model.' });
      }

      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error('Gemini extraction error:', err);
      const errMsg = err.message || '';
      if (errMsg.includes('API key') || errMsg.includes('API_KEY') || errMsg.includes('INVALID_ARGUMENT') || errMsg.includes('400')) {
        return res.status(400).json({ error: 'Gemini API key is invalid or missing. Please configure a valid Gemini API key using the "Gemini AI: Configure Key" button in the top header.' });
      }
      res.status(500).json({ error: errMsg || 'Internal server error during Gemini extraction.' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
