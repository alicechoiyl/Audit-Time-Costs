import type {
  AuditEngagement,
  Rpg7ScaleResult,
  Rpg7Summary,
  Rpg7TierBreakdown,
} from '../types/audit';

export const DEFAULT_CHARGE_OUT_RATE = 45;
export const DEFAULT_CLEARANCE_HOURS = 7.0;
export const HOURS_PER_WORKING_DAY = 7.0;

/**
 * MIA RPG 7 (Revised) — Gross Revenue & Total Operating Expenses Progressive Scale
 * First RM 100,000: RM 1,500
 * Next RM 150,000 (100k - 250k): 0.550%
 * Next RM 250,000 (250k - 500k): 0.360%
 * Next RM 500,000 (500k - 1.0M): 0.260%
 * Next RM 1,500,000 (1.0M - 2.5M): 0.175%
 * Next RM 2,500,000 (2.5M - 5.0M): 0.130%
 * Next RM 5,000,000 (5.0M - 10.0M): 0.095% (Cumulative at RM 10M = RM 12,455)
 * Above RM 10,000,000: Negotiable with mandatory minimum floor of RM 20,000
 */
export function calculateRevenueOrOpExRpg7(
  amount: number,
  basis: 'Gross Revenue' | 'Total Operating Expenses'
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

  const tiers: { label: string; cap: number; rate: number | null; fixedFee?: number }[] = [
    { label: 'First RM 100,000', cap: 100_000, rate: null, fixedFee: 1_500 },
    { label: 'RM 100,001 – RM 250,000', cap: 150_000, rate: 0.0055 },
    { label: 'RM 250,001 – RM 500,000', cap: 250_000, rate: 0.0036 },
    { label: 'RM 500,001 – RM 1,000,000', cap: 500_000, rate: 0.0026 },
    { label: 'RM 1,000,001 – RM 2,500,000', cap: 1_500_000, rate: 0.00175 },
    { label: 'RM 2,500,001 – RM 5,000,000', cap: 2_500_000, rate: 0.0013 },
    { label: 'RM 5,000,001 – RM 10,000,000', cap: 5_000_000, rate: 0.00095 },
  ];

  let remaining = safeAmount;
  let totalFee = 0;
  const breakdown: Rpg7TierBreakdown[] = [];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (i === 0) {
      const used = Math.min(remaining, tier.cap);
      const fee = safeAmount > 0 ? tier.fixedFee ?? 1_500 : 0;
      totalFee += fee;
      breakdown.push({
        band: tier.label,
        amountInBand: used,
        rateLabel: 'Base RM 1,500',
        fee,
      });
      remaining = Math.max(0, remaining - tier.cap);
      continue;
    }

    if (remaining <= 0) break;
    const used = Math.min(remaining, tier.cap);
    const fee = used * (tier.rate ?? 0);
    totalFee += fee;
    breakdown.push({
      band: tier.label,
      amountInBand: used,
      rateLabel: `${((tier.rate ?? 0) * 100).toFixed(3)}%`,
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
 * MIA RPG 7 (Revised) — Total Assets (Excluding Intangibles) Progressive Scale
 * First RM 150,000: RM 1,500
 * Next RM 225,000 (150k - 375k): 0.365%
 * Next RM 375,000 (375k - 750k): 0.240%
 * Next RM 750,000 (750k - 1.5M): 0.175%
 * Next RM 2,250,000 (1.5M - 3.75M): 0.115%
 * Next RM 3,750,000 (3.75M - 7.5M): 0.085%
 * Next RM 7,500,000 (7.5M - 15.0M): 0.065%
 * Above RM 15,000,000: Negotiable (min RM 20,000)
 */
export function calculateAssetsRpg7(amount: number): Rpg7ScaleResult {
  const safeAmount = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const floorThreshold = 15_000_000;

  if (safeAmount > floorThreshold) {
    return {
      basis: 'Total Assets (Excl. Intangibles)',
      inputAmount: safeAmount,
      recommendedFee: 20_000,
      isNegotiableFloor: true,
      floorThreshold,
      breakdown: [
        {
          band: 'Above RM 15,000,000 (Negotiable Floor)',
          amountInBand: safeAmount,
          rateLabel: 'Min Floor',
          fee: 20_000,
        },
      ],
    };
  }

  const tiers: { label: string; cap: number; rate: number | null; fixedFee?: number }[] = [
    { label: 'First RM 150,000', cap: 150_000, rate: null, fixedFee: 1_500 },
    { label: 'RM 150,001 – RM 375,000', cap: 225_000, rate: 0.00365 },
    { label: 'RM 375,001 – RM 750,000', cap: 375_000, rate: 0.0024 },
    { label: 'RM 750,001 – RM 1,500,000', cap: 750_000, rate: 0.00175 },
    { label: 'RM 1,500,001 – RM 3,750,000', cap: 2_250_000, rate: 0.00115 },
    { label: 'RM 3,750,001 – RM 7,500,000', cap: 3_750_000, rate: 0.00085 },
    { label: 'RM 7,500,001 – RM 15,000,000', cap: 7_500_000, rate: 0.00065 },
  ];

  let remaining = safeAmount;
  let totalFee = 0;
  const breakdown: Rpg7TierBreakdown[] = [];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (i === 0) {
      const used = Math.min(remaining, tier.cap);
      const fee = safeAmount > 0 ? tier.fixedFee ?? 1_500 : 0;
      totalFee += fee;
      breakdown.push({
        band: tier.label,
        amountInBand: used,
        rateLabel: 'Base RM 1,500',
        fee,
      });
      remaining = Math.max(0, remaining - tier.cap);
      continue;
    }

    if (remaining <= 0) break;
    const used = Math.min(remaining, tier.cap);
    const fee = used * (tier.rate ?? 0);
    totalFee += fee;
    breakdown.push({
      band: tier.label,
      amountInBand: used,
      rateLabel: `${((tier.rate ?? 0) * 100).toFixed(3)}%`,
      fee: Math.round(fee * 100) / 100,
    });
    remaining = Math.max(0, remaining - tier.cap);
  }

  return {
    basis: 'Total Assets (Excl. Intangibles)',
    inputAmount: safeAmount,
    recommendedFee: Math.round(totalFee),
    isNegotiableFloor: false,
    floorThreshold,
    breakdown,
  };
}

export function calculateRpg7Summary(
  revenueAmount: number,
  assetsAmount: number,
  expensesAmount: number,
  pyAuditFee: number
): Rpg7Summary {
  const revenue = calculateRevenueOrOpExRpg7(revenueAmount, 'Gross Revenue');
  const expenses = calculateRevenueOrOpExRpg7(expensesAmount, 'Total Operating Expenses');
  const assets = calculateAssetsRpg7(assetsAmount);

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
 * Allowed Hours Formula: (PY Audit Fee * 70%) / Charge-Out Rate (RM 45/hr)
 * Rounded to 1 decimal place.
 */
export function calculateAllowedHours(
  pyAuditFee: number,
  chargeOutRate = DEFAULT_CHARGE_OUT_RATE
): number {
  if (!Number.isFinite(pyAuditFee) || pyAuditFee <= 0 || chargeOutRate <= 0) {
    return 0;
  }
  const raw = (pyAuditFee * 0.7) / chargeOutRate;
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
