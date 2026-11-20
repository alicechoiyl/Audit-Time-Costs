import React, { useState } from 'react';
import { Plus, Search, Lock, ArrowRight } from 'lucide-react';
import type { AuditEngagement, EngagementStatus, StaffMember } from '../types/audit';
import {
  calculateRpg7Summary,
  formatDateDisplay,
  formatRM,
  getStatusLabel,
} from '../utils/rpg7';
import {
  canUserCreateEngagement,
  countLockedSupervisorJobs,
  evaluateEngagementAccess,
} from '../utils/permissions';

interface EngagementListProps {
  engagements: AuditEngagement[];
  allEngagements: AuditEngagement[];
  currentUser: StaffMember;
  onSelectEngagement: (engagementId: string) => void;
  onCreateNewJob: () => void;
}

type StatusFilter = 'ALL' | EngagementStatus;

export const EngagementList: React.FC<EngagementListProps> = ({
  engagements,
  allEngagements,
  currentUser,
  onSelectEngagement,
  onCreateNewJob,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const lockedCount = countLockedSupervisorJobs(currentUser, allEngagements);
  const canCreate = canUserCreateEngagement(currentUser);

  const filtered = engagements.filter((eng) => {
    const matchesStatus = statusFilter === 'ALL' || eng.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      eng.client_info.client_name.toLowerCase().includes(q) ||
      eng.engagement_id.toLowerCase().includes(q) ||
      ((eng.team_assignment.pic_name?.toLowerCase().includes(q)) ?? false);
    return matchesStatus && matchesSearch;
  });

  // Summary metrics scoped strictly to visible engagements
  const actionRequiredCount = engagements.filter((eng) => {
    const acc = evaluateEngagementAccess(currentUser, eng);
    return acc.canEditDraft || acc.canManagerReview || acc.canPartnerReview;
  }).length;

  const totalVisibleRpg7Floor = engagements.reduce((sum, eng) => {
    const rpg7 = calculateRpg7Summary(
      eng.financials.cy_revenue,
      eng.financials.cy_assets,
      eng.financials.cy_expenses,
      eng.prior_fees.py_audit_fee
    );
    return sum + rpg7.highestBenchmark.recommendedFee;
  }, 0);

  const totalVisiblePyFees = engagements.reduce(
    (sum, eng) => sum + eng.prior_fees.py_audit_fee,
    0
  );

  const statusTextClass = (status: EngagementStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'text-slate-600';
      case 'PENDING_MANAGER':
        return 'text-amber-700';
      case 'PENDING_PARTNER':
        return 'text-sky-700';
      case 'APPROVED_ACTIVE':
        return 'text-emerald-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Audit Engagements &amp; Fee Approvals
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Viewing as {currentUser.name} ({currentUser.title}) · MIA RPG 7 (Revised) Time-Cost &amp; 2-Level Approval Queue
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={onCreateNewJob}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#162d4a] transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            New Audit Job
          </button>
        )}
      </div>

      {/* KPI Strip (Single Elevation, Hairline Dividers) */}
      <div className="grid grid-cols-1 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        <div className="p-5">
          <p className="text-xs text-slate-500">Visible Engagements</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {engagements.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Permitted by role scope</p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Action Required</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#1E3A5F] tabular-nums">
            {actionRequiredCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {currentUser.role === 'AUDIT_MANAGER'
              ? 'Pending 1st-level approval'
              : currentUser.role === 'AUDIT_PARTNER'
              ? 'Pending 2nd-level fee decision'
              : 'Drafts ready to submit'}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Prior-Year Audit Fees</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatRM(totalVisiblePyFees)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Tax fees strictly isolated</p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">MIA RPG 7 Benchmark Total</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatRM(totalVisibleRpg7Floor)}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
            Avg Recovery:{' '}
            {totalVisibleRpg7Floor > 0
              ? `${((totalVisiblePyFees / totalVisibleRpg7Floor) * 100).toFixed(1)}%`
              : '—'}
          </p>
        </div>
      </div>

      {/* Supervisor Pre-Approval Isolation Notice */}
      {currentUser.role === 'SUPERVISOR' && lockedCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-5 py-3.5 text-xs text-slate-700">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <div>
            <span className="font-semibold text-slate-900">
              {lockedCount} team engagement{lockedCount === 1 ? '' : 's'} hidden prior to 2-level approval.
            </span>{' '}
            Under department RBAC rules, Supervisors have zero visibility into team PIC engagements while in Draft, Pending Manager, or Pending Partner states. Read-Only Viewer access unlocks automatically once the Audit Partner finalizes 2nd-level approval.
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-0.5">
            {(
              [
                { key: 'ALL', label: 'All Visible' },
                { key: 'DRAFT', label: 'Draft' },
                { key: 'PENDING_MANAGER', label: 'Pending Manager' },
                { key: 'PENDING_PARTNER', label: 'Pending Partner' },
                { key: 'APPROVED_ACTIVE', label: 'Approved & Active' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client, ID, or PIC..."
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
            />
          </div>
        </div>

        {/* High-Density Data Table */}
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-800">
              No engagements match the current view
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {canCreate
                ? 'Create a new audit engagement to begin time-cost planning and MIA RPG 7 benchmarking.'
                : 'Switch roles in the top bar or adjust your filter to view other workflow stages.'}
            </p>
            {canCreate && (
              <button
                type="button"
                onClick={onCreateNewJob}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#162d4a]"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Audit Job
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                  <th className="px-5 py-3 font-semibold">Client &amp; FYE</th>
                  <th className="px-4 py-3 font-semibold">PIC / Team</th>
                  <th className="px-4 py-3 font-semibold">Status &amp; Access</th>
                  <th className="px-4 py-3 text-right font-semibold">Hours / Cap</th>
                  <th className="px-4 py-3 text-right font-semibold">PY Audit Fee</th>
                  <th className="px-4 py-3 text-right font-semibold">RPG 7 Benchmark</th>
                  <th className="px-4 py-3 text-right font-semibold">Decided CY Fee</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((eng) => {
                  const rpg7 = calculateRpg7Summary(
                    eng.financials.cy_revenue,
                    eng.financials.cy_assets,
                    eng.financials.cy_expenses,
                    eng.prior_fees.py_audit_fee
                  );
                  const acc = evaluateEngagementAccess(currentUser, eng);

                  return (
                    <tr
                      key={eng.engagement_id}
                      onClick={() => onSelectEngagement(eng.engagement_id)}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {eng.client_info.client_name || 'Untitled Client'}
                          </p>
                          {(eng.documents?.length || 0) > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-700" title={`${eng.documents.length} attached document(s)`}>
                              📎 {eng.documents.length}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          <span className="font-mono">{eng.engagement_id}</span> · FYE{' '}
                          {formatDateDisplay(eng.client_info.fye_date)} · {eng.client_info.industry}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800">{eng.team_assignment.pic_name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {eng.team_assignment.pic_role === 'SUPERVISOR'
                            ? 'Supervisor-as-PIC'
                            : `Sup: ${eng.team_assignment.supervisor_name}`}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className={`font-semibold ${statusTextClass(eng.status)}`}>
                          {getStatusLabel(eng.status)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{acc.accessModeLabel}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-800">
                        {eng.time_budget.total_planned_hours.toFixed(1)} /{' '}
                        {eng.time_budget.allowed_hours_cap.toFixed(1)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-700">
                        {formatRM(eng.prior_fees.py_audit_fee)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                        <p className="font-semibold text-slate-900">
                          {formatRM(rpg7.highestBenchmark.recommendedFee)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {rpg7.recoveryPercent.toFixed(1)}% rec.
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                        {eng.approvals.decided_cy_audit_fee ? (
                          <span className="font-semibold text-emerald-700">
                            {formatRM(eng.approvals.decided_cy_audit_fee)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 font-medium text-[#1E3A5F] whitespace-nowrap">
                          {acc.canPartnerReview
                            ? 'Price & Approve'
                            : acc.canManagerReview
                            ? 'Review'
                            : acc.canEditDraft
                            ? 'Edit Draft'
                            : 'View'}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
