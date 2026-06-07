export interface RuntimeSettings {
  defaultBudgetUsd: number;
  paidCloudEnabled: boolean;
  maxMissionBudgetUsd: number;
}

let settings: RuntimeSettings = {
  defaultBudgetUsd: Number(process.env.ARKHE_DEFAULT_BUDGET_USD ?? 5),
  paidCloudEnabled: process.env.ARKHE_PAID_CLOUD === "1",
  maxMissionBudgetUsd: Number(process.env.ARKHE_MAX_MISSION_BUDGET_USD ?? 25),
};

export function getRuntimeSettings(): RuntimeSettings {
  return { ...settings };
}

export function updateRuntimeSettings(partial: Partial<RuntimeSettings>): RuntimeSettings {
  const next: Partial<RuntimeSettings> = {};
  if (partial.defaultBudgetUsd !== undefined) next.defaultBudgetUsd = partial.defaultBudgetUsd;
  if (partial.paidCloudEnabled !== undefined) next.paidCloudEnabled = partial.paidCloudEnabled;
  if (partial.maxMissionBudgetUsd !== undefined) next.maxMissionBudgetUsd = partial.maxMissionBudgetUsd;
  settings = { ...settings, ...next };
  if (partial.paidCloudEnabled !== undefined) {
    process.env.ARKHE_PAID_CLOUD = partial.paidCloudEnabled ? "1" : "0";
  }
  if (partial.defaultBudgetUsd !== undefined) {
    process.env.ARKHE_DEFAULT_BUDGET_USD = String(partial.defaultBudgetUsd);
  }
  return getRuntimeSettings();
}

export function missionBudgetUsd(agentCount: number): number {
  const perAgent = Math.min(settings.defaultBudgetUsd, settings.maxMissionBudgetUsd / Math.max(agentCount, 1));
  return Math.min(agentCount * perAgent, settings.maxMissionBudgetUsd);
}
