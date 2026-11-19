import type { AuditSection, StaffMember } from '../types/audit';

/**
 * 21-Person Audit Department Roster (Strictly excludes Admin personnel)
 * - 1 Audit Partner
 * - 1 Audit Manager
 * - 4 Supervisors (Dual-Role)
 * - 15 Audit PICs (assigned across the 4 Supervisors)
 */
export const DEPARTMENT_ROSTER: StaffMember[] = [
  // 1 Audit Partner
  {
    id: 'partner-1',
    name: "Dato' Lim Wei Ming",
    title: 'Managing Audit Partner',
    role: 'AUDIT_PARTNER',
    supervisorId: null,
    email: 'lim.wm@meridianaudit.my',
  },
  // 1 Audit Manager
  {
    id: 'manager-1',
    name: 'Tan Mei Ling',
    title: 'Audit Manager',
    role: 'AUDIT_MANAGER',
    supervisorId: null,
    email: 'tan.ml@meridianaudit.my',
  },
  // 4 Supervisors
  {
    id: 'sup-1',
    name: 'Sarah Tan',
    title: 'Audit Supervisor 1',
    role: 'SUPERVISOR',
    supervisorId: null,
    email: 'sarah.tan@meridianaudit.my',
  },
  {
    id: 'sup-2',
    name: 'Hafiz Rahman',
    title: 'Audit Supervisor 2',
    role: 'SUPERVISOR',
    supervisorId: null,
    email: 'hafiz.r@meridianaudit.my',
  },
  {
    id: 'sup-3',
    name: 'Priya Nair',
    title: 'Audit Supervisor 3',
    role: 'SUPERVISOR',
    supervisorId: null,
    email: 'priya.n@meridianaudit.my',
  },
  {
    id: 'sup-4',
    name: 'Desmond Chong',
    title: 'Audit Supervisor 4',
    role: 'SUPERVISOR',
    supervisorId: null,
    email: 'desmond.c@meridianaudit.my',
  },
  // 15 Audit PICs (Team Members)
  // Team 1 — Sarah Tan (4 PICs)
  {
    id: 'pic-1',
    name: 'Ahmad Firdaus',
    title: 'Audit PIC 1',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-1',
    email: 'ahmad.f@meridianaudit.my',
  },
  {
    id: 'pic-2',
    name: 'Nurul Aina',
    title: 'Audit PIC 2',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-1',
    email: 'nurul.a@meridianaudit.my',
  },
  {
    id: 'pic-3',
    name: 'Jason Koh',
    title: 'Audit PIC 3',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-1',
    email: 'jason.k@meridianaudit.my',
  },
  {
    id: 'pic-4',
    name: 'Chong Mei Yee',
    title: 'Audit PIC 4',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-1',
    email: 'meiyee.c@meridianaudit.my',
  },
  // Team 2 — Hafiz Rahman (4 PICs)
  {
    id: 'pic-5',
    name: 'Daniel Ong',
    title: 'Audit PIC 5',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-2',
    email: 'daniel.o@meridianaudit.my',
  },
  {
    id: 'pic-6',
    name: 'Siti Hajar',
    title: 'Audit PIC 6',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-2',
    email: 'siti.h@meridianaudit.my',
  },
  {
    id: 'pic-7',
    name: 'Kelvin Lau',
    title: 'Audit PIC 7',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-2',
    email: 'kelvin.l@meridianaudit.my',
  },
  {
    id: 'pic-8',
    name: 'Farah Nadia',
    title: 'Audit PIC 8',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-2',
    email: 'farah.n@meridianaudit.my',
  },
  // Team 3 — Priya Nair (4 PICs)
  {
    id: 'pic-9',
    name: 'Kavitha Devi',
    title: 'Audit PIC 9',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-3',
    email: 'kavitha.d@meridianaudit.my',
  },
  {
    id: 'pic-10',
    name: 'Marcus Yeoh',
    title: 'Audit PIC 10',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-3',
    email: 'marcus.y@meridianaudit.my',
  },
  {
    id: 'pic-11',
    name: 'Aisyah Zainal',
    title: 'Audit PIC 11',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-3',
    email: 'aisyah.z@meridianaudit.my',
  },
  {
    id: 'pic-12',
    name: 'Vincent Lee',
    title: 'Audit PIC 12',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-3',
    email: 'vincent.l@meridianaudit.my',
  },
  // Team 4 — Desmond Chong (3 PICs)
  {
    id: 'pic-13',
    name: 'Rachel Wong',
    title: 'Audit PIC 13',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-4',
    email: 'rachel.w@meridianaudit.my',
  },
  {
    id: 'pic-14',
    name: 'Irfan Hakim',
    title: 'Audit PIC 14',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-4',
    email: 'irfan.h@meridianaudit.my',
  },
  {
    id: 'pic-15',
    name: 'Chloe Lim',
    title: 'Audit PIC 15',
    role: 'AUDIT_PIC',
    supervisorId: 'sup-4',
    email: 'chloe.l@meridianaudit.my',
  },
];

export const AUDIT_PARTNER = DEPARTMENT_ROSTER.find((u) => u.role === 'AUDIT_PARTNER')!;
export const AUDIT_MANAGER = DEPARTMENT_ROSTER.find((u) => u.role === 'AUDIT_MANAGER')!;

export function getStaffById(id: string | null): StaffMember | undefined {
  if (!id) return undefined;
  return DEPARTMENT_ROSTER.find((s) => s.id === id);
}

export function getSupervisorForPic(pic: StaffMember): StaffMember | null {
  if (!pic.supervisorId) return null;
  return getStaffById(pic.supervisorId) ?? null;
}

export const INDUSTRY_OPTIONS = [
  'Wholesale & General Trading',
  'Precision Manufacturing & Engineering',
  'Logistics, Freight & Warehousing',
  'Healthcare & Medical Devices',
  'Construction & Property Development',
  'Food & Beverage Distribution',
  'Information Technology & SaaS',
  'Professional & Business Services',
  'Retail & Consumer Goods',
  'Investment Holding',
] as const;

/**
 * 26 Standardized Audit Fieldwork Sections:
 * - Planning & Review (4)
 * - Assets (8)
 * - Liabilities (6)
 * - Equity (2)
 * - Income Statement (6)
 * Total = 26 sections
 */
export function createEmpty26Sections(): AuditSection[] {
  return [
    // Planning & Review (4)
    { section_code: 'P01', category: 'Planning & Review', section_name: 'Audit Planning, Materiality & Risk Assessment', planned_hours: 0 },
    { section_code: 'P02', category: 'Planning & Review', section_name: 'Internal Control Walkthrough & Testing', planned_hours: 0 },
    { section_code: 'P03', category: 'Planning & Review', section_name: 'Subsequent Events, Going Concern & Contingencies', planned_hours: 0 },
    { section_code: 'P04', category: 'Planning & Review', section_name: 'Partner / Manager Clearance & File Completion', planned_hours: 7.0 },

    // Assets (8)
    { section_code: 'A01', category: 'Assets', section_name: 'Property, Plant & Equipment (PPE)', planned_hours: 0 },
    { section_code: 'A02', category: 'Assets', section_name: 'Right-of-Use Assets & Investment Properties', planned_hours: 0 },
    { section_code: 'A03', category: 'Assets', section_name: 'Inventories & Stock Count Observation', planned_hours: 0 },
    { section_code: 'A04', category: 'Assets', section_name: 'Trade Receivables & ECL Impairment', planned_hours: 0 },
    { section_code: 'A05', category: 'Assets', section_name: 'Other Receivables, Deposits & Prepayments', planned_hours: 0 },
    { section_code: 'A06', category: 'Assets', section_name: 'Amount Owing by Related Parties & Directors', planned_hours: 0 },
    { section_code: 'A07', category: 'Assets', section_name: 'Fixed Deposits & Short-Term Investments', planned_hours: 0 },
    { section_code: 'A08', category: 'Assets', section_name: 'Cash & Bank Balances Reconciliation', planned_hours: 0 },

    // Liabilities (6)
    { section_code: 'L01', category: 'Liabilities', section_name: 'Trade Payables & Unrecorded Liabilities', planned_hours: 0 },
    { section_code: 'L02', category: 'Liabilities', section_name: 'Other Payables, Accruals & Provisions', planned_hours: 0 },
    { section_code: 'L03', category: 'Liabilities', section_name: 'Bank Borrowings & Term Loans', planned_hours: 0 },
    { section_code: 'L04', category: 'Liabilities', section_name: 'Hire Purchase & Lease Liabilities', planned_hours: 0 },
    { section_code: 'L05', category: 'Liabilities', section_name: 'Amount Owing to Directors & Related Companies', planned_hours: 0 },
    { section_code: 'L06', category: 'Liabilities', section_name: 'Current Taxation & Deferred Tax', planned_hours: 0 },

    // Equity (2)
    { section_code: 'E01', category: 'Equity', section_name: 'Share Capital & Statutory Reserves', planned_hours: 0 },
    { section_code: 'E02', category: 'Equity', section_name: 'Retained Earnings & Dividend Distributions', planned_hours: 0 },

    // Income Statement (6)
    { section_code: 'I01', category: 'Income Statement', section_name: 'Revenue Recognition & Cut-Off Testing', planned_hours: 0 },
    { section_code: 'I02', category: 'Income Statement', section_name: 'Cost of Sales & Purchases Vouching', planned_hours: 0 },
    { section_code: 'I03', category: 'Income Statement', section_name: 'Payroll, EPF/SOCSO & Staff Costs', planned_hours: 0 },
    { section_code: 'I04', category: 'Income Statement', section_name: 'Operating & Administrative Expenses', planned_hours: 0 },
    { section_code: 'I05', category: 'Income Statement', section_name: 'Finance Costs & Other Operating Income', planned_hours: 0 },
    { section_code: 'I06', category: 'Income Statement', section_name: 'Statutory Disclosures & Financial Statements Review', planned_hours: 0 },
  ];
}
