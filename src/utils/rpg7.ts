import type {
  AuditEngagement,
  Rpg7ScaleResult,
  Rpg7Summary,
  Rpg7TierBreakdown,
} from '../types/audit';

export const DEFAULT_CHARGE_OUT_RATE = 45;
export const DEFAULT_CLEARANCE_HOURS = 7.0;
export const HOURS_PER_WORKING_DAY = 7.0;

export const ROLE_CHARGE_RATES = {
  AUDIT_PIC: 45,
  SUPERVISOR: 55,
  AUDIT_MANAGER: 65,
  AUDIT_PARTNER: 75,
} as const;

export function getChargeRateForRole(role: string | null | undefined): number {
  switch (role) {
    case 'AUDIT_PIC':
      return 45;
    case 'SUPERVISOR':
      return 55;
    case 'AUDIT_MANAGER':
      return 65;
    case 'AUDIT_PARTNER':
      return 75;
    default:
      return 45;
  }
}

/**
 * MIA RPG 7 (Revised) — Gross Revenue & Total Assets (Excl. Intangibles) Progressive Scale
 * Reconciled exactly to Excel guideline:
 * - First RM 100,000 @ 1.000% (RM 1,000.00)
 * - Next RM 150,000 (100k - 250k) @ 0.438% (RM 657.00)
 * - Next RM 250,000 (250k - 500k) @ 0.313% (RM 782.50)
 * - Next RM 500,000 (500k - 1.0M) @ 0.188% (RM 940.00)
 * - Next RM 1,500,000 (1.0M - 2.5M) @ 0.125% (RM 1,875.00)
 * - Next RM 2,500,000 (2.5M - 5.0M) @ 0.100% (RM 2,500.00)
 * - Next RM 5,000,000 (5.0M - 10.0M) @ 0.094% (RM 4,700.00; Cumulative RM 12,454.50)
 * - Above RM 10,000,000: Negotiable (Minimum RM 20,000 per assignment)
 */
export function calculateRevenueOrAssetsRpg7(
  amount: number,
  basis: 'Gross Revenue' | 'Total Assets (Excl. Intangibles)'
): Rpg7ScaleResult {
  const safeAmount = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const floorThreshold = 10_000_000;

  if (safeAmount > floorThreshold) {
    return {
      basis,
      inputAmount: safeAmount,
      recommendedFee: 20_000,
      isNegotiableFloor: true,
      floorThreshold,
      breakdown: [
        {
          band: 'Above RM 10,000,000 (Negotiable Floor)',
          amountInBand: safeAmount,
          rateLabel: 'Min Floor',
          fee: 20_000,
        },
      ],
    };
  }

  const tiers: { label: string; cap: number; rate: number }[] = [
    { label: 'First RM 100,000', cap: 100_000, rate: 0.01 },
    { label: 'RM 100,001 – RM 250,000', cap: 150_000, rate: 0.00438 },
    { label: 'RM 250,001 – RM 500,000', cap: 250_000, rate: 0.00313 },
    { label: 'RM 500,001 – RM 1,000,000', cap: 500_000, rate: 0.00188 },
    { label: 'RM 1,000,001 – RM 2,500,000', cap: 1_500_000, rate: 0.00125 },
    { label: 'RM 2,500,001 – RM 5,000,000', cap: 2_500_000, rate: 0.0010 },
    { label: 'RM 5,000,001 – RM 10,000,000', cap: 5_000_000, rate: 0.00094 },
  ];

  let remaining = safeAmount;
  let totalFee = 0;
  const breakdown: Rpg7TierBreakdown[] = [];

  for (const tier of tiers) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, tier.cap);
    const fee = used * tier.rate;
    totalFee += fee;
    breakdown.push({
      band: tier.label,
      amountInBand: used,
      rateLabel: `${(tier.rate * 100).toFixed(3)}%`,
      fee: Math.round(fee * 100) / 100,
    });
    remaining = Math.max(0, remaining - tier.cap);
  }

  return {
    basis,
    inputAmount: safeAmount,
    recommendedFee: Math.round(totalFee),
    isNegotiableFloor: false,
    floorThreshold,
    breakdown,
  };
}

/**
 * MIA RPG 7 (Revised) — Total Operating Expenses Progressive Scale
 * Reconciled exactly to Excel guideline:
 * - First RM 50,000 @ 2.500% (RM 1,250.00)
 * - Next RM 150,000 (50k - 200k) @ 1.250% (RM 1,875.00)
 * - Next RM 800,000 (200k - 1.0M) @ 0.625% (RM 5,000.00)
 * - Next RM 1,000,000 (1.0M - 2.0M) @ 0.250% (RM 2,500.00)
 * - Above RM 2,000,000 @ 0.125%
 */
export function calculateOpExRpg7(amount: number): Rpg7ScaleResult {
  const safeAmount = Math.max(0, Number.isFinite(amount) ? amount : 0);

  const tiers: { label: string; cap: number; rate: number }[] = [
    { label: 'First RM 50,000', cap: 50_000, rate: 0.025 },
    { label: 'RM 50,001 – RM 200,000', cap: 150_000, rate: 0.0125 },
    { label: 'RM 200,001 – RM 1,000,000', cap: 800_000, rate: 0.00625 },
    { label: 'RM 1,000,001 – RM 2,000,000', cap: 1_000_000, rate: 0.0025 },
    { label: 'Above RM 2,000,000', cap: Infinity, rate: 0.00125 },
  ];

  let remaining = safeAmount;
  let totalFee = 0;
  const breakdown: Rpg7TierBreakdown[] = [];

  for (const tier of tiers) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, tier.cap);
    const fee = used * tier.rate;
    totalFee += fee;
    breakdown.push({
      band: tier.label,
      amountInBand: used,
      rateLabel: `${(tier.rate * 100).toFixed(3)}%`,
      fee: Math.round(fee * 100) / 100,
    });
    remaining = Math.max(0, remaining - tier.cap);
  }

  return {
    basis: 'Total Operating Expenses',
    inputAmount: safeAmount,
    recommendedFee: Math.round(totalFee),
    isNegotiableFloor: false,
    floorThreshold: 2_000_000,
    breakdown,
  };
}

export function calculateRpg7Summary(
  revenueAmount: number,
  assetsAmount: number,
  expensesAmount: number,
  pyAuditFee: number
): Rpg7Summary {
  const revenue = calculateRevenueOrAssetsRpg7(revenueAmount, 'Gross Revenue');
  const assets = calculateRevenueOrAssetsRpg7(assetsAmount, 'Total Assets (Excl. Intangibles)');
  const expenses = calculateOpExRpg7(expensesAmount);

  const scales = [revenue, assets, expenses];
  const highestBenchmark = scales.reduce((best, curr) =>
    curr.recommendedFee > best.recommendedFee ? curr : best
  );

  const shortfallVsPy = Math.max(0, highestBenchmark.recommendedFee - pyAuditFee);
  const recoveryPercent =
    highestBenchmark.recommendedFee > 0
      ? (pyAuditFee / highestBenchmark.recommendedFee) * 100
      : 0;

  return {
    revenue,
    expenses,
    assets,
    highestBenchmark,
    shortfallVsPy,
    recoveryPercent,
  };
}

/**
 * Allowed Hours Formula: (Fee Pool * 70%) / Charge-Out Rate (RM 45/hr)
 */
export function calculateAllowedHours(
  pyAuditFee: number,
  pyTaxFee = 0,
  includeTaxInPool = false,
  chargeOutRate = DEFAULT_CHARGE_OUT_RATE
): number {
  const baseAudit = Math.max(0, Number.isFinite(pyAuditFee) ? pyAuditFee : 0);
  const tax = includeTaxInPool ? Math.max(0, Number.isFinite(pyTaxFee) ? pyTaxFee : 0) : 0;
  const pool = baseAudit + tax;

  if (pool <= 0 || chargeOutRate <= 0) {
    return 0;
  }
  const raw = (pool * 0.7) / chargeOutRate;
  return Math.round(raw * 10) / 10;
}

export function calculateRecommendedDays(
  allowedHours: number,
  clearanceHours = DEFAULT_CLEARANCE_HOURS
): number {
  const netFieldwork = Math.max(0, allowedHours - clearanceHours);
  return Math.round((netFieldwork / HOURS_PER_WORKING_DAY) * 10) / 10;
}

export function calculateWorkingDaysBetween(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 0;
  }
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function calculateYoYPercent(cy: number, py: number): number | null {
  if (!Number.isFinite(py) || py <= 0) {
    return cy > 0 ? 100 : null;
  }
  return ((cy - py) / py) * 100;
}

export function formatRM(amount: number | null | undefined, showDecimals = false): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return 'RM 0';
  }
  return `RM ${amount.toLocaleString('en-MY', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })}`;
}

export function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return '0.0 hrs';
  return `${hours.toFixed(1)} hrs`;
}

export function formatPercent(val: number | null, signed = true): string {
  if (val === null || !Number.isFinite(val)) return '—';
  const sign = signed && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
}

export function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getRangePositionLabel(
  rpg7Fee: number,
  minFee: number,
  maxFee: number
): 'Below Range' | 'Within Range' | 'Above Range' {
  if (rpg7Fee < minFee) return 'Below Range';
  if (rpg7Fee > maxFee) return 'Above Range';
  return 'Within Range';
}

export function getStatusLabel(status: AuditEngagement['status']): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'PENDING_MANAGER':
      return 'Pending Manager';
    case 'PENDING_PARTNER':
      return 'Pending Partner';
    case 'APPROVED_ACTIVE':
      return 'Approved & Active';
  }
}
