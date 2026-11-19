import type { AuditEngagement, StaffMember } from '../types/audit';

export interface EngagementAccess {
  canView: boolean;
  canEditDraft: boolean;
  canSubmitToManager: boolean;
  canManagerReview: boolean;
  canPartnerReview: boolean;
  canManageFirstExtension: boolean;
  canManageSecondExtension: boolean;
  canViewFeeLetter: boolean;
  accessModeLabel: string;
}

/**
 * Enforces the 21-user Department RBAC matrix:
 * - AUDIT_PIC: Only own assigned jobs; edit & submit in DRAFT; read-only afterward.
 * - SUPERVISOR (Dual-Role):
 *    1. If assigned as Job PIC -> full Audit PIC permissions.
 *    2. If supervising the Job PIC -> ZERO access before APPROVED_ACTIVE;
 *       unlocks Read-Only Viewer once APPROVED_ACTIVE.
 * - AUDIT_MANAGER: Views all submitted/active jobs (and drafts for visibility? Spec: views all submitted jobs PENDING_MANAGER + full read-only visibility across all engagements + 1st Extension).
 * - AUDIT_PARTNER: Views Manager-approved jobs PENDING_PARTNER + full read-only visibility + 2nd Extension + Fee Increase Letter.
 */
export function evaluateEngagementAccess(
  user: StaffMember,
  engagement: AuditEngagement
): EngagementAccess {
  const isOwnerPic = engagement.team_assignment.pic_id === user.id;
  const isAssignedSupervisor = engagement.team_assignment.supervisor_id === user.id;
  const status = engagement.status;

  if (user.role === 'AUDIT_PIC') {
    if (!isOwnerPic) {
      return denyAll();
    }
    const isDraft = status === 'DRAFT';
    return {
      canView: true,
      canEditDraft: isDraft,
      canSubmitToManager: isDraft,
      canManagerReview: false,
      canPartnerReview: false,
      canManageFirstExtension: false,
      canManageSecondExtension: false,
      canViewFeeLetter: false,
      accessModeLabel: isDraft ? 'PIC Draft Editor' : 'PIC Read-Only',
    };
  }

  if (user.role === 'SUPERVISOR') {
    if (isOwnerPic) {
      const isDraft = status === 'DRAFT';
      return {
        canView: true,
        canEditDraft: isDraft,
        canSubmitToManager: isDraft,
        canManagerReview: false,
        canPartnerReview: false,
        canManageFirstExtension: false,
        canManageSecondExtension: false,
        canViewFeeLetter: false,
        accessModeLabel: isDraft ? 'Supervisor-as-PIC Editor' : 'Supervisor-as-PIC Read-Only',
      };
    }

    if (isAssignedSupervisor && status === 'APPROVED_ACTIVE') {
      return {
        canView: true,
        canEditDraft: false,
        canSubmitToManager: false,
        canManagerReview: false,
        canPartnerReview: false,
        canManageFirstExtension: false,
        canManageSecondExtension: false,
        canViewFeeLetter: false,
        accessModeLabel: 'Supervisor Read-Only Viewer',
      };
    }

    // Zero visibility prior to 2-level approval when not assigned as Job PIC
    return denyAll();
  }

  if (user.role === 'AUDIT_MANAGER') {
    const canReview = status === 'PENDING_MANAGER';
    const isApproved = status === 'APPROVED_ACTIVE';
    return {
      canView: status !== 'DRAFT',
      canEditDraft: false,
      canSubmitToManager: false,
      canManagerReview: canReview,
      canPartnerReview: false,
      canManageFirstExtension: isApproved,
      canManageSecondExtension: false,
      canViewFeeLetter: isApproved,
      accessModeLabel: canReview ? '1st-Level Manager Review' : 'Manager Read-Only',
    };
  }

  // AUDIT_PARTNER
  const canReview = status === 'PENDING_PARTNER';
  const isApproved = status === 'APPROVED_ACTIVE';
  return {
    canView: status === 'PENDING_PARTNER' || status === 'APPROVED_ACTIVE',
    canEditDraft: false,
    canSubmitToManager: false,
    canManagerReview: false,
    canPartnerReview: canReview,
    canManageFirstExtension: false,
    canManageSecondExtension: isApproved,
    canViewFeeLetter: isApproved,
    accessModeLabel: canReview ? '2nd-Level Partner Pricing Desk' : 'Partner Read-Only',
  };
}

export function canUserCreateEngagement(user: StaffMember): boolean {
  return user.role === 'AUDIT_PIC' || user.role === 'SUPERVISOR';
}

export function getVisibleEngagements(
  user: StaffMember,
  engagements: AuditEngagement[]
): AuditEngagement[] {
  return engagements.filter((eng) => evaluateEngagementAccess(user, eng).canView);
}

/**
 * Counts how many of a Supervisor's team jobs are currently hidden/locked pre-approval.
 * Used only to display an aggregate count notice without leaking any job data.
 */
export function countLockedSupervisorJobs(
  user: StaffMember,
  engagements: AuditEngagement[]
): number {
  if (user.role !== 'SUPERVISOR') return 0;
  return engagements.filter(
    (eng) =>
      eng.team_assignment.supervisor_id === user.id &&
      eng.team_assignment.pic_id !== user.id &&
      eng.status !== 'APPROVED_ACTIVE'
  ).length;
}

function denyAll(): EngagementAccess {
  return {
    canView: false,
    canEditDraft: false,
    canSubmitToManager: false,
    canManagerReview: false,
    canPartnerReview: false,
    canManageFirstExtension: false,
    canManageSecondExtension: false,
    canViewFeeLetter: false,
    accessModeLabel: 'No Access',
  };
}
