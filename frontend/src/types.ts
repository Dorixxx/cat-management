export interface Cat {
  id: string;
  name: string;
  breed: string;
  gender: 'Male' | 'Female';
  ageYears: number;
  ageMonths: number;
  weight: number; // in kg
  avatarUrl: string;
  guardian: string;
  description: string;
  createdAt: string;
}

export type SupplyCategory = 'Food' | 'Treat' | 'Litter' | 'Medical' | 'Other';

export interface SupplyItem {
  id: string;
  name: string;
  category: SupplyCategory;
  stockAmount: number;
  unit: string; // e.g. "袋", "罐", "kg", "盒"
  minThreshold: number; // Low stock warning below this
  note: string;
  lastUpdated: string;
}

export interface RoutineTask {
  id: string;
  catId: string; // Specific cat ID, or 'All' for general tasks
  title: string;
  intervalDays: number; // interval in days, e.g. 7 for weekly, 30 for monthly, 90 for quarterly
  lastCompletedDate: string | null; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  note: string;
}

export interface WeightRecord {
  id: string;
  catId: string;
  date: string;
  weight: number;
}

