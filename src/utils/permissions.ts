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
 * Enforces the Department RBAC matrix and "My Related Jobs" query rule:
 * - Audit Manager & Audit Partner: See all engagements across the department.
 * - Audit PICs & Supervisors: See ONLY engagements where:
 *   1. logged_in_email == assigned_pic_email (all statuses: Draft, Pending, Approved)
 *   2. OR status === "APPROVED_ACTIVE" AND (logged_in_email == team_supervisor_email OR logged_in_email == reviewer_email).
 */
export function evaluateEngagementAccess(
  user: StaffMember,
  engagement: AuditEngagement
): EngagementAccess {
  const userEmail = user.email.toLowerCase();
  const picEmail = engagement.team_assignment.pic_email?.toLowerCase() ?? '';
  const supEmail = engagement.team_assignment.supervisor_email?.toLowerCase() ?? '';
  const reviewerEmail = engagement.team_assignment.reviewer_email?.toLowerCase() ?? '';

  const isOwnerPic = picEmail === userEmail || engagement.team_assignment.pic_id === user.id;
  const isAssignedSupervisor = supEmail === userEmail;
  const isAssignedReviewer = reviewerEmail === userEmail;
  const isApproved = engagement.status === 'APPROVED_ACTIVE';
  const status = engagement.status;

  if (user.role === 'AUDIT_MANAGER') {
    const canReview = status === 'PENDING_MANAGER';
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

  if (user.role === 'AUDIT_PARTNER') {
    const canReview = status === 'PENDING_PARTNER';
    return {
      canView: status === 'PENDING_PARTNER' || isApproved,
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

  // AUDIT_PIC or SUPERVISOR
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
      accessModeLabel: isDraft ? 'PIC Draft Editor' : 'PIC Read-Only',
    };
  }

  // If assigned as Team Supervisor or Reviewer, only viewable when APPROVED_ACTIVE
  if ((isAssignedSupervisor || isAssignedReviewer) && isApproved) {
    return {
      canView: true,
      canEditDraft: false,
      canSubmitToManager: false,
      canManagerReview: false,
      canPartnerReview: false,
      canManageFirstExtension: false,
      canManageSecondExtension: false,
      canViewFeeLetter: true,
      accessModeLabel: isAssignedSupervisor ? 'Supervisor Read-Only Viewer' : 'Reviewer Read-Only Viewer',
    };
  }

  return denyAll();
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

export function countLockedSupervisorJobs(
  user: StaffMember,
  engagements: AuditEngagement[]
): number {
  if (user.role !== 'SUPERVISOR') return 0;
  const userEmail = user.email.toLowerCase();
  return engagements.filter(
    (eng) =>
      (eng.team_assignment.supervisor_email?.toLowerCase() === userEmail ||
        eng.team_assignment.reviewer_email?.toLowerCase() === userEmail) &&
      eng.team_assignment.pic_email?.toLowerCase() !== userEmail &&
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
