import type { AuditSection, StaffMember, UserRole } from '../types/audit';

const STORAGE_ROSTER_KEY = 'meridian_audit_roster_v2';

export function getStoredDepartmentRoster(): StaffMember[] {
  try {
    const saved = localStorage.getItem(STORAGE_ROSTER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => ({
          ...s,
          is_active: s.is_active !== undefined ? s.is_active : true,
        }));
      }
    }
  } catch {
    // Ignore
  }
  return [];
}

export function saveDepartmentRoster(roster: StaffMember[]): void {
  try {
    localStorage.setItem(STORAGE_ROSTER_KEY, JSON.stringify(roster));
  } catch {
    // Ignore
  }
}

export function getStaffById(id: string | null): StaffMember | undefined {
  if (!id) return undefined;
  const roster = getStoredDepartmentRoster();
  return roster.find((s) => s.id === id);
}

export function getSystemAdmin(roster?: StaffMember[]): StaffMember | undefined {
  const r = roster ?? getStoredDepartmentRoster();
  return r.find((s) => s.role === 'SYSTEM_ADMIN' && s.is_active);
}

export function getAuditPartner(roster?: StaffMember[]): StaffMember | undefined {
  const r = roster ?? getStoredDepartmentRoster();
  return r.find((s) => s.role === 'AUDIT_PARTNER' && s.is_active);
}

export function getAuditManager(roster?: StaffMember[]): StaffMember | undefined {
  const r = roster ?? getStoredDepartmentRoster();
  return r.find((s) => s.role === 'AUDIT_MANAGER' && s.is_active);
}

export function getSupervisors(roster?: StaffMember[]): StaffMember[] {
  const r = roster ?? getStoredDepartmentRoster();
  return r.filter((s) => s.role === 'SUPERVISOR' && s.is_active);
}

export function getSupervisorForPic(pic: StaffMember, roster?: StaffMember[]): StaffMember | null {
  if (!pic.supervisorId) return null;
  return getStaffById(pic.supervisorId) ?? null;
}

export const INDUSTRY_OPTIONS = [
  'Manufacturing & trading',
  'Insurance',
  'Banks & financial institutions',
  'Travel agencies/brokers',
  'Commission-based organisations',
  'Construction companies',
  'Other entities',
  'Wholesale & General Trading',
  'Logistics, Freight & Warehousing',
  'Healthcare & Medical Devices',
] as const;

export function createEmpty26Sections(): AuditSection[] {
  return [
    // Planning & Review / Completion (6)
    { section_code: 'P01', category: 'Planning & Review', section_name: 'Audit plan', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'P02', category: 'Planning & Review', section_name: 'Reporting & audit completion', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'P03', category: 'Planning & Review', section_name: 'Review of audit work papers', planned_hours: 0, assigned_role: 'SUPERVISOR' },
    { section_code: 'P04', category: 'Planning & Review', section_name: 'Other administrative matters', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'P05', category: 'Planning & Review', section_name: 'Internal control system', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'P06', category: 'Planning & Review', section_name: 'Compliance test', planned_hours: 0, assigned_role: 'AUDIT_PIC' },

    // Assets (8)
    { section_code: 'A01', category: 'Assets', section_name: 'PPE', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'A02', category: 'Assets', section_name: 'Investments', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'A03', category: 'Assets', section_name: 'Intangible assets', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'A04', category: 'Assets', section_name: 'Investment property', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'A05', category: 'Assets', section_name: 'Inventories', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'A06', category: 'Assets', section_name: 'Receivables', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'A07', category: 'Assets', section_name: 'Cash management', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'A08', category: 'Assets', section_name: "Related parties' & companies' balances (Assets)", planned_hours: 0, assigned_role: 'AUDIT_PIC' },

    // Liabilities (6)
    { section_code: 'L01', category: 'Liabilities', section_name: 'Payables', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'L02', category: 'Liabilities', section_name: 'Provisions', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'L03', category: 'Liabilities', section_name: 'Current & deferred tax liabilities', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'L04', category: 'Liabilities', section_name: 'Bank borrowings', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'L05', category: 'Liabilities', section_name: 'Hire purchase & finance leases', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'L06', category: 'Liabilities', section_name: "Related parties' & companies' balances (Liabilities)", planned_hours: 0, assigned_role: 'AUDIT_PIC' },

    // Equity & Reserves (2)
    { section_code: 'E01', category: 'Equity', section_name: 'Share capital', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'E02', category: 'Equity', section_name: 'Reserves & dividends', planned_hours: 0, assigned_role: 'AUDIT_PIC' },

    // Income Statement (6)
    { section_code: 'I01', category: 'Income Statement', section_name: 'Revenue', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'I02', category: 'Income Statement', section_name: 'Cost of sales', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'I03', category: 'Income Statement', section_name: 'Operating expenses', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'I04', category: 'Income Statement', section_name: 'Other operating income', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'I05', category: 'Income Statement', section_name: 'Payroll expenses', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
    { section_code: 'I06', category: 'Income Statement', section_name: 'Tax expenses', planned_hours: 0, assigned_role: 'AUDIT_PIC' },
  ];
}
