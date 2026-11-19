import React, { useState } from 'react';
import { calculateRpg7Summary, formatRM } from '../utils/rpg7';

export const Rpg7ReferenceView: React.FC = () => {
  const [revenue, setRevenue] = useState<number>(23_546_128);
  const [assets, setAssets] = useState<number>(6_760_696);
  const [expenses, setExpenses] = useState<number>(2_011_296);
  const [pyFee, setPyFee] = useState<number>(4_700);

  const summary = calculateRpg7Summary(revenue, assets, expenses, pyFee);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          MIA RPG 7 (Revised) Progressive Fee Calculator
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Interactive statutory audit fee benchmark simulator across Gross Revenue, Total Assets (excluding intangibles), and Total Operating Expenses.
        </p>
      </div>

      {/* Inputs + Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Test Financial Inputs (RM)</h2>
          <div>
            <label className="block text-xs font-medium text-slate-700">Total Gross Revenue (RM)</label>
            <input
              type="number"
              min={0}
              value={revenue}
              onChange={(e) => setRevenue(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-[#1E3A5F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Total Assets, excl. Intangibles (RM)
            </label>
            <input
              type="number"
              min={0}
              value={assets}
              onChange={(e) => setAssets(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-[#1E3A5F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Total Operating Expenses (RM)
            </label>
            <input
              type="number"
              min={0}
              value={expenses}
              onChange={(e) => setExpenses(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-[#1E3A5F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Prior-Year Audit Fee (RM)
            </label>
            <input
              type="number"
              min={0}
              value={pyFee}
              onChange={(e) => setPyFee(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-[#1E3A5F] focus:outline-none"
            />
          </div>
        </div>

        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Computed MIA RPG 7 Benchmarks
            </h2>
            <p className="text-xs text-slate-500">
              Highest applicable benchmark governs the recommended minimum statutory audit fee.
            </p>
          </div>
          <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="p-5">
              <p className="text-xs text-slate-500">Gross Revenue Scale</p>
              <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {formatRM(summary.revenue.recommendedFee)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {summary.revenue.isNegotiableFloor ? 'Min floor (> RM 10M)' : 'Progressive tiers'}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">Total Assets Scale</p>
              <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {formatRM(summary.assets.recommendedFee)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {summary.assets.isNegotiableFloor ? 'Min floor (> RM 15M)' : 'Progressive tiers'}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">Operating Expenses Scale</p>
              <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {formatRM(summary.expenses.recommendedFee)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {summary.expenses.isNegotiableFloor ? 'Min floor (> RM 10M)' : 'Progressive tiers'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-slate-200 bg-slate-50/70 p-6 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Governing Benchmark</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#1E3A5F] tabular-nums">
                {formatRM(summary.highestBenchmark.recommendedFee)}
              </p>
              <p className="text-xs text-slate-600">{summary.highestBenchmark.basis}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fee Shortfall vs PY</p>
              <p className="mt-1 font-mono text-lg font-semibold text-red-700 tabular-nums">
                {formatRM(summary.shortfallVsPy)}
              </p>
              <p className="text-xs text-slate-600">Below RPG 7 guideline</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Current Recovery Rate</p>
              <p className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                {summary.recoveryPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-600">PY {formatRM(pyFee)} ÷ Benchmark</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reference Rate Schedule Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-900">
              Scale A &amp; B: Gross Revenue / Total Operating Expenses
            </h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                <th className="px-5 py-2.5 text-left font-semibold">Tier Band</th>
                <th className="px-5 py-2.5 text-right font-semibold">Rate / Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              <tr><td className="px-5 py-2 font-sans text-slate-700">First RM 100,000</td><td className="px-5 py-2 text-right">RM 1,500 (Min)</td></tr>
              <tr><td className="px-5 py-2 font-sans text-slate-700">Next RM 150,000 (100k – 250k)</td><td className="px-5 py-2 text-right">0.550%</td></tr>
              <tr><td className="px-5 py-2 font-sans text-slate-700">Next RM 250,000 (250k – 500k)</td><td className="px-5 py-2 text-right">0.360%</td></tr>
              <tr><td className="px-5 py-2 font-sans text-slate-700">Next RM 500,000 (500k – 1.0M)</td><td className="px-5 py-2 text-right">0.260%</td></tr>
              <tr><td className="px-5 py-2 font-sans text-slate-700">Next RM 1,500,000 (1.0M – 2.5M)</td><td className="px-5 py-2 text-right">0.175%</td></tr>
              <tr><td className="px-5 py-2 font-sans text-slate-700">Next RM 2,500,000 (2.5M – 5.0M)</td><td className="px-5 py-2 text-right">0.130%</td></tr>
              <tr><td className="px-5 py-2 font-sans text-slate-700">Next RM 5,000,000 (5.0M – 10.0M)</td><td className="px-5 py-2 text-right">0.095% (Cum. RM 12,455)</td></tr>
              <tr className="bg-slate-50/70"><td className="px-5 py-2 font-sans font-semibold text-slate-900">Above RM 10,000,000</td><td className="px-5 py-2 text-right font-semibold text-[#1E3A5F]">Negotiable (Min RM 20,000)</td></tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-900">
              Scale C: Total Assets (Excluding Intangibles)
            </h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                <th className="px-5 py-2.5 text-left font-semibold">Tier Band</th>
                <th className="px-5 py-2.5 text-right font-semibold">Rate / Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              <tr><td className="px-5 py-2 font-sans text-slate-700">First RM 150,000</td><td className="px-5 py-2 text-right">RM 1,500 (Min)</td></tr>
              <tr><td className="px-5 py-2 font-sans text-slate-700">Next RM 225,000 (150k – 375k)</td><td className="px-5 py-2 text-right">0.365%</td></tr>
              <tr><td className="px-5 py-2 font-sans text-slate-700">Next RM 375,000 (375k – 750k)</td><td className="px-5 py-2 text-right">0.240%</td></tr>
              <tr><td className="px-5 py-2 font-sans text-slate-700">Next RM 750,000 (750k – 1.5M)</td><td className="px-5 py-2 text-right">0.175%</td></tr>
              <tr><td className="px-5 py-2 font-sans text-slate-700">Next RM 2,250,000 (1.5M – 3.75M)</td><td className="px-5 py-2 text-right">0.115%</td></tr>
              <tr><td className="px-5 py-2 font-sans text-slate-700">Next RM 3,750,000 (3.75M – 7.5M)</td><td className="px-5 py-2 text-right">0.085%</td></tr>
              <tr><td className="px-5 py-2 font-sans text-slate-700">Next RM 7,500,000 (7.5M – 15.0M)</td><td className="px-5 py-2 text-right">0.065%</td></tr>
              <tr className="bg-slate-50/70"><td className="px-5 py-2 font-sans font-semibold text-slate-900">Above RM 15,000,000</td><td className="px-5 py-2 text-right font-semibold text-[#1E3A5F]">Negotiable (Min RM 20,000)</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
