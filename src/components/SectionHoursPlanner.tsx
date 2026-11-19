import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import type { AuditSection, SectionCategory } from '../types/audit';
import { formatRM } from '../utils/rpg7';

interface SectionHoursPlannerProps {
  sections: AuditSection[];
  allowedHoursCap: number;
  chargeOutRate: number;
  clearanceHours: number;
  isEditable: boolean;
  onChangeSections: (updatedSections: AuditSection[]) => void;
}

const CATEGORY_ORDER: SectionCategory[] = [
  'Planning & Review',
  'Assets',
  'Liabilities',
  'Equity',
  'Income Statement',
];

export const SectionHoursPlanner: React.FC<SectionHoursPlannerProps> = ({
  sections,
  allowedHoursCap,
  chargeOutRate,
  clearanceHours,
  isEditable,
  onChangeSections,
}) => {
  const [clampNotice, setClampNotice] = useState<string>('');

  const totalPlanned =
    Math.round(sections.reduce((acc, s) => acc + s.planned_hours, 0) * 10) / 10;
  const remaining = Math.round((allowedHoursCap - totalPlanned) * 10) / 10;
  const isOverCap = totalPlanned > allowedHoursCap;
  const utilizationPct =
    allowedHoursCap > 0 ? Math.min(100, (totalPlanned / allowedHoursCap) * 100) : 0;
  const budgetedTimeCost = Math.round(totalPlanned * chargeOutRate);
  const netFieldworkCap = Math.max(0, Math.round((allowedHoursCap - clearanceHours) * 10) / 10);

  const handleHourInput = (sectionCode: string, rawVal: string) => {
    setClampNotice('');
    const parsed = rawVal === '' ? 0 : Number(rawVal);
    if (!Number.isFinite(parsed) || parsed < 0) return;

    const roundedInput = Math.round(parsed * 10) / 10;
    const otherTotal =
      Math.round(
        sections
          .filter((s) => s.section_code !== sectionCode)
          .reduce((acc, s) => acc + s.planned_hours, 0) * 10
      ) / 10;

    const maxForThisSection = Math.max(
      0,
      Math.round((allowedHoursCap - otherTotal) * 10) / 10
    );

    let finalHours = roundedInput;
    if (allowedHoursCap > 0 && roundedInput > maxForThisSection) {
      finalHours = maxForThisSection;
      setClampNotice(
        `Hard cap enforced: ${sectionCode} clamped to ${maxForThisSection.toFixed(
          1
        )} hrs so total stays within ${allowedHoursCap.toFixed(1)} Allowed Hours.`
      );
    }

    const updated = sections.map((s) =>
      s.section_code === sectionCode ? { ...s, planned_hours: finalHours } : s
    );
    onChangeSections(updated);
  };

  const handleAutoScaleToFit = () => {
    if (allowedHoursCap <= 0 || totalPlanned <= 0) return;
    const ratio = allowedHoursCap / totalPlanned;
    let running = 0;
    const scaled = sections.map((s, idx) => {
      if (idx === sections.length - 1) {
        const last = Math.max(0, Math.round((allowedHoursCap - running) * 10) / 10);
        return { ...s, planned_hours: last };
      }
      const val = Math.floor(s.planned_hours * ratio * 10) / 10;
      running = Math.round((running + val) * 10) / 10;
      return { ...s, planned_hours: val };
    });
    setClampNotice('');
    onChangeSections(scaled);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      {/* Sticky Real-Time Hours Cap Meter */}
      <div className="sticky top-0 z-20 rounded-t-lg border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              26-Section Audit Fieldwork Hour Allocation
            </h3>
            <p className="text-xs text-slate-500">
              Formula: PY Audit Fee × 70% ÷ RM {chargeOutRate}/hr ={' '}
              <span className="font-mono font-medium text-slate-700 tabular-nums">
                {allowedHoursCap.toFixed(1)} hrs
              </span>{' '}
              ({clearanceHours.toFixed(1)} hrs clearance + {netFieldworkCap.toFixed(1)} hrs net fieldwork)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-slate-500">Allowed Cap</p>
              <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {allowedHoursCap.toFixed(1)} hrs
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Allocated</p>
              <p
                className={`font-mono text-sm font-semibold tabular-nums ${
                  isOverCap ? 'text-red-700' : 'text-[#1E3A5F]'
                }`}
              >
                {totalPlanned.toFixed(1)} hrs
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Remaining</p>
              <p
                className={`font-mono text-sm font-semibold tabular-nums ${
                  remaining < 0
                    ? 'text-red-700'
                    : remaining === 0
                    ? 'text-emerald-700'
                    : 'text-slate-700'
                }`}
              >
                {remaining.toFixed(1)} hrs
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Budgeted Cost</p>
              <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {formatRM(budgetedTimeCost)}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-150 ${
              isOverCap
                ? 'bg-red-600'
                : utilizationPct >= 95
                ? 'bg-emerald-600'
                : 'bg-[#1E3A5F]'
            }`}
            style={{ width: `${utilizationPct}%` }}
          />
        </div>

        {/* Hard-Cap Status / Clamp Message */}
        {isOverCap ? (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-red-700">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Total planned hours ({totalPlanned.toFixed(1)} hrs) exceed Allowed Hours Cap ({allowedHoursCap.toFixed(1)} hrs). Submission is blocked until reduced.
            </span>
            {isEditable && (
              <button
                type="button"
                onClick={handleAutoScaleToFit}
                className="inline-flex items-center gap-1 font-semibold text-red-800 underline hover:text-red-950 whitespace-nowrap"
              >
                <RotateCcw className="h-3 w-3" />
                Auto-scale sections to fit cap
              </button>
            )}
          </div>
        ) : clampNotice ? (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {clampNotice}
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            Within hard hour cap ({utilizationPct.toFixed(1)}% allocated across 26 audit sections).
          </p>
        )}
      </div>

      {/* Grouped 26-Section Grid */}
      <div className="divide-y divide-slate-200">
        {CATEGORY_ORDER.map((category) => {
          const catSections = sections.filter((s) => s.category === category);
          const catTotal =
            Math.round(catSections.reduce((acc, s) => acc + s.planned_hours, 0) * 10) / 10;

          return (
            <div key={category} className="px-6 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-800">
                  {category}{' '}
                  <span className="font-normal text-slate-500">
                    ({catSections.length} sections)
                  </span>
                </h4>
                <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                  Subtotal: {catTotal.toFixed(1)} hrs · {formatRM(Math.round(catTotal * chargeOutRate))}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
                {catSections.map((sec) => (
                  <div
                    key={sec.section_code}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="mr-2 font-mono text-xs text-slate-400">
                        {sec.section_code}
                      </span>
                      <span className="text-xs text-slate-800">{sec.section_name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isEditable ? (
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={sec.planned_hours}
                          onChange={(e) => handleHourInput(sec.section_code, e.target.value)}
                          aria-label={`${sec.section_name} planned hours`}
                          className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs text-slate-900 tabular-nums focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                        />
                      ) : (
                        <span className="w-16 text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                          {sec.planned_hours.toFixed(1)}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">hrs</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
