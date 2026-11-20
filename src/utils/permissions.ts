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

export function evaluateEngagementAccess(
  user: StaffMember,
  engagement: AuditEngagement
): EngagementAccess {
  const userId = user.id;
  const userEmail = user.email.toLowerCase();
  const status = engagement.status;
  const isApproved = status === 'APPROVED_ACTIVE';

  const ta = engagement.team_assignment;
  const selectedPics = ta.selected_pic_ids ?? (ta.pic_id ? [ta.pic_id] : []);
  const selectedSupervisors = ta.selected_supervisor_ids ?? (ta.supervisor_id ? [ta.supervisor_id] : []);

  const isSelectedPic =
    selectedPics.includes(userId) ||
    (ta.pic_email && ta.pic_email.toLowerCase() === userEmail);
  const isSelectedSupervisor =
    selectedSupervisors.includes(userId) ||
    (ta.supervisor_email && ta.supervisor_email.toLowerCase() === userEmail);

  if (user.role === 'SYSTEM_ADMIN') {
    return {
      canView: true,
      canEditDraft: status === 'DRAFT',
      canSubmitToManager: status === 'DRAFT',
      canManagerReview: status === 'PENDING_MANAGER',
      canPartnerReview: status === 'PENDING_PARTNER',
      canManageFirstExtension: isApproved,
      canManageSecondExtension: isApproved,
      canViewFeeLetter: isApproved,
      accessModeLabel: 'System Admin Oversight',
    };
  }

  if (user.role === 'AUDIT_MANAGER') {
    const canReview = status === 'PENDING_MANAGER';
    const canView = status === 'PENDING_MANAGER' || status === 'PENDING_PARTNER' || isApproved;
    return {
      canView,
      canEditDraft: false,
      canSubmitToManager: false,
      canManagerReview: canReview,
      canPartnerReview: false,
      canManageFirstExtension: isApproved,
      canManageSecondExtension: false,
      canViewFeeLetter: isApproved,
      accessModeLabel: canReview ? '1st-Level Manager Review' : 'Manager Auto-Included View',
    };
  }

  if (user.role === 'AUDIT_PARTNER') {
    const canReview = status === 'PENDING_PARTNER';
    const canView = status === 'PENDING_PARTNER' || isApproved;
    return {
      canView,
      canEditDraft: false,
      canSubmitToManager: false,
      canManagerReview: false,
      canPartnerReview: canReview,
      canManageFirstExtension: false,
      canManageSecondExtension: isApproved,
      canViewFeeLetter: isApproved,
      accessModeLabel: canReview ? '2nd-Level Partner Pricing Desk' : 'Partner Auto-Included View',
    };
  }

  // AUDIT_PIC
  if (user.role === 'AUDIT_PIC') {
    if (isSelectedPic) {
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
    return denyAll();
  }

  // SUPERVISOR
  if (user.role === 'SUPERVISOR') {
    // If acting as a PIC on the job
    if (isSelectedPic) {
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
        accessModeLabel: isDraft ? 'Supervisor (PIC) Draft Editor' : 'Supervisor (PIC) Read-Only',
      };
    }
    // If assigned as Team Supervisor
    if (isSelectedSupervisor && isApproved) {
      return {
        canView: true,
        canEditDraft: false,
        canSubmitToManager: false,
        canManagerReview: false,
        canPartnerReview: false,
        canManageFirstExtension: false,
        canManageSecondExtension: false,
        canViewFeeLetter: true,
        accessModeLabel: 'Supervisor Read-Only Viewer',
      };
    }
    return denyAll();
  }

  return denyAll();
}

export function canUserCreateEngagement(user: StaffMember): boolean {
  return user.role === 'AUDIT_PIC' || user.role === 'SUPERVISOR' || user.role === 'SYSTEM_ADMIN';
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
  const userId = user.id;
  const userEmail = user.email.toLowerCase();
  return engagements.filter((eng) => {
    const ta = eng.team_assignment;
    const supIds = ta.selected_supervisor_ids ?? (ta.supervisor_id ? [ta.supervisor_id] : []);
    const picIds = ta.selected_pic_ids ?? (ta.pic_id ? [ta.pic_id] : []);
    const isSup = supIds.includes(userId) || (ta.supervisor_email?.toLowerCase() === userEmail);
    const isPic = picIds.includes(userId) || (ta.pic_email?.toLowerCase() === userEmail);
    return isSup && !isPic && eng.status !== 'APPROVED_ACTIVE';
  }).length;
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
