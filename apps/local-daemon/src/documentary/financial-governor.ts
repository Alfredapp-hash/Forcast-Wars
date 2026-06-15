import type { ArkheEvent } from "@arkhe/contracts";

export interface MonthlyFinancialSnapshot {
  month: string; // YYYY-MM
  recurringRevenueUsd: number;
  totalOperatingCostUsd: number;
  reserveUsd: number;
  /** Recurring Revenue / Total Operating Cost */
  revenueCostRatio: number;
  /** True when RR >= 1.25 × TOC for this month */
  sustainable: boolean;
}

export interface SustainabilityScore {
  /** 0–100 readiness for autonomous publishing */
  readinessScore: number;
  consecutiveSustainableMonths: number;
  requiredConsecutiveMonths: number;
  reserveMonthsCovered: number;
  requiredReserveMonths: number;
  autonomousPublishReady: boolean;
  publicDashboardReady: boolean;
  genesisChromosomeReady: boolean;
  summary: string;
}

const REQUIRED_CONSECUTIVE_MONTHS = 3;
const REVENUE_COST_MULTIPLIER = 1.25;
const REQUIRED_RESERVE_MONTHS = 6;

export class FinancialGovernor {
  private monthlySnapshots = new Map<string, MonthlyFinancialSnapshot>();
  private reserveUsd = 0;

  /** Ingest cost events from the canonical event bus. */
  ingest(event: ArkheEvent): void {
    const costUsd = event.cost?.costUsd;
    if (costUsd && costUsd > 0) {
      const month = event.ts.slice(0, 7);
      const snap = this.getOrCreateMonth(month);
      snap.totalOperatingCostUsd += costUsd;
      this.recomputeMonth(snap);
    }
  }

  recordRevenue(month: string, recurringRevenueUsd: number): void {
    const snap = this.getOrCreateMonth(month);
    snap.recurringRevenueUsd = recurringRevenueUsd;
    this.recomputeMonth(snap);
  }

  setReserve(reserveUsd: number): void {
    this.reserveUsd = Math.max(0, reserveUsd);
  }

  getSnapshot(month?: string): MonthlyFinancialSnapshot {
    const key = month ?? new Date().toISOString().slice(0, 7);
    return this.getOrCreateMonth(key);
  }

  computeSustainability(): SustainabilityScore {
    const sortedMonths = [...this.monthlySnapshots.keys()].sort();
    let consecutive = 0;
    for (let i = sortedMonths.length - 1; i >= 0; i--) {
      const snap = this.monthlySnapshots.get(sortedMonths[i]!)!;
      if (snap.sustainable) {
        consecutive++;
      } else {
        break;
      }
    }

    const latest = sortedMonths.length
      ? this.monthlySnapshots.get(sortedMonths[sortedMonths.length - 1]!)!
      : this.getOrCreateMonth(new Date().toISOString().slice(0, 7));

    const avgMonthlyCost =
      sortedMonths.length > 0
        ? [...this.monthlySnapshots.values()].reduce((s, m) => s + m.totalOperatingCostUsd, 0) /
          sortedMonths.length
        : latest.totalOperatingCostUsd || 1;

    const reserveMonthsCovered = avgMonthlyCost > 0 ? this.reserveUsd / avgMonthlyCost : 0;

    const monthProgress = Math.min(1, consecutive / REQUIRED_CONSECUTIVE_MONTHS);
    const reserveProgress = Math.min(1, reserveMonthsCovered / REQUIRED_RESERVE_MONTHS);
    const ratioProgress = Math.min(
      1,
      latest.revenueCostRatio / REVENUE_COST_MULTIPLIER
    );
    const readinessScore = Math.round(
      (monthProgress * 0.45 + reserveProgress * 0.35 + ratioProgress * 0.2) * 100
    );

    const autonomousPublishReady =
      consecutive >= REQUIRED_CONSECUTIVE_MONTHS &&
      reserveMonthsCovered >= REQUIRED_RESERVE_MONTHS &&
      latest.revenueCostRatio >= REVENUE_COST_MULTIPLIER;

    return {
      readinessScore,
      consecutiveSustainableMonths: consecutive,
      requiredConsecutiveMonths: REQUIRED_CONSECUTIVE_MONTHS,
      reserveMonthsCovered: Math.round(reserveMonthsCovered * 10) / 10,
      requiredReserveMonths: REQUIRED_RESERVE_MONTHS,
      autonomousPublishReady,
      publicDashboardReady: consecutive >= 1,
      genesisChromosomeReady: autonomousPublishReady,
      summary: autonomousPublishReady
        ? "Financial sustainability gate passed — autonomous publish eligible"
        : `${consecutive}/${REQUIRED_CONSECUTIVE_MONTHS} sustainable months; reserve covers ${reserveMonthsCovered.toFixed(1)}/${REQUIRED_RESERVE_MONTHS} months`,
    };
  }

  private getOrCreateMonth(month: string): MonthlyFinancialSnapshot {
    const existing = this.monthlySnapshots.get(month);
    if (existing) return existing;

    const snap: MonthlyFinancialSnapshot = {
      month,
      recurringRevenueUsd: 0,
      totalOperatingCostUsd: 0,
      reserveUsd: this.reserveUsd,
      revenueCostRatio: 0,
      sustainable: false,
    };
    this.monthlySnapshots.set(month, snap);
    return snap;
  }

  private recomputeMonth(snap: MonthlyFinancialSnapshot): void {
    snap.reserveUsd = this.reserveUsd;
    const cost = snap.totalOperatingCostUsd;
    snap.revenueCostRatio = cost > 0 ? snap.recurringRevenueUsd / cost : 0;
    snap.sustainable = snap.recurringRevenueUsd >= REVENUE_COST_MULTIPLIER * cost && cost > 0;
  }
}
