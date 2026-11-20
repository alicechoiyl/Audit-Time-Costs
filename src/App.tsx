import React, { useEffect, useState } from 'react';
import {
  Bell,
  Briefcase,
  Calculator,
  Menu,
  Users,
  X,
  LogOut,
  UserCheck,
} from 'lucide-react';
import type { AuditEngagement, EngagementNotification, StaffMember } from './types/audit';
import {
  getAuditManager,
  getAuditPartner,
  createEmpty26Sections,
  getStoredDepartmentRoster,
  getSupervisorForPic,
  INDUSTRY_OPTIONS,
} from './data/roster';
import { createSeedEngagements, createSeedNotifications } from './data/seedEngagements';
import {
  calculateAllowedHours,
  calculateRpg7Summary,
  calculateYoYPercent,
  DEFAULT_CHARGE_OUT_RATE,
  DEFAULT_CLEARANCE_HOURS,
  formatDateDisplay,
  formatPercent,
  formatRM,
} from './utils/rpg7';
import { evaluateEngagementAccess, getVisibleEngagements } from './utils/permissions';
import { EngagementList } from './components/EngagementList';
import { EngagementWorkspace } from './components/EngagementWorkspace';
import { NotificationDrawer } from './components/NotificationDrawer';
import { RosterView } from './components/RosterView';
import { Rpg7ReferenceView } from './components/Rpg7ReferenceView';
import { LoginView } from './components/LoginView';

const STORAGE_ENGAGEMENTS_KEY = 'meridian_audit_engagements_v3';
const STORAGE_NOTIFICATIONS_KEY = 'meridian_audit_notifications_v3';
const STORAGE_SESSION_KEY = 'meridian_audit_session_v2';

type NavView = 'engagements' | 'rpg7' | 'roster';

export function App() {
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
      if (savedSession) {
        const staff = JSON.parse(savedSession);
        if (staff && staff.id) {
          const roster = getStoredDepartmentRoster();
          const found = roster.find((s) => s.id === staff.id);
          if (found) return found;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [engagements, setEngagements] = useState<AuditEngagement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ENGAGEMENTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    const seed = createSeedEngagements();
    return seed;
  });

  const [notifications, setNotifications] = useState<EngagementNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return createSeedNotifications();
  });

  const [activeNav, setActiveNav] = useState<NavView>('engagements');
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch {
      // Ignore
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ENGAGEMENTS_KEY, JSON.stringify(engagements));
    } catch {
      // Ignore
    }
  }, [engagements]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch {
      // Ignore
    }
  }, [notifications]);

  if (!currentUser) {
    return <LoginView onLogin={(staff) => setCurrentUser(staff)} />;
  }

  const roster = getStoredDepartmentRoster();
  const auditManager = getAuditManager(roster);
  const auditPartner = getAuditPartner(roster);

  const visibleEngagements = getVisibleEngagements(currentUser, engagements);

  const selectedEngagement = selectedEngagementId
    ? engagements.find((e) => e.engagement_id === selectedEngagementId) ?? null
    : null;

  const selectedEngagementAllowed =
    selectedEngagement && evaluateEngagementAccess(currentUser, selectedEngagement).canView
      ? selectedEngagement
      : null;

  const unreadNotifCount = notifications.filter(
    (n) => n.recipient_ids.includes(currentUser.id) && !n.read_by.includes(currentUser.id)
  ).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? '' : curr));
    }, 4000);
  };

  const pushNotification = (notif: Omit<EngagementNotification, 'id' | 'timestamp' | 'read_by'>) => {
    const newNotif: EngagementNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read_by: [],
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setSelectedEngagementId(null);
  };

  const handleCreateNewJob = () => {
    if (currentUser.role !== 'AUDIT_PIC' && currentUser.role !== 'SUPERVISOR') return;

    const supervisor =
      currentUser.role === 'AUDIT_PIC' ? getSupervisorForPic(currentUser, roster) : null;
    const nextNum = engagements.length + 1;
    const newId = `ENG-2026-${String(nextNum).padStart(3, '0')}`;
    const sections = createEmpty26Sections(); // All 26 sections have planned_hours: 0

    const newJob: AuditEngagement = {
      engagement_id: newId,
      status: 'DRAFT',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client_info: {
        client_name: '',
        registration_no: '',
        fye_date: '',
        industry: INDUSTRY_OPTIONS[0],
      },
      team_assignment: {
        pic_id: currentUser.id,
        pic_name: currentUser.name,
        pic_email: currentUser.email,
        pic_role: currentUser.role === 'SUPERVISOR' ? 'SUPERVISOR' : 'AUDIT_PIC',
        supervisor_id: supervisor ? supervisor.id : (roster.find((s) => s.role === 'SUPERVISOR')?.id || ''),
        supervisor_name: supervisor ? supervisor.name : (roster.find((s) => s.role === 'SUPERVISOR')?.name || ''),
        supervisor_email: supervisor ? supervisor.email : (roster.find((s) => s.role === 'SUPERVISOR')?.email || ''),
        reviewer_id: roster.find((s) => s.role === 'SUPERVISOR' && s.id !== supervisor?.id)?.id || roster.find((s) => s.role === 'SUPERVISOR')?.id || '',
        reviewer_name: roster.find((s) => s.role === 'SUPERVISOR' && s.id !== supervisor?.id)?.name || roster.find((s) => s.role === 'SUPERVISOR')?.name || '',
        reviewer_email: roster.find((s) => s.role === 'SUPERVISOR' && s.id !== supervisor?.id)?.email || roster.find((s) => s.role === 'SUPERVISOR')?.email || '',
        manager_id: auditManager ? auditManager.id : '',
        manager_name: auditManager ? auditManager.name : 'Audit Manager',
        partner_id: auditPartner ? auditPartner.id : '',
        partner_name: auditPartner ? auditPartner.name : 'Audit Partner',
      },
      financials: {
        cy_revenue: 0,
        py_revenue: 0,
        cy_assets: 0,
        py_assets: 0,
        cy_expenses: 0,
        py_expenses: 0,
      },
      prior_fees: {
        py_audit_fee: 0,
        tax_handled_by_firm: false,
        py_tax_fee: 0,
      },
      quotation: {
        quotation_issued: false,
        quotation_type: 'NONE',
        quotation_ref: '',
        quotation_date: '',
        tax_included: false,
        fixed_audit_fee: 0,
        fixed_tax_fee: 0,
        range_audit_min: 0,
        range_audit_max: 0,
        range_tax_min: 0,
        range_tax_max: 0,
      },
      schedule: {
        commencement_date: '',
        target_completion_date: '',
        milestones: {
          complete_fieldwork: '',
          senior_review: '',
          supervisor_review: '',
          partner_review: '',
          send_out_draft: '',
        },
        first_extension_date: '',
        first_extension_reason: '',
        second_extension_date: '',
        second_extension_reason: '',
      },
      time_budget: {
        charge_out_rate: DEFAULT_CHARGE_OUT_RATE,
        clearance_hours: DEFAULT_CLEARANCE_HOURS,
        allowed_hours_cap: 0,
        total_planned_hours: 0,
        sections,
      },
      approvals: {
        manager_approved: false,
        manager_approved_at: '',
        manager_notes: '',
        partner_approved: false,
        partner_approved_at: '',
        decided_cy_audit_fee: null,
        decided_ny_audit_fee: null,
        fee_variance_reason: '',
        last_return_note: '',
        last_returned_by: '',
      },
    };

    setEngagements((prev) => [newJob, ...prev]);
    setSelectedEngagementId(newId);
    setActiveNav('engagements');
    showToast(`Created draft engagement ${newId}.`);
  };

  const handleUpdateEngagement = (updated: AuditEngagement) => {
    setEngagements((prev) =>
      prev.map((e) => (e.engagement_id === updated.engagement_id ? updated : e))
    );
  };

  const handleSubmitToManager = (eng: AuditEngagement) => {
    const updated: AuditEngagement = {
      ...eng,
      status: 'PENDING_MANAGER',
      updated_at: new Date().toISOString(),
      approvals: {
        ...eng.approvals,
        last_return_note: '',
        last_returned_by: '',
      },
    };
    handleUpdateEngagement(updated);

    const revPct = formatPercent(
      calculateYoYPercent(eng.financials.cy_revenue, eng.financials.py_revenue)
    );
    const assetPct = formatPercent(
      calculateYoYPercent(eng.financials.cy_assets, eng.financials.py_assets)
    );
    const opexPct = formatPercent(
      calculateYoYPercent(eng.financials.cy_expenses, eng.financials.py_expenses)
    );

    const targetManagerId = auditManager ? auditManager.id : 'manager-1';
    const targetManagerName = auditManager ? auditManager.name : 'Audit Manager';

    pushNotification({
      engagement_id: eng.engagement_id,
      client_name: eng.client_info.client_name,
      trigger_event: 'SUBMITTED_TO_MANAGER',
      recipient_ids: [targetManagerId],
      recipient_labels: [targetManagerName],
      title: 'New Engagement Submitted for 1st-Level Review',
      message: `${eng.team_assignment.pic_name} submitted ${eng.client_info.client_name} (FYE ${formatDateDisplay(
        eng.client_info.fye_date
      )}) to Audit Manager.`,
      details: [
        {
          label: 'Planned vs Cap',
          value: `${eng.time_budget.total_planned_hours.toFixed(
            1
          )} hrs / ${eng.time_budget.allowed_hours_cap.toFixed(1)} hrs`,
        },
        {
          label: 'Schedule',
          value: `${formatDateDisplay(eng.schedule.commencement_date)} → ${formatDateDisplay(
            eng.schedule.target_completion_date
          )}`,
        },
        {
          label: 'YoY Growth',
          value: `Rev ${revPct} · Assets ${assetPct} · OpEx ${opexPct}`,
        },
      ],
    });

    showToast(`Submitted ${eng.client_info.client_name} to ${targetManagerName}.`);
  };

  const handleManagerApprove = (eng: AuditEngagement, managerNotes: string) => {
    const updated: AuditEngagement = {
      ...eng,
      status: 'PENDING_PARTNER',
      updated_at: new Date().toISOString(),
      approvals: {
        ...eng.approvals,
        manager_approved: true,
        manager_approved_at: new Date().toISOString(),
        manager_notes: managerNotes,
      },
    };
    handleUpdateEngagement(updated);

    const rpg7 = calculateRpg7Summary(
      eng.financials.cy_revenue,
      eng.financials.cy_assets,
      eng.financials.cy_expenses,
      eng.prior_fees.py_audit_fee
    );
    const timeCost = Math.round(
      eng.time_budget.total_planned_hours * eng.time_budget.charge_out_rate
    );

    const quoteSummary = !eng.quotation.quotation_issued
      ? 'None'
      : eng.quotation.quotation_type === 'FIXED'
      ? `Fixed ${formatRM(eng.quotation.fixed_audit_fee)}`
      : `Range ${formatRM(eng.quotation.range_audit_min)} ~ ${formatRM(
          eng.quotation.range_audit_max
        )} (Ref Only)`;

    const targetPartnerId = auditPartner ? auditPartner.id : 'partner-1';
    const targetPartnerName = auditPartner ? auditPartner.name : 'Audit Partner';
    const currentManagerName = auditManager ? auditManager.name : 'Audit Manager';

    pushNotification({
      engagement_id: eng.engagement_id,
      client_name: eng.client_info.client_name,
      trigger_event: 'APPROVED_BY_MANAGER',
      recipient_ids: [targetPartnerId],
      recipient_labels: [targetPartnerName],
      title: '1st-Level Approved — Ready for Partner Fee Decision',
      message: `${currentManagerName} approved ${eng.client_info.client_name} (PIC: ${eng.team_assignment.pic_name}) for 2nd-Level Partner review.`,
      details: [
        {
          label: 'Approved Hours & Cost',
          value: `${eng.time_budget.total_planned_hours.toFixed(1)} hrs · ${formatRM(timeCost)}`,
        },
        {
          label: 'MIA RPG 7 (Rev / Assets / OpEx)',
          value: `${formatRM(rpg7.revenue.recommendedFee)} / ${formatRM(
            rpg7.assets.recommendedFee
          )} / ${formatRM(rpg7.expenses.recommendedFee)}`,
        },
        {
          label: 'PY Fees & Quotation',
          value: `PY ${formatRM(eng.prior_fees.py_audit_fee)} · ${quoteSummary}`,
        },
      ],
    });

    showToast(`1st-Level Approved. Forwarded to ${targetPartnerName}.`);
  };

  const handleManagerReturn = (eng: AuditEngagement, reason: string) => {
    const currentManagerName = auditManager ? auditManager.name : 'Audit Manager';
    const updated: AuditEngagement = {
      ...eng,
      status: 'DRAFT',
      updated_at: new Date().toISOString(),
      approvals: {
        ...eng.approvals,
        manager_approved: false,
        last_return_note: reason,
        last_returned_by: `${currentManagerName} (Audit Manager)`,
      },
    };
    handleUpdateEngagement(updated);
    setSelectedEngagementId(null);

    pushNotification({
      engagement_id: eng.engagement_id,
      client_name: eng.client_info.client_name,
      trigger_event: 'RETURNED_BY_MANAGER',
      recipient_ids: [eng.team_assignment.pic_id],
      recipient_labels: [eng.team_assignment.pic_name],
      title: 'Returned for Revision by Audit Manager',
      message: `${currentManagerName} returned ${eng.client_info.client_name} to Draft: "${reason}"`,
      details: [{ label: 'Action Required', value: 'Update draft and resubmit to Manager' }],
    });

    showToast(`Returned ${eng.client_info.client_name} to ${eng.team_assignment.pic_name}.`);
  };

  const handlePartnerApprove = (
    eng: AuditEngagement,
    payload: { decidedCyFee: number; decidedNyFee: number; varianceReason: string }
  ) => {
    const updated: AuditEngagement = {
      ...eng,
      status: 'APPROVED_ACTIVE',
      updated_at: new Date().toISOString(),
      approvals: {
        ...eng.approvals,
        partner_approved: true,
        partner_approved_at: new Date().toISOString(),
        decided_cy_audit_fee: payload.decidedCyFee,
        decided_ny_audit_fee: payload.decidedNyFee,
        fee_variance_reason: payload.varianceReason,
      },
    };
    handleUpdateEngagement(updated);

    const recipientIds: string[] = [eng.team_assignment.pic_id];
    const recipientLabels: string[] = [`${eng.team_assignment.pic_name} (Audit PIC)`];

    const supStaff = roster.find((s) => s.id === eng.team_assignment.supervisor_id);
    if (supStaff && !recipientIds.includes(supStaff.id)) {
      recipientIds.push(supStaff.id);
      recipientLabels.push(`${supStaff.name} (Team Supervisor)`);
    }

    const revStaff = roster.find((s) => s.id === eng.team_assignment.reviewer_id);
    if (revStaff && !recipientIds.includes(revStaff.id)) {
      recipientIds.push(revStaff.id);
      recipientLabels.push(`${revStaff.name} (Reviewer)`);
    }

    const targetManagerId = auditManager ? auditManager.id : 'manager-1';
    const targetManagerName = auditManager ? auditManager.name : 'Audit Manager';
    if (!recipientIds.includes(targetManagerId)) {
      recipientIds.push(targetManagerId);
      recipientLabels.push(`${targetManagerName} (Audit Manager)`);
    }

    const targetPartnerName = auditPartner ? auditPartner.name : 'Audit Partner';

    pushNotification({
      engagement_id: eng.engagement_id,
      client_name: eng.client_info.client_name,
      trigger_event: 'APPROVED_BY_PARTNER',
      recipient_ids: recipientIds,
      recipient_labels: recipientLabels,
      title: '2nd-Level Approved & Fee Decided — Read-Only Viewer Unlocked',
      message: `${targetPartnerName} finalized ${eng.client_info.client_name} at ${formatRM(
        payload.decidedCyFee
      )} (CY). Read-Only Viewer access is now unlocked for Team Supervisor and Reviewer.`,
      details: [
        {
          label: 'Decided Audit Fees',
          value: `CY ${formatRM(payload.decidedCyFee)} · NY ${formatRM(payload.decidedNyFee)}`,
        },
        {
          label: 'Approved Hours & Draft Date',
          value: `${eng.time_budget.total_planned_hours.toFixed(1)} hrs · Send Draft ${formatDateDisplay(
            eng.schedule.milestones.send_out_draft
          )}`,
        },
        {
          label: 'Viewer Access',
          value: `Unlocked for ${eng.team_assignment.supervisor_name} & ${eng.team_assignment.reviewer_name}`,
        },
      ],
    });

    showToast(
      `2nd-Level Approved (${formatRM(payload.decidedCyFee)}). Notified PIC, Supervisor, Reviewer & Manager.`
    );
  };

  const handlePartnerReturn = (eng: AuditEngagement, reason: string) => {
    const targetPartnerName = auditPartner ? auditPartner.name : 'Audit Partner';
    const targetManagerId = auditManager ? auditManager.id : 'manager-1';
    const updated: AuditEngagement = {
      ...eng,
      status: 'DRAFT',
      updated_at: new Date().toISOString(),
      approvals: {
        ...eng.approvals,
        manager_approved: false,
        partner_approved: false,
        last_return_note: reason,
        last_returned_by: `${targetPartnerName} (Audit Partner)`,
      },
    };
    handleUpdateEngagement(updated);
    setSelectedEngagementId(null);

    pushNotification({
      engagement_id: eng.engagement_id,
      client_name: eng.client_info.client_name,
      trigger_event: 'RETURNED_BY_PARTNER',
      recipient_ids: [eng.team_assignment.pic_id, targetManagerId],
      recipient_labels: [eng.team_assignment.pic_name, auditManager?.name || 'Audit Manager'],
      title: 'Returned for Revision by Audit Partner',
      message: `${targetPartnerName} returned ${eng.client_info.client_name} to Draft: "${reason}"`,
      details: [{ label: 'Action Required', value: 'PIC to revise and resubmit' }],
    });

    showToast(`Returned ${eng.client_info.client_name} to ${eng.team_assignment.pic_name}.`);
  };

  const handleUpdateExtension = (
    eng: AuditEngagement,
    level: 'FIRST' | 'SECOND',
    extensionDate: string,
    reason: string
  ) => {
    const updated: AuditEngagement = {
      ...eng,
      updated_at: new Date().toISOString(),
      schedule:
        level === 'FIRST'
          ? {
              ...eng.schedule,
              first_extension_date: extensionDate,
              first_extension_reason: reason,
            }
          : {
              ...eng.schedule,
              second_extension_date: extensionDate,
              second_extension_reason: reason,
            },
    };
    handleUpdateEngagement(updated);

    const recipientIds = [eng.team_assignment.pic_id];
    const recipientLabels = [eng.team_assignment.pic_name];
    if (eng.team_assignment.supervisor_id) {
      recipientIds.push(eng.team_assignment.supervisor_id);
      recipientLabels.push(eng.team_assignment.supervisor_name || 'Supervisor');
    }

    pushNotification({
      engagement_id: eng.engagement_id,
      client_name: eng.client_info.client_name,
      trigger_event: 'EXTENSION_UPDATED',
      recipient_ids: recipientIds,
      recipient_labels: recipientLabels,
      title: `${level === 'FIRST' ? '1st' : '2nd'} Extension Approved`,
      message: `${currentUser.name} recorded a ${
        level === 'FIRST' ? '1st' : '2nd'
      } extension to ${formatDateDisplay(extensionDate)} for ${eng.client_info.client_name}.`,
      details: [{ label: 'Reason', value: reason || 'Schedule adjustment approved' }],
    });

    showToast(`Saved ${level === 'FIRST' ? '1st' : '2nd'} extension to ${formatDateDisplay(extensionDate)}.`);
  };

  const handleMarkNotifRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId && !n.read_by.includes(currentUser.id)
          ? { ...n, read_by: [...n.read_by, currentUser.id] }
          : n
      )
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.recipient_ids.includes(currentUser.id) && !n.read_by.includes(currentUser.id)
          ? { ...n, read_by: [...n.read_by, currentUser.id] }
          : n
      )
    );
  };

  const openEngagementFromNotif = (engagementId: string) => {
    const target = engagements.find((e) => e.engagement_id === engagementId);
    if (!target) return;
    if (evaluateEngagementAccess(currentUser, target).canView) {
      setActiveNav('engagements');
      setSelectedEngagementId(engagementId);
    } else {
      showToast('You do not have permission to view this engagement.');
    }
  };

  const breadcrumbText =
    activeNav === 'rpg7'
      ? 'MIA RPG 7 Calculator'
      : activeNav === 'roster'
      ? `Department Roster (${roster.length})`
      : selectedEngagementAllowed
      ? `Engagements / ${selectedEngagementAllowed.engagement_id}`
      : 'Engagements';

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Desktop Left Sidebar (256px) */}
      <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <button
            type="button"
            onClick={() => {
              setActiveNav('engagements');
              setSelectedEngagementId(null);
            }}
            className="text-left text-base font-bold tracking-tight text-slate-900 whitespace-nowrap"
          >
            Meridian Audit
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <button
            type="button"
            onClick={() => {
              setActiveNav('engagements');
              setSelectedEngagementId(null);
            }}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              activeNav === 'engagements'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Briefcase className="h-4 w-4 text-slate-500" />
            Engagements ({visibleEngagements.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveNav('rpg7');
              setSelectedEngagementId(null);
            }}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              activeNav === 'rpg7'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Calculator className="h-4 w-4 text-slate-500" />
            MIA RPG 7 Calculator
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveNav('roster');
              setSelectedEngagementId(null);
            }}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              activeNav === 'roster'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4 text-slate-500" />
            Department Roster ({roster.length})
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-200 p-4 space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-800 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/30"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <span className="text-base font-bold text-slate-900">Meridian Audit</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              <button
                type="button"
                onClick={() => {
                  setActiveNav('engagements');
                  setSelectedEngagementId(null);
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Briefcase className="h-4 w-4" />
                Engagements ({visibleEngagements.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('rpg7');
                  setSelectedEngagementId(null);
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Calculator className="h-4 w-4" />
                MIA RPG 7 Calculator
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('roster');
                  setSelectedEngagementId(null);
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Users className="h-4 w-4" />
                Department Roster ({roster.length})
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <p className="truncate text-xs font-medium text-slate-500">
              Audit Time Cost &amp; Fee Guideline <span className="mx-1.5">/</span>
              <span className="font-semibold text-slate-900">{breadcrumbText}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Signed-in User Info Badge */}
            <div className="hidden sm:flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <div>
                <span className="font-semibold text-slate-950">{currentUser.name}</span>
                <span className="text-slate-400 mx-1">·</span>
                <span className="font-mono text-slate-600">{currentUser.email}</span>
              </div>
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setIsNotifOpen(true)}
              className="relative inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
              aria-label="Open notifications"
            >
              <Bell className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Alerts</span>
              {unreadNotifCount > 0 && (
                <span className="font-mono text-xs font-bold text-[#1E3A5F] tabular-nums">
                  ({unreadNotifCount})
                </span>
              )}
            </button>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-500" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-8">
          {activeNav === 'rpg7' ? (
            <Rpg7ReferenceView />
          ) : activeNav === 'roster' ? (
            <RosterView currentUser={currentUser} onSwitchUser={(id) => {
              const found = roster.find((s) => s.id === id);
              if (found) setCurrentUser(found);
            }} />
          ) : selectedEngagementAllowed ? (
            <EngagementWorkspace
              engagement={selectedEngagementAllowed}
              currentUser={currentUser}
              onBack={() => setSelectedEngagementId(null)}
              onUpdateEngagement={handleUpdateEngagement}
              onSubmitToManager={handleSubmitToManager}
              onManagerApprove={handleManagerApprove}
              onManagerReturn={handleManagerReturn}
              onPartnerApprove={handlePartnerApprove}
              onPartnerReturn={handlePartnerReturn}
              onUpdateExtension={handleUpdateExtension}
            />
          ) : (
            <EngagementList
              engagements={visibleEngagements}
              allEngagements={engagements}
              currentUser={currentUser}
              onSelectEngagement={(id) => setSelectedEngagementId(id)}
              onCreateNewJob={handleCreateNewJob}
            />
          )}
        </main>
      </div>

      {/* Live Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        currentUser={currentUser}
        notifications={notifications}
        onMarkAsRead={handleMarkNotifRead}
        onMarkAllRead={handleMarkAllRead}
        onSelectEngagement={openEngagementFromNotif}
      />

      {/* Action Confirmation Toast */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 right-5 z-50 rounded-md border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
