export type SavingsPlanCreationType = 'rule_based' | 'manual' | 'imported';
export type SavingsPlanStatus = 'active' | 'completed';
export type SavingsTargetStatus = 'pending' | 'in_progress' | 'completed';
export type SavingsTargetOrigin = 'generated' | 'manual' | 'imported';
export type SavingsContributionSourceKind = 'direct' | 'overflow';
export type SavingsFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface SavingsPlanGenerationConfig {
  initialAmount: number;
  incrementAmount: number;
  periodsCount: number;
  frequency: SavingsFrequency;
  generationMode: 'incremental_fixed';
  currency: 'COP';
}

export interface SavingsPlan {
  id?: string;
  name: string;
  description?: string;
  creationType: SavingsPlanCreationType;
  generationConfig?: SavingsPlanGenerationConfig | null;
  totalGoal: number;
  totalSaved: number;
  progressPercent: number;
  createdAt: number;
  updatedAt: number;
  status: SavingsPlanStatus;
  currency: 'COP';
  itemsCount: number;
  completedItemsCount: number;
}

export interface SavingsTarget {
  id?: string;
  planId: string;
  label: string;
  targetAmount: number;
  savedAmount: number;
  remainingAmount: number;
  status: SavingsTargetStatus;
  startedAt: number | null;
  completedAt: number | null;
  displayOrder: number;
  origin: SavingsTargetOrigin;
  createdAt: number;
  updatedAt: number;
}

export interface SavingsContribution {
  id?: string;
  planId: string;
  targetId: string;
  targetLabel: string;
  amount: number;
  entryDate: number;
  note?: string;
  createdAt: number;
  allocationGroupId: string;
  allocationStep: number;
  sourceKind: SavingsContributionSourceKind;
}

export interface SavingsDraftTarget {
  label: string;
  targetAmount: number;
  origin: SavingsTargetOrigin;
  displayOrder: number;
}

export interface CreateSavingsPlanInput {
  name: string;
  description?: string;
  creationType: SavingsPlanCreationType;
  generationConfig?: SavingsPlanGenerationConfig | null;
  currency?: 'COP';
  targets: SavingsDraftTarget[];
}

export interface SavingsContributionAllocationInput {
  targetId: string;
  amount: number;
  sourceKind: SavingsContributionSourceKind;
}

export interface RegisterSavingsContributionInput {
  planId: string;
  totalInputAmount: number;
  contributionDate: number;
  note?: string;
  allocations: SavingsContributionAllocationInput[];
}

export interface SavingsImportPreview {
  items: SavingsDraftTarget[];
  errors: string[];
  delimiter: ',' | ';' | '\t';
  detectedColumns: string[];
}

export function calculateSavingsProgress(currentAmount: number, targetAmount: number): number {
  if (targetAmount <= 0) return 0;
  const ratio = (currentAmount / targetAmount) * 100;
  return Math.max(0, Math.min(100, Number(ratio.toFixed(2))));
}

export function getSavingsTargetStatus(savedAmount: number, targetAmount: number): SavingsTargetStatus {
  if (savedAmount <= 0) return 'pending';
  if (savedAmount >= targetAmount) return 'completed';
  return 'in_progress';
}
