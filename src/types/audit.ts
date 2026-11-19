export type UserRole = 'AUDIT_PIC' | 'SUPERVISOR' | 'AUDIT_MANAGER' | 'AUDIT_PARTNER';

export interface StaffMember {
  id: string;
  name: string;
  title: string;
  role: UserRole;
  supervisorId: string | null;
  email: string;
}

export type EngagementStatus =
  | 'DRAFT'
  | 'PENDING_MANAGER'
  | 'PENDING_PARTNER'
  | 'APPROVED_ACTIVE';

export type QuotationType = 'NONE' | 'FIXED' | 'GENERAL_RANGE';

export type SectionCategory =
  | 'Planning & Review'
  | 'Assets'
  | 'Liabilities'
  | 'Equity'
  | 'Income Statement';

export interface AuditSection {
  section_code: string;
  category: SectionCategory;
  section_name: string;
  planned_hours: number;
}

export interface EngagementNotification {
  id: string;
  engagement_id: string;
  client_name: string;
  timestamp: string;
  trigger_event:
    | 'SUBMITTED_TO_MANAGER'
    | 'RETURNED_BY_MANAGER'
    | 'APPROVED_BY_MANAGER'
    | 'RETURNED_BY_PARTNER'
    | 'APPROVED_BY_PARTNER'
    | 'EXTENSION_UPDATED';
  recipient_ids: string[];
  recipient_labels: string[];
  title: string;
  message: string;
  details: { label: string; value: string }[];
  read_by: string[];
}

export interface AuditEngagement {
  engagement_id: string;
  status: EngagementStatus;
  created_at: string;
  updated_at: string;
  client_info: {
    client_name: string;
    registration_no: string;
    fye_date: string;
    industry: string;
  };
  team_assignment: {
    pic_id: string;
    pic_name: string;
    pic_role: 'AUDIT_PIC' | 'SUPERVISOR';
    supervisor_id: string | null;
    supervisor_name: string | null;
    manager_id: string;
    manager_name: string;
    partner_id: string;
    partner_name: string;
  };
  financials: {
    cy_revenue: number;
    py_revenue: number;
    cy_assets: number;
    py_assets: number;
    cy_expenses: number;
    py_expenses: number;
  };
  prior_fees: {
    py_audit_fee: number;
    tax_handled_by_firm: boolean;
    py_tax_fee: number;
  };
  quotation: {
    quotation_issued: boolean;
    quotation_type: QuotationType;
    quotation_ref: string;
    quotation_date: string;
    tax_included: boolean;
    fixed_audit_fee: number;
    fixed_tax_fee: number;
    range_audit_min: number;
    range_audit_max: number;
    range_tax_min: number;
    range_tax_max: number;
  };
  schedule: {
    commencement_date: string;
    target_completion_date: string;
    milestones: {
      complete_fieldwork: string;
      senior_review: string;
      supervisor_review: string;
      partner_review: string;
      send_out_draft: string;
    };
    first_extension_date: string;
    first_extension_reason: string;
    second_extension_date: string;
    second_extension_reason: string;
  };
  time_budget: {
    charge_out_rate: number;
    clearance_hours: number;
    allowed_hours_cap: number;
    total_planned_hours: number;
    sections: AuditSection[];
  };
  approvals: {
    manager_approved: boolean;
    manager_approved_at: string;
    manager_notes: string;
    partner_approved: boolean;
    partner_approved_at: string;
    decided_cy_audit_fee: number | null;
    decided_ny_audit_fee: number | null;
    fee_variance_reason: string;
    last_return_note: string;
    last_returned_by: string;
  };
}

export interface Rpg7TierBreakdown {
  band: string;
  amountInBand: number;
  rateLabel: string;
  fee: number;
}

export interface Rpg7ScaleResult {
  basis: 'Gross Revenue' | 'Total Operating Expenses' | 'Total Assets (Excl. Intangibles)';
  inputAmount: number;
  recommendedFee: number;
  isNegotiableFloor: boolean;
  floorThreshold: number;
  breakdown: Rpg7TierBreakdown[];
}

export interface Rpg7Summary {
  revenue: Rpg7ScaleResult;
  expenses: Rpg7ScaleResult;
  assets: Rpg7ScaleResult;
  highestBenchmark: Rpg7ScaleResult;
  shortfallVsPy: number;
  recoveryPercent: number;
}
