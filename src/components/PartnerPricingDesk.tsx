import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, RotateCcw, FileText, AlertTriangle } from 'lucide-react';
import type { AuditEngagement } from '../types/audit';
import {
  calculateRpg7Summary,
  formatRM,
  getRangePositionLabel,
} from '../utils/rpg7';

interface PartnerPricingDeskProps {
  engagement: AuditEngagement;
  canApprove: boolean;
  onApprovePartner: (payload: {
    decidedCyFee: number;
    decidedNyFee: number;
    varianceReason: string;
  }) => void;
  onReturnToPic: (reason: string) => void;
  onOpenLetter: () => void;
}

export const PartnerPricingDesk: React.FC<PartnerPricingDeskProps> = ({
  engagement,
  canApprove,
  onApprovePartner,
  onReturnToPic,
  onOpenLetter,
}) => {
  const rpg7 = calculateRpg7Summary(
    engagement.financials.cy_revenue,
    engagement.financials.cy_assets,
    engagement.financials.cy_expenses,
    engagement.prior_fees.py_audit_fee
  );

  const budgetedTimeCost = Math.round(
    engagement.time_budget.total_planned_hours * engagement.time_budget.charge_out_rate
  );

  const defaultSuggestedCy =
    engagement.approvals.decided_cy_audit_fee ??
    (engagement.quotation.quotation_issued && engagement.quotation.quotation_type === 'FIXED'
      ? engagement.quotation.fixed_audit_fee
      : Math.max(engagement.prior_fees.py_audit_fee, Math.round(rpg7.highestBenchmark.recommendedFee * 0.75)));

  const defaultSuggestedNy =
    engagement.approvals.decided_ny_audit_fee ??
    Math.min(rpg7.highestBenchmark.recommendedFee, Math.round(defaultSuggestedCy * 1.15));

  const [decidedCyFee, setDecidedCyFee] = useState<number>(defaultSuggestedCy);
  const [decidedNyFee, setDecidedNyFee] = useState<number>(defaultSuggestedNy);
  const [varianceReason, setVarianceReason] = useState<string>(
    engagement.approvals.fee_variance_reason || ''
  );
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [formError, setFormError] = useState('');
  const [expandedScale, setExpandedScale] = useState<'revenue' | 'assets' | 'expenses' | null>(null);

  const isBindingFixedQuote =
    engagement.quotation.quotation_issued && engagement.quotation.quotation_type === 'FIXED';
  const isRangeQuote =
    engagement.quotation.quotation_issued && engagement.quotation.quotation_type === 'GENERAL_RANGE';

  const exceedsFixedQuote =
    isBindingFixedQuote && decidedCyFee > engagement.quotation.fixed_audit_fee;

  const rangePosition = isRangeQuote
    ? getRangePositionLabel(
        rpg7.highestBenchmark.recommendedFee,
        engagement.quotation.range_audit_min,
        engagement.quotation.range_audit_max
      )
    : null;

  // Chart data comparing PY Fee, Quotation, Budgeted Time Cost, and the 3 MIA RPG 7 Benchmarks
  const chartData: { name: string; amount: number; fill: string }[] = [
    { name: 'PY Audit Fee', amount: engagement.prior_fees.py_audit_fee, fill: '#64748b' },
    { name: 'PIC Time Cost', amount: budgetedTimeCost, fill: '#475569' },
  ];

  if (isBindingFixedQuote) {
    chartData.push({
      name: 'Fixed Quote',
      amount: engagement.quotation.fixed_audit_fee,
      fill: '#0284c7',
    });
  } else if (isRangeQuote) {
    chartData.push({
      name: 'Quote Min',
      amount: engagement.quotation.range_audit_min,
      fill: '#38bdf8',
    });
    chartData.push({
      name: 'Quote Max',
      amount: engagement.quotation.range_audit_max,
      fill: '#0284c7',
    });
  }

  chartData.push(
    { name: 'RPG 7 OpEx', amount: rpg7.expenses.recommendedFee, fill: '#94a3b8' },
    { name: 'RPG 7 Assets', amount: rpg7.assets.recommendedFee, fill: '#334155' },
    { name: 'RPG 7 Revenue', amount: rpg7.revenue.recommendedFee, fill: '#1E3A5F' }
  );

  if (engagement.approvals.decided_cy_audit_fee) {
    chartData.push({
      name: 'Decided CY',
      amount: engagement.approvals.decided_cy_audit_fee,
      fill: '#16a34a',
    });
  }

  const handleApproveSubmit = () => {
    setFormError('');
    if (!Number.isFinite(decidedCyFee) || decidedCyFee <= 0) {
      setFormError('Please enter a valid Decided Current Year Proposed Audit Fee.');
      return;
    }
    if (!Number.isFinite(decidedNyFee) || decidedNyFee <= 0) {
      setFormError('Please enter a valid Indicative Next Year Proposed Audit Fee.');
      return;
    }
    if (exceedsFixedQuote && !varianceReason.trim()) {
      setFormError(
        `Decided fee (${formatRM(decidedCyFee)}) exceeds the committed Fixed Quotation (${formatRM(
          engagement.quotation.fixed_audit_fee
        )}). A Fee Revision Justification is mandatory.`
      );
      return;
    }
    onApprovePartner({
      decidedCyFee,
      decidedNyFee,
      varianceReason: varianceReason.trim(),
    });
  };

  const handleReturnSubmit = () => {
    if (!returnNote.trim()) {
      setFormError('Please provide revision notes before returning to the Audit PIC.');
      return;
    }
    setFormError('');
    onReturnToPic(returnNote.trim());
    setShowReturnBox(false);
    setReturnNote('');
  };

  const activeBreakdown =
    expandedScale === 'revenue'
      ? rpg7.revenue
      : expandedScale === 'assets'
      ? rpg7.assets
      : expandedScale === 'expenses'
      ? rpg7.expenses
      : null;

  return (
    <section className="space-y-6">
      {/* MIA RPG 7 Benchmark Summary Strip */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              MIA RPG 7 (Revised) Fee Benchmark &amp; Partner Pricing Desk
            </h3>
            <p className="text-xs text-slate-500">
              Highest applicable benchmark: {rpg7.highestBenchmark.basis} ·{' '}
              {rpg7.highestBenchmark.isNegotiableFloor
                ? 'Negotiable minimum floor applies'
                : 'Progressive tier scale'}
            </p>
          </div>
          {engagement.status === 'APPROVED_ACTIVE' && (
            <button
              type="button"
              onClick={onOpenLetter}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1E3A5F] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#162d4a] transition-colors whitespace-nowrap"
            >
              <FileText className="h-3.5 w-3.5" />
              Preview Fee Increase Letter
            </button>
          )}
        </div>

        {/* 4 Key Benchmark Metrics */}
        <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          <button
            type="button"
            onClick={() => setExpandedScale(expandedScale === 'revenue' ? null : 'revenue')}
            className="p-5 text-left hover:bg-slate-50/70 transition-colors"
          >
            <p className="text-xs font-medium text-slate-500">
              RPG 7 · Gross Revenue {rpg7.revenue.isNegotiableFloor ? '(Floor)' : ''}
            </p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
              {formatRM(rpg7.revenue.recommendedFee)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              On {formatRM(rpg7.revenue.inputAmount)} ·{' '}
              <span className="text-[#1E3A5F] underline">
                {expandedScale === 'revenue' ? 'Hide tiers' : 'View tiers'}
              </span>
            </p>
          </button>

          <button
            type="button"
            onClick={() => setExpandedScale(expandedScale === 'assets' ? null : 'assets')}
            className="p-5 text-left hover:bg-slate-50/70 transition-colors"
          >
            <p className="text-xs font-medium text-slate-500">
              RPG 7 · Total Assets {rpg7.assets.isNegotiableFloor ? '(Floor)' : ''}
            </p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
              {formatRM(rpg7.assets.recommendedFee)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              On {formatRM(rpg7.assets.inputAmount)} ·{' '}
              <span className="text-[#1E3A5F] underline">
                {expandedScale === 'assets' ? 'Hide tiers' : 'View tiers'}
              </span>
            </p>
          </button>

          <button
            type="button"
            onClick={() => setExpandedScale(expandedScale === 'expenses' ? null : 'expenses')}
            className="p-5 text-left hover:bg-slate-50/70 transition-colors"
          >
            <p className="text-xs font-medium text-slate-500">
              RPG 7 · Operating Expenses {rpg7.expenses.isNegotiableFloor ? '(Floor)' : ''}
            </p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
              {formatRM(rpg7.expenses.recommendedFee)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              On {formatRM(rpg7.expenses.inputAmount)} ·{' '}
              <span className="text-[#1E3A5F] underline">
                {expandedScale === 'expenses' ? 'Hide tiers' : 'View tiers'}
              </span>
            </p>
          </button>

          <div className="bg-slate-50/60 p-5">
            <p className="text-xs font-medium text-slate-500">
              PY Shortfall &amp; Recovery vs Benchmark
            </p>
            <p className="mt-1 font-mono text-xl font-semibold text-red-700 tabular-nums">
              {formatRM(rpg7.shortfallVsPy)}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
              Recovery: {rpg7.recoveryPercent.toFixed(1)}% (PY {formatRM(engagement.prior_fees.py_audit_fee)})
            </p>
          </div>
        </div>

        {/* Optional Progressive Tier Breakdown Drawer */}
        {activeBreakdown && (
          <div className="border-t border-slate-200 bg-slate-50/50 px-6 py-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-800">
                Progressive Calculation — {activeBreakdown.basis}
              </p>
              <button
                type="button"
                onClick={() => setExpandedScale(null)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-1.5 text-left font-medium">Band</th>
                    <th className="py-1.5 text-right font-medium">Chargeable Amount</th>
                    <th className="py-1.5 text-right font-medium">Rate</th>
                    <th className="py-1.5 text-right font-medium">Fee (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {activeBreakdown.breakdown.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 font-sans text-slate-700">{row.band}</td>
                      <td className="py-1.5 text-right text-slate-700">{formatRM(row.amountInBand)}</td>
                      <td className="py-1.5 text-right text-slate-500">{row.rateLabel}</td>
                      <td className="py-1.5 text-right font-medium text-slate-900">
                        {formatRM(row.fee, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Comparison Bar Chart + Quotation Anchor */}
        <div className="grid grid-cols-1 gap-6 border-t border-slate-200 p-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="mb-3 text-xs font-semibold text-slate-700">
              Fee Benchmark Comparison (RM)
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 12, left: 4, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `RM ${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatRM(typeof value === 'number' ? value : Number(value ?? 0)),
                      'Amount',
                    ]}
                    contentStyle={{
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={44}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quotation & Budget Context Column */}
          <div className="flex flex-col justify-between space-y-4 border-t border-slate-200 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <p className="text-xs font-semibold text-slate-700">Quotation Anchor</p>
              {!engagement.quotation.quotation_issued || engagement.quotation.quotation_type === 'NONE' ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium text-slate-900">No Quotation Issued</p>
                  <p className="text-xs text-slate-500">
                    Partner prices directly from MIA RPG 7 benchmarks and budgeted time cost.
                  </p>
                </div>
              ) : isBindingFixedQuote ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs font-semibold text-sky-800">
                    Committed Client Quote · Ref {engagement.quotation.quotation_ref || '—'}
                  </p>
                  <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                    {formatRM(engagement.quotation.fixed_audit_fee)}
                  </p>
                  {engagement.quotation.tax_included && (
                    <p className="font-mono text-xs text-slate-600 tabular-nums">
                      Quoted Tax Fee: {formatRM(engagement.quotation.fixed_tax_fee)}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Deciding above this figure requires a mandatory Fee Revision Justification.
                  </p>
                </div>
              ) : (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-800">
                    REFERENCE ONLY — Non-Binding Range · Ref {engagement.quotation.quotation_ref || '—'}
                  </p>
                  <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                    {formatRM(engagement.quotation.range_audit_min)} ~{' '}
                    {formatRM(engagement.quotation.range_audit_max)}
                  </p>
                  {rangePosition && (
                    <p className="text-xs text-slate-600">
                      Highest RPG 7 Benchmark ({formatRM(rpg7.highestBenchmark.recommendedFee)}) is{' '}
                      <span className="font-semibold text-slate-900">{rangePosition}</span>.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-700">PIC Time-Cost Summary</p>
              <dl className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Planned Hours</dt>
                  <dd className="font-mono font-medium text-slate-900 tabular-nums">
                    {engagement.time_budget.total_planned_hours.toFixed(1)} /{' '}
                    {engagement.time_budget.allowed_hours_cap.toFixed(1)} hrs
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Budgeted Time Cost</dt>
                  <dd className="font-mono font-medium text-slate-900 tabular-nums">
                    {formatRM(budgetedTimeCost)} (@ RM {engagement.time_budget.charge_out_rate}/hr)
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tax Scope</dt>
                  <dd className="font-mono text-slate-700 tabular-nums">
                    {engagement.prior_fees.tax_handled_by_firm
                      ? `Firm (${formatRM(engagement.prior_fees.py_tax_fee)})`
                      : 'Not Handled by Firm'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Partner 2nd-Level Fee Decision Form (Editable only when PENDING_PARTNER & user is Partner) */}
      {canApprove && (
        <div className="rounded-lg border border-slate-300 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                2nd-Level Partner Approval &amp; Final Fee Decision
              </h4>
              <p className="text-xs text-slate-500">
                Approving moves status to Approved &amp; Active, notifies PIC, Supervisor &amp; Manager, and unlocks Supervisor Read-Only Viewer.
              </p>
            </div>
          </div>

          {engagement.approvals.manager_notes && (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Audit Manager 1st-Level Note: </span>
              {engagement.approvals.manager_notes}
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Decided CY Proposed Audit Fee (RM) *
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={decidedCyFee}
                onChange={(e) => setDecidedCyFee(Number(e.target.value))}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
              />
              {exceedsFixedQuote && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Exceeds committed Fixed Quote ({formatRM(engagement.quotation.fixed_audit_fee)}) — justification required below.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Indicative NY Proposed Audit Fee (RM) *
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={decidedNyFee}
                onChange={(e) => setDecidedNyFee(Number(e.target.value))}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-700">
              Fee Revision Justification / Pricing Rationale {exceedsFixedQuote ? '*' : '(Optional)'}
            </label>
            <textarea
              rows={2}
              value={varianceReason}
              onChange={(e) => setVarianceReason(e.target.value)}
              placeholder="e.g., CY revenue expanded +33.8% above initial quote assumptions, triggering MIA RPG 7 RM 20,000 floor..."
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
            />
          </div>

          {formError && (
            <p className="mt-3 text-xs font-medium text-red-700">{formError}</p>
          )}

          {showReturnBox && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50/50 p-4">
              <label className="block text-xs font-semibold text-red-800">
                Return to Audit PIC — Revision Instructions *
              </label>
              <textarea
                rows={2}
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                placeholder="Explain what the PIC needs to revise before resubmission..."
                className="mt-1.5 w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReturnBox(false)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReturnSubmit}
                  className="rounded-md bg-red-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-red-800"
                >
                  Confirm Return to Draft
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
            {!showReturnBox && (
              <button
                type="button"
                onClick={() => setShowReturnBox(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Return to PIC
              </button>
            )}
            <button
              type="button"
              onClick={handleApproveSubmit}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1E3A5F] px-5 py-2 text-xs font-medium text-white hover:bg-[#162d4a] transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve 2nd Level &amp; Finalize Fee
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
