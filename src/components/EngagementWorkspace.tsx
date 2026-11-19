import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  CalendarClock,
  FileText,
  Lock,
} from 'lucide-react';
import type { AuditEngagement, AuditSection, QuotationType, StaffMember } from '../types/audit';
import { INDUSTRY_OPTIONS } from '../data/roster';
import {
  calculateAllowedHours,
  calculateRecommendedDays,
  calculateRpg7Summary,
  calculateWorkingDaysBetween,
  calculateYoYPercent,
  DEFAULT_CHARGE_OUT_RATE,
  formatDateDisplay,
  formatPercent,
  formatRM,
  getRangePositionLabel,
  getStatusLabel,
} from '../utils/rpg7';
import { evaluateEngagementAccess } from '../utils/permissions';
import { SectionHoursPlanner } from './SectionHoursPlanner';
import { PartnerPricingDesk } from './PartnerPricingDesk';
import { FeeIncreaseLetterModal } from './FeeIncreaseLetterModal';

interface EngagementWorkspaceProps {
  engagement: AuditEngagement;
  currentUser: StaffMember;
  onBack: () => void;
  onUpdateEngagement: (updated: AuditEngagement) => void;
  onSubmitToManager: (engagement: AuditEngagement) => void;
  onManagerApprove: (engagement: AuditEngagement, managerNotes: string) => void;
  onManagerReturn: (engagement: AuditEngagement, reason: string) => void;
  onPartnerApprove: (
    engagement: AuditEngagement,
    payload: { decidedCyFee: number; decidedNyFee: number; varianceReason: string }
  ) => void;
  onPartnerReturn: (engagement: AuditEngagement, reason: string) => void;
  onUpdateExtension: (
    engagement: AuditEngagement,
    level: 'FIRST' | 'SECOND',
    extensionDate: string,
    reason: string
  ) => void;
}

const LIFECYCLE_STEPS: { key: AuditEngagement['status']; label: string }[] = [
  { key: 'DRAFT', label: '1. PIC Draft' },
  { key: 'PENDING_MANAGER', label: '2. Manager Review' },
  { key: 'PENDING_PARTNER', label: '3. Partner Pricing' },
  { key: 'APPROVED_ACTIVE', label: '4. Approved & Active' },
];

export const EngagementWorkspace: React.FC<EngagementWorkspaceProps> = ({
  engagement,
  currentUser,
  onBack,
  onUpdateEngagement,
  onSubmitToManager,
  onManagerApprove,
  onManagerReturn,
  onPartnerApprove,
  onPartnerReturn,
  onUpdateExtension,
}) => {
  const access = evaluateEngagementAccess(currentUser, engagement);
  const isEditable = access.canEditDraft;

  const [managerNotes, setManagerNotes] = useState(engagement.approvals.manager_notes || '');
  const [showManagerReturn, setShowManagerReturn] = useState(false);
  const [managerReturnReason, setManagerReturnReason] = useState('');
  const [managerError, setManagerError] = useState('');

  const [ext1Date, setExt1Date] = useState(engagement.schedule.first_extension_date || '');
  const [ext1Reason, setExt1Reason] = useState(engagement.schedule.first_extension_reason || '');
  const [ext2Date, setExt2Date] = useState(engagement.schedule.second_extension_date || '');
  const [ext2Reason, setExt2Reason] = useState(engagement.schedule.second_extension_reason || '');

  const [showLetterModal, setShowLetterModal] = useState(false);

  // Derived calculations
  const revYoY = calculateYoYPercent(
    engagement.financials.cy_revenue,
    engagement.financials.py_revenue
  );
  const assetsYoY = calculateYoYPercent(
    engagement.financials.cy_assets,
    engagement.financials.py_assets
  );
  const opexYoY = calculateYoYPercent(
    engagement.financials.cy_expenses,
    engagement.financials.py_expenses
  );

  const rpg7 = calculateRpg7Summary(
    engagement.financials.cy_revenue,
    engagement.financials.cy_assets,
    engagement.financials.cy_expenses,
    engagement.prior_fees.py_audit_fee
  );

  const workingDays = calculateWorkingDaysBetween(
    engagement.schedule.commencement_date,
    engagement.schedule.target_completion_date
  );
  const recommendedDays = calculateRecommendedDays(
    engagement.time_budget.allowed_hours_cap,
    engagement.time_budget.clearance_hours
  );

  const dateInvalid =
    Boolean(engagement.schedule.commencement_date) &&
    Boolean(engagement.schedule.target_completion_date) &&
    new Date(engagement.schedule.target_completion_date) <=
      new Date(engagement.schedule.commencement_date);

  // Validation checklist for PIC submission
  const validationErrors: string[] = [];
  if (!engagement.client_info.client_name.trim()) {
    validationErrors.push('Client Name is required.');
  }
  if (!engagement.client_info.fye_date) {
    validationErrors.push('Financial Year End (FYE) date is required.');
  }
  if (engagement.prior_fees.py_audit_fee <= 0) {
    validationErrors.push('Previous Year Audit Fee must be greater than RM 0.');
  }
  if (engagement.prior_fees.tax_handled_by_firm && engagement.prior_fees.py_tax_fee <= 0) {
    validationErrors.push('Previous Year Tax Fee is required when Tax is handled by the firm.');
  }
  if (engagement.quotation.quotation_issued) {
    if (
      engagement.quotation.quotation_type === 'FIXED' &&
      engagement.quotation.fixed_audit_fee <= 0
    ) {
      validationErrors.push('Quoted CY Audit Fee is required for a Fixed Quotation.');
    }
    if (
      engagement.quotation.quotation_type === 'GENERAL_RANGE' &&
      (engagement.quotation.range_audit_min <= 0 ||
        engagement.quotation.range_audit_max < engagement.quotation.range_audit_min)
    ) {
      validationErrors.push('Valid Min and Max Audit Fee range is required for Range Quotation.');
    }
  }
  if (!engagement.schedule.commencement_date || !engagement.schedule.target_completion_date) {
    validationErrors.push('Commencement Date and Target Completion Date are required.');
  } else if (dateInvalid) {
    validationErrors.push('Target Completion Date must be after Commencement Date.');
  }
  if (engagement.time_budget.total_planned_hours <= 0) {
    validationErrors.push('Allocate fieldwork hours across the 26 audit sections.');
  }
  if (engagement.time_budget.total_planned_hours > engagement.time_budget.allowed_hours_cap) {
    validationErrors.push(
      `Total planned hours (${engagement.time_budget.total_planned_hours.toFixed(
        1
      )} hrs) exceed Allowed Hours Cap (${engagement.time_budget.allowed_hours_cap.toFixed(1)} hrs).`
    );
  }

  // Updaters
  const patchEngagement = (updater: (prev: AuditEngagement) => AuditEngagement) => {
    const next = updater(engagement);
    onUpdateEngagement({
      ...next,
      updated_at: new Date().toISOString(),
    });
  };

  const handlePyAuditFeeChange = (val: number) => {
    const safeVal = Math.max(0, Number.isFinite(val) ? val : 0);
    const newCap = calculateAllowedHours(safeVal, engagement.time_budget.charge_out_rate || DEFAULT_CHARGE_OUT_RATE);
    patchEngagement((prev) => ({
      ...prev,
      prior_fees: {
        ...prev.prior_fees,
        py_audit_fee: safeVal,
      },
      time_budget: {
        ...prev.time_budget,
        allowed_hours_cap: newCap,
      },
    }));
  };

  const handleTaxHandledToggle = (handled: boolean) => {
    patchEngagement((prev) => ({
      ...prev,
      prior_fees: {
        ...prev.prior_fees,
        tax_handled_by_firm: handled,
        py_tax_fee: handled ? prev.prior_fees.py_tax_fee : 0,
      },
    }));
  };

  const handleQuotationIssuedToggle = (issued: boolean) => {
    patchEngagement((prev) => ({
      ...prev,
      quotation: {
        ...prev.quotation,
        quotation_issued: issued,
        quotation_type: issued
          ? prev.quotation.quotation_type === 'NONE'
            ? 'FIXED'
            : prev.quotation.quotation_type
          : 'NONE',
      },
    }));
  };

  const handleQuotationTypeChange = (qType: QuotationType) => {
    patchEngagement((prev) => ({
      ...prev,
      quotation: {
        ...prev.quotation,
        quotation_issued: qType !== 'NONE',
        quotation_type: qType,
      },
    }));
  };

  const handleSectionsChange = (sections: AuditSection[]) => {
    const total = Math.round(sections.reduce((acc, s) => acc + s.planned_hours, 0) * 10) / 10;
    patchEngagement((prev) => ({
      ...prev,
      time_budget: {
        ...prev.time_budget,
        sections,
        total_planned_hours: total,
      },
    }));
  };

  const currentStepIndex = LIFECYCLE_STEPS.findIndex((s) => s.key === engagement.status);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Action & Context Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Engagements
          </button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {engagement.client_info.client_name || 'Untitled Audit Engagement'}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono text-slate-700">{engagement.engagement_id}</span>
            <span aria-hidden="true">·</span>
            <span>FYE {formatDateDisplay(engagement.client_info.fye_date)}</span>
            <span aria-hidden="true">·</span>
            <span>
              PIC: {engagement.team_assignment.pic_name}
              {engagement.team_assignment.pic_role === 'SUPERVISOR' ? ' (Supervisor-as-PIC)' : ''}
            </span>
            {engagement.team_assignment.supervisor_name && (
              <>
                <span aria-hidden="true">·</span>
                <span>Supervisor: {engagement.team_assignment.supervisor_name}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-700">{access.accessModeLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {access.canViewFeeLetter && (
            <button
              type="button"
              onClick={() => setShowLetterModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <FileText className="h-3.5 w-3.5" />
              Fee Increase Letter
            </button>
          )}
        </div>
      </div>

      {/* 4-State Lifecycle Progress Strip */}
      <div className="rounded-lg border border-slate-200 bg-white px-6 py-3.5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex || engagement.status === 'APPROVED_ACTIVE';
            const isCurrent = idx === currentStepIndex;
            return (
              <div key={step.key} className="flex items-center gap-2.5">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-[#1E3A5F] text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p
                    className={`truncate text-xs font-semibold ${
                      isCurrent
                        ? 'text-slate-900'
                        : isCompleted
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supervisor Read-Only Banner */}
      {access.accessModeLabel === 'Supervisor Read-Only Viewer' && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-5 py-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>
              <strong className="font-semibold">Supervisor Read-Only Viewer Unlocked:</strong>{' '}
              Both Audit Manager and Audit Partner have approved this engagement. You can monitor approved section hours, milestones, and decided fees below.
            </span>
          </div>
        </div>
      )}

      {/* Return Revision Notice Banner */}
      {engagement.approvals.last_return_note && engagement.status === 'DRAFT' && (
        <div className="rounded-lg border border-red-200 bg-red-50/70 px-5 py-3.5 text-xs text-red-900">
          <p className="font-semibold">
            Returned for Revision by {engagement.approvals.last_returned_by}
          </p>
          <p className="mt-1 text-red-800">{engagement.approvals.last_return_note}</p>
        </div>
      )}

      {/* Approved Fee Decision Summary Banner (Visible to all permitted viewers once APPROVED_ACTIVE) */}
      {engagement.status === 'APPROVED_ACTIVE' && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
            <div className="p-5">
              <p className="text-xs text-slate-500">Decided CY Audit Fee</p>
              <p className="mt-1 font-mono text-xl font-bold text-emerald-700 tabular-nums">
                {formatRM(engagement.approvals.decided_cy_audit_fee)}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                PY Fee: {formatRM(engagement.prior_fees.py_audit_fee)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">Indicative NY Audit Fee</p>
              <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {formatRM(engagement.approvals.decided_ny_audit_fee)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Next financial year guidance</p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">Approved Fieldwork Budget</p>
              <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {engagement.time_budget.total_planned_hours.toFixed(1)} hrs
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                Cap: {engagement.time_budget.allowed_hours_cap.toFixed(1)} hrs
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">Approval Sign-Off</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {getStatusLabel(engagement.status)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Partner approved {formatDateDisplay(engagement.approvals.partner_approved_at)}
              </p>
            </div>
          </div>
          {engagement.approvals.fee_variance_reason && (
            <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Partner Pricing Rationale: </span>
              {engagement.approvals.fee_variance_reason}
            </div>
          )}
        </div>
      )}

      {/* Partner Pricing Desk (Top Priority for Partner on PENDING_PARTNER, also accessible on APPROVED_ACTIVE) */}
      {(currentUser.role === 'AUDIT_PARTNER' ||
        (currentUser.role === 'AUDIT_MANAGER' && engagement.status === 'APPROVED_ACTIVE')) && (
        <PartnerPricingDesk
          engagement={engagement}
          canApprove={access.canPartnerReview}
          onApprovePartner={(payload) => onPartnerApprove(engagement, payload)}
          onReturnToPic={(reason) => onPartnerReturn(engagement, reason)}
          onOpenLetter={() => setShowLetterModal(true)}
        />
      )}

      {/* Audit Manager 1st-Level Review Action Panel */}
      {access.canManagerReview && (
        <div className="rounded-lg border border-slate-300 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                1st-Level Audit Manager Review
              </h3>
              <p className="text-xs text-slate-500">
                Verify CY/PY financial growth, quotation terms, milestone schedule, and 26-section hours ({engagement.time_budget.total_planned_hours.toFixed(1)} / {engagement.time_budget.allowed_hours_cap.toFixed(1)} hrs) before forwarding to Audit Partner.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-700">
              Manager Review Notes for Audit Partner (Optional)
            </label>
            <textarea
              rows={2}
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              placeholder="Note any risk areas, fieldwork staffing observations, or quotation considerations..."
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
            />
          </div>

          {managerError && (
            <p className="mt-2 text-xs font-medium text-red-700">{managerError}</p>
          )}

          {showManagerReturn && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50/50 p-4">
              <label className="block text-xs font-semibold text-red-800">
                Revision Instructions for Audit PIC *
              </label>
              <textarea
                rows={2}
                value={managerReturnReason}
                onChange={(e) => setManagerReturnReason(e.target.value)}
                placeholder="Specify what needs to be adjusted before resubmission..."
                className="mt-1.5 w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManagerReturn(false)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!managerReturnReason.trim()) {
                      setManagerError('Please enter revision instructions to return this job.');
                      return;
                    }
                    setManagerError('');
                    onManagerReturn(engagement, managerReturnReason.trim());
                  }}
                  className="rounded-md bg-red-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-red-800"
                >
                  Confirm Return to Draft
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
            {!showManagerReturn && (
              <button
                type="button"
                onClick={() => setShowManagerReturn(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Return to PIC
              </button>
            )}
            <button
              type="button"
              onClick={() => onManagerApprove(engagement, managerNotes.trim())}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1E3A5F] px-5 py-2 text-xs font-medium text-white hover:bg-[#162d4a] transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve 1st Level &amp; Forward to Partner
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: Client Profile & Comparative Financials (CY vs PY) */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            01. Client Profile &amp; Comparative Financials (CY vs PY)
          </h2>
          <p className="text-xs text-slate-500">
            Auto-computes YoY variance and MIA RPG 7 progressive fee benchmarks. Jumps above 20% are flagged as materiality growth indicators.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Client Metadata Row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Client Name *</label>
              <input
                type="text"
                disabled={!isEditable}
                value={engagement.client_info.client_name}
                onChange={(e) =>
                  patchEngagement((prev) => ({
                    ...prev,
                    client_info: { ...prev.client_info, client_name: e.target.value },
                  }))
                }
                placeholder="e.g., WW Global Success Sdn. Bhd."
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Financial Year End (FYE) *
              </label>
              <input
                type="date"
                disabled={!isEditable}
                value={engagement.client_info.fye_date}
                onChange={(e) =>
                  patchEngagement((prev) => ({
                    ...prev,
                    client_info: { ...prev.client_info, fye_date: e.target.value },
                  }))
                }
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Industry Classification *
              </label>
              <select
                disabled={!isEditable}
                value={engagement.client_info.industry}
                onChange={(e) =>
                  patchEngagement((prev) => ({
                    ...prev,
                    client_info: { ...prev.client_info, industry: e.target.value },
                  }))
                }
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
              >
                {INDUSTRY_OPTIONS.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparative Financials Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50/70 text-xs text-slate-500">
                  <th className="px-3 py-2.5 text-left font-semibold">Financial Basis</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Prior Year (PY) RM</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Current Year (CY) RM</th>
                  <th className="px-3 py-2.5 text-right font-semibold">YoY Variance</th>
                  <th className="px-3 py-2.5 text-right font-semibold">CY MIA RPG 7 Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Revenue */}
                <tr>
                  <td className="px-3 py-3 font-medium text-slate-900">Total Gross Revenue</td>
                  <td className="px-3 py-3 text-right">
                    {isEditable ? (
                      <input
                        type="number"
                        min={0}
                        value={engagement.financials.py_revenue}
                        onChange={(e) =>
                          patchEngagement((prev) => ({
                            ...prev,
                            financials: {
                              ...prev.financials,
                              py_revenue: Math.max(0, Number(e.target.value) || 0),
                            },
                          }))
                        }
                        className="w-40 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-right font-mono text-xs text-slate-900 tabular-nums focus:border-[#1E3A5F] focus:outline-none"
                      />
                    ) : (
                      <span className="font-mono text-xs text-slate-700 tabular-nums">
                        {formatRM(engagement.financials.py_revenue)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {isEditable ? (
                      <input
                        type="number"
                        min={0}
                        value={engagement.financials.cy_revenue}
                        onChange={(e) =>
                          patchEngagement((prev) => ({
                            ...prev,
                            financials: {
                              ...prev.financials,
                              cy_revenue: Math.max(0, Number(e.target.value) || 0),
                            },
                          }))
                        }
                        className="w-40 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-right font-mono text-xs font-medium text-slate-900 tabular-nums focus:border-[#1E3A5F] focus:outline-none"
                      />
                    ) : (
                      <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatRM(engagement.financials.cy_revenue)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                    <span
                      className={
                        revYoY !== null && revYoY > 20
                          ? 'font-semibold text-amber-700'
                          : 'text-slate-600'
                      }
                    >
                      {formatPercent(revYoY)}
                      {revYoY !== null && revYoY > 20 ? ' · >20% Growth' : ''}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {formatRM(rpg7.revenue.recommendedFee)}
                    {rpg7.revenue.isNegotiableFloor ? ' (Floor)' : ''}
                  </td>
                </tr>

                {/* Assets */}
                <tr>
                  <td className="px-3 py-3 font-medium text-slate-900">
                    Total Assets (Excl. Intangibles)
                  </td>
                  <td className="px-3 py-3 text-right">
                    {isEditable ? (
                      <input
                        type="number"
                        min={0}
                        value={engagement.financials.py_assets}
                        onChange={(e) =>
                          patchEngagement((prev) => ({
                            ...prev,
                            financials: {
                              ...prev.financials,
                              py_assets: Math.max(0, Number(e.target.value) || 0),
                            },
                          }))
                        }
                        className="w-40 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-right font-mono text-xs text-slate-900 tabular-nums focus:border-[#1E3A5F] focus:outline-none"
                      />
                    ) : (
                      <span className="font-mono text-xs text-slate-700 tabular-nums">
                        {formatRM(engagement.financials.py_assets)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {isEditable ? (
                      <input
                        type="number"
                        min={0}
                        value={engagement.financials.cy_assets}
                        onChange={(e) =>
                          patchEngagement((prev) => ({
                            ...prev,
                            financials: {
                              ...prev.financials,
                              cy_assets: Math.max(0, Number(e.target.value) || 0),
                            },
                          }))
                        }
                        className="w-40 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-right font-mono text-xs font-medium text-slate-900 tabular-nums focus:border-[#1E3A5F] focus:outline-none"
                      />
                    ) : (
                      <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatRM(engagement.financials.cy_assets)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                    <span
                      className={
                        assetsYoY !== null && assetsYoY > 20
                          ? 'font-semibold text-amber-700'
                          : 'text-slate-600'
                      }
                    >
                      {formatPercent(assetsYoY)}
                      {assetsYoY !== null && assetsYoY > 20 ? ' · >20% Growth' : ''}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {formatRM(rpg7.assets.recommendedFee)}
                    {rpg7.assets.isNegotiableFloor ? ' (Floor)' : ''}
                  </td>
                </tr>

                {/* Operating Expenses */}
                <tr>
                  <td className="px-3 py-3 font-medium text-slate-900">Total Operating Expenses</td>
                  <td className="px-3 py-3 text-right">
                    {isEditable ? (
                      <input
                        type="number"
                        min={0}
                        value={engagement.financials.py_expenses}
                        onChange={(e) =>
                          patchEngagement((prev) => ({
                            ...prev,
                            financials: {
                              ...prev.financials,
                              py_expenses: Math.max(0, Number(e.target.value) || 0),
                            },
                          }))
                        }
                        className="w-40 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-right font-mono text-xs text-slate-900 tabular-nums focus:border-[#1E3A5F] focus:outline-none"
                      />
                    ) : (
                      <span className="font-mono text-xs text-slate-700 tabular-nums">
                        {formatRM(engagement.financials.py_expenses)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {isEditable ? (
                      <input
                        type="number"
                        min={0}
                        value={engagement.financials.cy_expenses}
                        onChange={(e) =>
                          patchEngagement((prev) => ({
                            ...prev,
                            financials: {
                              ...prev.financials,
                              cy_expenses: Math.max(0, Number(e.target.value) || 0),
                            },
                          }))
                        }
                        className="w-40 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-right font-mono text-xs font-medium text-slate-900 tabular-nums focus:border-[#1E3A5F] focus:outline-none"
                      />
                    ) : (
                      <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatRM(engagement.financials.cy_expenses)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                    <span
                      className={
                        opexYoY !== null && opexYoY > 20
                          ? 'font-semibold text-amber-700'
                          : 'text-slate-600'
                      }
                    >
                      {formatPercent(opexYoY)}
                      {opexYoY !== null && opexYoY > 20 ? ' · >20% Growth' : ''}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {formatRM(rpg7.expenses.recommendedFee)}
                    {rpg7.expenses.isNegotiableFloor ? ' (Floor)' : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 2: Prior-Year Fees (Tax Isolation) & Multi-Mode Quotation Tracking */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            02. Prior-Year Fees &amp; Client Quotation Tracking
          </h2>
          <p className="text-xs text-slate-500">
            Audit fieldwork hours are derived strictly from the Prior-Year Audit Fee; tax fees are isolated so they never inflate audit hours.
          </p>
        </div>

        <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {/* Left: Prior Year Fees & Tax Scope */}
          <div className="p-6 space-y-4">
            <h3 className="text-xs font-semibold text-slate-800">Prior-Year Fee &amp; Tax Scope</h3>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Previous Year Audit Fee (RM) *
              </label>
              <input
                type="number"
                min={0}
                step={100}
                disabled={!isEditable}
                value={engagement.prior_fees.py_audit_fee}
                onChange={(e) => handlePyAuditFeeChange(Number(e.target.value))}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums disabled:bg-slate-50 disabled:text-slate-600 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
              />
              <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                Derives Allowed Cap: {formatRM(engagement.prior_fees.py_audit_fee)} × 70% ÷ RM{' '}
                {engagement.time_budget.charge_out_rate}/hr ={' '}
                <span className="font-semibold text-slate-800">
                  {engagement.time_budget.allowed_hours_cap.toFixed(1)} hrs
                </span>
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs font-medium text-slate-800">Tax Handled by Firm?</p>
                <p className="text-xs text-slate-500">
                  If No, PY Tax Fee is locked at RM 0 (Not Handled by Firm).
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5">
                <button
                  type="button"
                  disabled={!isEditable}
                  onClick={() => handleTaxHandledToggle(true)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    engagement.prior_fees.tax_handled_by_firm
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  } disabled:opacity-60`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  disabled={!isEditable}
                  onClick={() => handleTaxHandledToggle(false)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    !engagement.prior_fees.tax_handled_by_firm
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  } disabled:opacity-60`}
                >
                  No
                </button>
              </div>
            </div>

            {engagement.prior_fees.tax_handled_by_firm ? (
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Previous Year Tax Fee (RM) *
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  disabled={!isEditable}
                  value={engagement.prior_fees.py_tax_fee}
                  onChange={(e) =>
                    patchEngagement((prev) => ({
                      ...prev,
                      prior_fees: {
                        ...prev.prior_fees,
                        py_tax_fee: Math.max(0, Number(e.target.value) || 0),
                      },
                    }))
                  }
                  className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums disabled:bg-slate-50 disabled:text-slate-600 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                />
              </div>
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                Previous Year Tax Fee: <span className="font-mono font-semibold">RM 0</span> — Not Handled by Firm
              </div>
            )}
          </div>

          {/* Right: Multi-Mode Quotation Tracking */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-slate-800">
                  Current Year Client Quotation Check
                </h3>
                <p className="text-xs text-slate-500">
                  Has a quotation been issued for the CY proposed fee?
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5 shrink-0">
                <button
                  type="button"
                  disabled={!isEditable}
                  onClick={() => handleQuotationIssuedToggle(false)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    !engagement.quotation.quotation_issued
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  } disabled:opacity-60`}
                >
                  No
                </button>
                <button
                  type="button"
                  disabled={!isEditable}
                  onClick={() => handleQuotationIssuedToggle(true)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    engagement.quotation.quotation_issued
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  } disabled:opacity-60`}
                >
                  Yes
                </button>
              </div>
            </div>

            {!engagement.quotation.quotation_issued ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
                No quotation issued. Audit Partner will determine CY fee directly from MIA RPG 7 benchmarks and budgeted time cost.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!isEditable}
                    onClick={() => handleQuotationTypeChange('FIXED')}
                    className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                      engagement.quotation.quotation_type === 'FIXED'
                        ? 'border-[#1E3A5F] bg-slate-50 font-semibold text-slate-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    } disabled:opacity-70`}
                  >
                    Fixed Quotation
                    <span className="block font-normal text-[11px] text-slate-500">
                      Committed binding client quote
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!isEditable}
                    onClick={() => handleQuotationTypeChange('GENERAL_RANGE')}
                    className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                      engagement.quotation.quotation_type === 'GENERAL_RANGE'
                        ? 'border-[#1E3A5F] bg-slate-50 font-semibold text-slate-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    } disabled:opacity-70`}
                  >
                    General Range (RM xx ~ RM xx)
                    <span className="block font-normal text-[11px] text-amber-700">
                      REFERENCE ONLY — Non-Binding
                    </span>
                  </button>
                </div>

                {/* Ref & Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Quotation Ref No.
                    </label>
                    <input
                      type="text"
                      disabled={!isEditable}
                      value={engagement.quotation.quotation_ref}
                      onChange={(e) =>
                        patchEngagement((prev) => ({
                          ...prev,
                          quotation: { ...prev.quotation, quotation_ref: e.target.value },
                        }))
                      }
                      placeholder="e.g., QTN/2026/0210"
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Quotation Date
                    </label>
                    <input
                      type="date"
                      disabled={!isEditable}
                      value={engagement.quotation.quotation_date}
                      onChange={(e) =>
                        patchEngagement((prev) => ({
                          ...prev,
                          quotation: { ...prev.quotation, quotation_date: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {engagement.quotation.quotation_type === 'FIXED' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Quoted CY Audit Fee (RM) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        disabled={!isEditable}
                        value={engagement.quotation.fixed_audit_fee}
                        onChange={(e) =>
                          patchEngagement((prev) => ({
                            ...prev,
                            quotation: {
                              ...prev.quotation,
                              fixed_audit_fee: Math.max(0, Number(e.target.value) || 0),
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 tabular-nums disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Quoted CY Tax Fee (RM, Optional)
                      </label>
                      <input
                        type="number"
                        min={0}
                        disabled={!isEditable}
                        value={engagement.quotation.fixed_tax_fee}
                        onChange={(e) =>
                          patchEngagement((prev) => ({
                            ...prev,
                            quotation: {
                              ...prev.quotation,
                              tax_included: Number(e.target.value) > 0,
                              fixed_tax_fee: Math.max(0, Number(e.target.value) || 0),
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 tabular-nums disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Audit Fee Min (RM) *
                        </label>
                        <input
                          type="number"
                          min={0}
                          disabled={!isEditable}
                          value={engagement.quotation.range_audit_min}
                          onChange={(e) =>
                            patchEngagement((prev) => ({
                              ...prev,
                              quotation: {
                                ...prev.quotation,
                                range_audit_min: Math.max(0, Number(e.target.value) || 0),
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 tabular-nums disabled:bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Audit Fee Max (RM) *
                        </label>
                        <input
                          type="number"
                          min={0}
                          disabled={!isEditable}
                          value={engagement.quotation.range_audit_max}
                          onChange={(e) =>
                            patchEngagement((prev) => ({
                              ...prev,
                              quotation: {
                                ...prev.quotation,
                                range_audit_max: Math.max(0, Number(e.target.value) || 0),
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 tabular-nums disabled:bg-slate-50"
                        />
                      </div>
                    </div>
                    {engagement.quotation.range_audit_max > 0 && (
                      <p className="text-xs text-amber-800">
                        <strong className="font-semibold">REFERENCE ONLY:</strong> CY RPG 7
                        Benchmark ({formatRM(rpg7.highestBenchmark.recommendedFee)}) sits{' '}
                        <strong className="font-semibold">
                          {getRangePositionLabel(
                            rpg7.highestBenchmark.recommendedFee,
                            engagement.quotation.range_audit_min,
                            engagement.quotation.range_audit_max
                          )}
                        </strong>
                        .
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 3: Timeline, Milestone Schedule & Extension Controls */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              03. Engagement Timeline &amp; Milestone Schedule
            </h2>
            <p className="text-xs text-slate-500">
              Compares calendar working days against recommended net fieldwork days ((Allowed Hours − 7.0 hrs) ÷ 7.0 hrs/day).
            </p>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <div>
              <span className="text-slate-500">Working Days: </span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {workingDays} days
              </span>
            </div>
            <div>
              <span className="text-slate-500">Recommended: </span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {recommendedDays.toFixed(1)} days
              </span>
            </div>
            {workingDays > 0 && workingDays < recommendedDays && (
              <span className="font-medium text-amber-700">Tight schedule</span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Audit Job Commencement Date *
              </label>
              <input
                type="date"
                disabled={!isEditable}
                value={engagement.schedule.commencement_date}
                onChange={(e) =>
                  patchEngagement((prev) => ({
                    ...prev,
                    schedule: { ...prev.schedule, commencement_date: e.target.value },
                  }))
                }
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Estimated Target Completion Date *
              </label>
              <input
                type="date"
                disabled={!isEditable}
                value={engagement.schedule.target_completion_date}
                onChange={(e) =>
                  patchEngagement((prev) => ({
                    ...prev,
                    schedule: { ...prev.schedule, target_completion_date: e.target.value },
                  }))
                }
                className={`mt-1.5 w-full rounded-md border px-3 py-2 font-mono text-sm text-slate-900 disabled:bg-slate-50 ${
                  dateInvalid ? 'border-red-500 bg-red-50/40' : 'border-slate-300 bg-white'
                }`}
              />
              {dateInvalid && (
                <p className="mt-1 text-xs font-medium text-red-700">
                  Target Completion Date must be strictly after Commencement Date.
                </p>
              )}
            </div>
          </div>

          {/* 5 Milestones */}
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-xs font-semibold text-slate-700">Milestone Target Dates</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(
                [
                  { key: 'complete_fieldwork', label: 'Complete Fieldwork' },
                  { key: 'senior_review', label: 'Senior Review' },
                  { key: 'supervisor_review', label: 'Supervisor Review' },
                  { key: 'partner_review', label: 'Partner Review' },
                  { key: 'send_out_draft', label: 'Send Out Draft' },
                ] as const
              ).map((m) => (
                <div key={m.key}>
                  <label className="block text-xs text-slate-600">{m.label}</label>
                  <input
                    type="date"
                    disabled={!isEditable}
                    value={engagement.schedule.milestones[m.key]}
                    onChange={(e) =>
                      patchEngagement((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          milestones: {
                            ...prev.schedule.milestones,
                            [m.key]: e.target.value,
                          },
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 disabled:bg-slate-50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Extension Management (1st Extension: Audit Manager | 2nd Extension: Audit Partner) */}
          {engagement.status === 'APPROVED_ACTIVE' && (
            <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                    1st Extension (Audit Manager Authority)
                  </p>
                </div>
                {access.canManageFirstExtension ? (
                  <div className="mt-3 space-y-2">
                    <input
                      type="date"
                      value={ext1Date}
                      onChange={(e) => setExt1Date(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
                    />
                    <input
                      type="text"
                      value={ext1Reason}
                      onChange={(e) => setExt1Reason(e.target.value)}
                      placeholder="Reason for 1st extension..."
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      disabled={!ext1Date}
                      onClick={() => onUpdateExtension(engagement, 'FIRST', ext1Date, ext1Reason)}
                      className="rounded bg-[#1E3A5F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#162d4a] disabled:opacity-50"
                    >
                      Save 1st Extension
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 font-mono text-xs text-slate-600">
                    {engagement.schedule.first_extension_date
                      ? `${formatDateDisplay(engagement.schedule.first_extension_date)} — ${
                          engagement.schedule.first_extension_reason || 'Approved'
                        }`
                      : 'No 1st extension recorded'}
                  </p>
                )}
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                    2nd Extension (Audit Partner Authority)
                  </p>
                </div>
                {access.canManageSecondExtension ? (
                  <div className="mt-3 space-y-2">
                    <input
                      type="date"
                      value={ext2Date}
                      onChange={(e) => setExt2Date(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
                    />
                    <input
                      type="text"
                      value={ext2Reason}
                      onChange={(e) => setExt2Reason(e.target.value)}
                      placeholder="Reason for 2nd extension..."
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      disabled={!ext2Date}
                      onClick={() => onUpdateExtension(engagement, 'SECOND', ext2Date, ext2Reason)}
                      className="rounded bg-[#1E3A5F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#162d4a] disabled:opacity-50"
                    >
                      Save 2nd Extension
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 font-mono text-xs text-slate-600">
                    {engagement.schedule.second_extension_date
                      ? `${formatDateDisplay(engagement.schedule.second_extension_date)} — ${
                          engagement.schedule.second_extension_reason || 'Approved'
                        }`
                      : 'No 2nd extension recorded'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: 26-Section Audit Hours Planner */}
      <SectionHoursPlanner
        sections={engagement.time_budget.sections}
        allowedHoursCap={engagement.time_budget.allowed_hours_cap}
        chargeOutRate={engagement.time_budget.charge_out_rate}
        clearanceHours={engagement.time_budget.clearance_hours}
        isEditable={isEditable}
        onChangeSections={handleSectionsChange}
      />

      {/* PIC / Supervisor-as-PIC Submit Bar */}
      {access.canSubmitToManager && (
        <div className="rounded-lg border border-slate-300 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">
                Ready to Submit to Audit Manager?
              </h3>
              {validationErrors.length === 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  All intake rules passed. Submitting notifies {engagement.team_assignment.manager_name} (Audit Manager).
                </p>
              ) : (
                <ul className="mt-1 space-y-1 text-xs text-red-700">
                  {validationErrors.map((err, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              disabled={validationErrors.length > 0}
              onClick={() => onSubmitToManager(engagement)}
              className="inline-flex items-center gap-2 rounded-md bg-[#1E3A5F] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#162d4a] disabled:cursor-not-allowed disabled:bg-slate-300 transition-colors whitespace-nowrap"
            >
              <Send className="h-3.5 w-3.5" />
              Submit to Audit Manager
            </button>
          </div>
        </div>
      )}

      {showLetterModal && (
        <FeeIncreaseLetterModal
          engagement={engagement}
          onClose={() => setShowLetterModal(false)}
        />
      )}
    </div>
  );
};
