export interface Cat {
  id: string;
  name: string;
  breed: string;
  gender: 'Male' | 'Female';
  birthday: string;
  ageYears: number;
  ageMonths: number;
  weight: number; // in kg
  avatarUrl: string;
  description: string;
  createdAt: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

export interface SupplyItem {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  stockAmount: number;
  unit: string; // e.g. "袋", "罐", "kg", "盒"
  minThreshold: number; // Low stock warning below this
  dailyConsumption: number;
  productionDate: string;
  shelfLifeDays: number;
  expiryWarningDays: number;
  note: string;
  lastUpdated: string;
}

export interface RoutineTask {
  id: string;
  catId: string; // Specific cat ID, or 'All' for general tasks
  title: string;
  intervalDays: number; // interval in days, e.g. 7 for weekly, 30 for monthly, 90 for quarterly
  scheduleType: 'temporary' | 'interval' | 'cron';
  cronExpression: string;
  lastCompletedDate: string | null; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DDTHH:mm
  completionTarget: number;
  completedCount: number;
  linkedItemId: string;
  linkedItemQuantity: number;
  note: string;
}

export type TaskCompletionSeverity = 'normal' | 'warning' | 'abnormal';

export interface WeightRecord {
  id: string;
  catId: string;
  date: string;
  weight: number;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  completedAt: string;
  notes: string;
  severity: TaskCompletionSeverity;
  linkedItemId: string;
  deductedQuantity: number;
}
