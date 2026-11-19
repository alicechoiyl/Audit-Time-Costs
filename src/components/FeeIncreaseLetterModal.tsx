import React, { useState } from 'react';
import { Copy, Check, Printer, X } from 'lucide-react';
import type { AuditEngagement } from '../types/audit';
import {
  calculateRpg7Summary,
  calculateYoYPercent,
  formatDateDisplay,
  formatPercent,
  formatRM,
} from '../utils/rpg7';

interface FeeIncreaseLetterModalProps {
  engagement: AuditEngagement;
  onClose: () => void;
}

export const FeeIncreaseLetterModal: React.FC<FeeIncreaseLetterModalProps> = ({
  engagement,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const rpg7 = calculateRpg7Summary(
    engagement.financials.cy_revenue,
    engagement.financials.cy_assets,
    engagement.financials.cy_expenses,
    engagement.prior_fees.py_audit_fee
  );

  const revYoY = calculateYoYPercent(
    engagement.financials.cy_revenue,
    engagement.financials.py_revenue
  );
  const assetsYoY = calculateYoYPercent(
    engagement.financials.cy_assets,
    engagement.financials.py_assets
  );

  const decidedCy = engagement.approvals.decided_cy_audit_fee ?? engagement.prior_fees.py_audit_fee;
  const decidedNy = engagement.approvals.decided_ny_audit_fee;
  const feeDelta = decidedCy - engagement.prior_fees.py_audit_fee;
  const feeDeltaPct =
    engagement.prior_fees.py_audit_fee > 0
      ? (feeDelta / engagement.prior_fees.py_audit_fee) * 100
      : 0;

  const letterDate = engagement.approvals.partner_approved_at
    ? formatDateDisplay(engagement.approvals.partner_approved_at)
    : formatDateDisplay(new Date().toISOString());

  const plainTextLetter = `MERIDIAN AUDIT PLT (Chartered Accountants, Malaysia)
Date: ${letterDate}
Ref: ${engagement.engagement_id}/FEE-REV

The Board of Directors
${engagement.client_info.client_name}
(${engagement.client_info.registration_no})

Dear Directors,

PROPOSED REVISION OF STATUTORY AUDIT FEE — FINANCIAL YEAR ENDED ${formatDateDisplay(engagement.client_info.fye_date).toUpperCase()}

We thank you for your continued confidence in our firm as statutory auditors of ${engagement.client_info.client_name}.

Following our preliminary assessment of the Company's financial position and statutory audit scope for the financial year ended ${formatDateDisplay(engagement.client_info.fye_date)}, we note that the scale of operations has expanded as follows:
- Gross Revenue: ${formatRM(engagement.financials.py_revenue)} (PY) to ${formatRM(engagement.financials.cy_revenue)} (CY) [${formatPercent(revYoY)}]
- Total Assets (excl. intangibles): ${formatRM(engagement.financials.py_assets)} (PY) to ${formatRM(engagement.financials.cy_assets)} (CY) [${formatPercent(assetsYoY)}]
- Total Operating Expenses: ${formatRM(engagement.financials.py_expenses)} (PY) to ${formatRM(engagement.financials.cy_expenses)} (CY)

In accordance with the Malaysian Institute of Accountants (MIA) Recommended Practice Guide 7 (RPG 7, Revised), the guideline audit fee benchmark applicable to the Company's ${rpg7.highestBenchmark.basis.toLowerCase()} is ${formatRM(rpg7.highestBenchmark.recommendedFee)}${rpg7.highestBenchmark.isNegotiableFloor ? ' (minimum negotiable floor)' : ''}.

To partially align our engagement fee with the expanded audit risk, regulatory compliance requirements, and MIA RPG 7 standards while maintaining a constructive long-term partnership, we propose the following statutory audit fee structure (excluding tax compliance services and out-of-pocket disbursements):
- Prior Year Audit Fee: ${formatRM(engagement.prior_fees.py_audit_fee)}
- Proposed Current Year Audit Fee: ${formatRM(decidedCy)} (${feeDelta >= 0 ? '+' : ''}${formatRM(feeDelta)} / ${formatPercent(feeDeltaPct)})
${decidedNy ? `- Indicative Next Year Audit Fee: ${formatRM(decidedNy)}\n` : ''}${engagement.approvals.fee_variance_reason ? `\nBasis of Revision:\n${engagement.approvals.fee_variance_reason}\n` : ''}
Kindly indicate your agreement by signing and returning the duplicate copy of this letter prior to the commencement of fieldwork on ${formatDateDisplay(engagement.schedule.commencement_date)}.

Yours faithfully,
${engagement.team_assignment.partner_name}
Managing Audit Partner
Meridian Audit PLT`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainTextLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored silently
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        {/* Top Modal Action Bar */}
        <div className="no-print flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Letter of Proposed Audit Fee Increase
            </h2>
            <p className="text-xs text-slate-500">
              MIA RPG 7 (Revised) Client Fee Proposal · {engagement.engagement_id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1E3A5F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#162d4a] transition-colors whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Letter
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              aria-label="Close letter preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="overflow-y-auto px-10 py-8 text-sm leading-relaxed text-slate-800">
          <div className="flex items-start justify-between border-b border-slate-300 pb-5">
            <div>
              <p className="text-base font-bold tracking-tight text-slate-900">
                MERIDIAN AUDIT PLT
              </p>
              <p className="text-xs text-slate-500">
                Chartered Accountants (AF 002194) · Kuala Lumpur, Malaysia
              </p>
            </div>
            <div className="text-right font-mono text-xs text-slate-600 tabular-nums">
              <p>Date: {letterDate}</p>
              <p>Ref: {engagement.engagement_id}/FEE-REV</p>
            </div>
          </div>

          <div className="mt-6 space-y-1 text-sm">
            <p className="font-semibold text-slate-900">The Board of Directors</p>
            <p className="font-semibold text-slate-900">{engagement.client_info.client_name}</p>
            <p className="text-xs text-slate-500">
              Registration No: {engagement.client_info.registration_no || '—'}
            </p>
          </div>

          <p className="mt-6">Dear Directors,</p>

          <p className="mt-4 font-semibold text-slate-900 underline underline-offset-4">
            PROPOSED REVISION OF STATUTORY AUDIT FEE FOR THE FINANCIAL YEAR ENDED{' '}
            {formatDateDisplay(engagement.client_info.fye_date).toUpperCase()}
          </p>

          <p className="mt-4">
            We thank you for your continued confidence in our firm as statutory auditors of{' '}
            <span className="font-medium text-slate-900">{engagement.client_info.client_name}</span>.
            Following our review of the Company&apos;s current year financial profile and statutory
            audit scope, we summarize the key financial indicators driving our engagement time and
            regulatory work requirements:
          </p>

          {/* Financial Growth Table */}
          <table className="mt-4 w-full border-collapse border border-slate-200 text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Financial Indicator</th>
                <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Prior Year (RM)</th>
                <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Current Year (RM)</th>
                <th className="border border-slate-200 px-3 py-2 text-right font-semibold">YoY Change</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-sans text-slate-800">Gross Revenue</td>
                <td className="border border-slate-200 px-3 py-2 text-right">{formatRM(engagement.financials.py_revenue)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right font-medium text-slate-900">{formatRM(engagement.financials.cy_revenue)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right">{formatPercent(revYoY)}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-sans text-slate-800">Total Assets (Excl. Intangibles)</td>
                <td className="border border-slate-200 px-3 py-2 text-right">{formatRM(engagement.financials.py_assets)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right font-medium text-slate-900">{formatRM(engagement.financials.cy_assets)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right">{formatPercent(assetsYoY)}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-sans text-slate-800">Total Operating Expenses</td>
                <td className="border border-slate-200 px-3 py-2 text-right">{formatRM(engagement.financials.py_expenses)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right font-medium text-slate-900">{formatRM(engagement.financials.cy_expenses)}</td>
                <td className="border border-slate-200 px-3 py-2 text-right">
                  {formatPercent(
                    calculateYoYPercent(
                      engagement.financials.cy_expenses,
                      engagement.financials.py_expenses
                    )
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mt-4">
            Under the <span className="font-medium text-slate-900">Malaysian Institute of Accountants (MIA) Recommended Practice Guide 7 (RPG 7, Revised)</span>,
            the recommended statutory audit fee benchmark based on the Company&apos;s{' '}
            {rpg7.highestBenchmark.basis.toLowerCase()} is{' '}
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {formatRM(rpg7.highestBenchmark.recommendedFee)}
            </span>
            {rpg7.highestBenchmark.isNegotiableFloor ? ' (minimum negotiable floor)' : ''}.
          </p>

          {/* Proposed Fee Summary Box */}
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50/70 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Prior Year Audit Fee</p>
                <p className="mt-0.5 font-mono text-base font-semibold text-slate-700 tabular-nums">
                  {formatRM(engagement.prior_fees.py_audit_fee)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Proposed Current Year Fee</p>
                <p className="mt-0.5 font-mono text-base font-bold text-[#1E3A5F] tabular-nums">
                  {formatRM(decidedCy)}
                </p>
                <p className="font-mono text-xs text-slate-500 tabular-nums">
                  {feeDelta >= 0 ? '+' : ''}
                  {formatRM(feeDelta)} ({formatPercent(feeDeltaPct)})
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Indicative Next Year Fee</p>
                <p className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                  {decidedNy ? formatRM(decidedNy) : 'To be confirmed'}
                </p>
              </div>
            </div>
            {engagement.approvals.fee_variance_reason && (
              <p className="mt-3 border-t border-slate-200 pt-2.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Basis of Revision: </span>
                {engagement.approvals.fee_variance_reason}
              </p>
            )}
          </div>

          <p className="mt-4 text-xs text-slate-600">
            Note: The statutory audit fee above is isolated from tax compliance services
            {engagement.prior_fees.tax_handled_by_firm
              ? ` (prior year tax fee: ${formatRM(engagement.prior_fees.py_tax_fee)})`
              : ' (tax compliance not handled by firm)'}
            , SST, and out-of-pocket disbursements.
          </p>

          <p className="mt-4">
            Kindly confirm your acceptance of the proposed statutory audit fee prior to fieldwork
            commencement on{' '}
            <span className="font-medium text-slate-900">
              {formatDateDisplay(engagement.schedule.commencement_date)}
            </span>
            .
          </p>

          <div className="mt-8 grid grid-cols-2 gap-8 pt-4">
            <div>
              <p>Yours faithfully,</p>
              <div className="mt-10 border-t border-slate-400 pt-2">
                <p className="font-semibold text-slate-900">
                  {engagement.team_assignment.partner_name}
                </p>
                <p className="text-xs text-slate-500">Managing Audit Partner · Meridian Audit PLT</p>
              </div>
            </div>
            <div>
              <p>Acknowledged &amp; Agreed by:</p>
              <div className="mt-10 border-t border-slate-400 pt-2">
                <p className="font-semibold text-slate-900">Authorised Director Signatory</p>
                <p className="text-xs text-slate-500">For and on behalf of {engagement.client_info.client_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
