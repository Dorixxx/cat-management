export interface ApiConfig {
  enableApiMode: boolean;
  apiBaseUrl: string; // e.g., "http://localhost:8000"
}

export interface TaskCompletionFilters {
  startDate?: string;
  endDate?: string;
  taskId?: string;
  scheduleType?: 'temporary' | 'interval' | 'cron';
  severity?: 'normal' | 'warning' | 'abnormal';
}

const formatLocalDate = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const hasTimezoneInfo = (value: string): boolean => /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);

const parseApiDateTime = (value: string): Date => {
  if (!value) return new Date();
  return new Date(hasTimezoneInfo(value) ? value : `${value}Z`);
};

export const getApiConfig = (): ApiConfig => {
  return {
    enableApiMode: true,
    apiBaseUrl: '',
  };
};

export const saveApiConfig = (config: ApiConfig): void => {
  // API traffic is same-origin in production and proxied by Vite during local development.
};

// Internal API path helper
const getApiUrl = (path: string): string => {
  const config = getApiConfig();
  let base = config.apiBaseUrl.trim();
  if (base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  return `${base}/api${path}`;
};

// Helper inside fetch to make sure requests use json headers
async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = getApiUrl(path);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error (${response.status}): ${errText || response.statusText}`);
  }

  return response.json();
}

// Map gender to/from backend format
const genderToBackend = (gender: 'Male' | 'Female'): string => {
  return gender === 'Male' ? '公' : '母';
};

const genderToFrontend = (gender: string): 'Male' | 'Female' => {
  return gender === '母' ? 'Female' : 'Male';
};

export const apiClient = {
  // ==================== CATS ENDPOINTS ====================
  async listCats(): Promise<any[]> {
    const backendCats = await apiFetch('/cats/');
    return backendCats.map((cat: any) => ({
      id: String(cat.id),
      name: cat.name,
      breed: cat.breed || '混血/未知',
      gender: genderToFrontend(cat.gender),
      birthday: cat.birthday || '',
      ageYears: cat.birthday ? calculateAge(cat.birthday).years : 0,
      ageMonths: cat.birthday ? calculateAge(cat.birthday).months : 0,
      weight: Number(cat.weight || 0),
      avatarUrl: cat.avatar || '',
      description: cat.notes || '',
      createdAt: cat.created_at || new Date().toISOString()
    }));
  },

  async createCat(cat: any): Promise<any> {
    const payload = {
      name: cat.name,
      gender: genderToBackend(cat.gender),
      breed: cat.breed,
      birthday: cat.birthday || calculateBirthday(cat.ageYears, cat.ageMonths),
      weight: cat.weight,
      color: null,
      avatar: cat.avatarUrl || null,
      notes: cat.description
    };
    const response = await apiFetch('/cats/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return String(response.id);
  },

  async updateCat(id: string, cat: any): Promise<void> {
    const payload = {
      name: cat.name,
      gender: genderToBackend(cat.gender),
      breed: cat.breed,
      birthday: cat.birthday || calculateBirthday(cat.ageYears, cat.ageMonths),
      weight: cat.weight,
      color: null,
      avatar: cat.avatarUrl || null,
      notes: cat.description
    };
    await apiFetch(`/cats/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteCat(id: string): Promise<void> {
    await apiFetch(`/cats/${id}`, {
      method: 'DELETE'
    });
  },

  // ==================== WEIGHT RECORDS ====================
  async listWeights(catId: string): Promise<any[]> {
    try {
      const records = await apiFetch(`/cats/${catId}/weights`);
      return records.map((r: any) => ({
        id: String(r.id),
        catId: String(r.cat_id),
        weight: Number(r.weight),
        date: r.record_date || formatLocalDate()
      }));
    } catch (e) {
      console.warn('Weights fetch error/not found, fallback to empty', e);
      return [];
    }
  },

  async createWeight(catId: string, weightValue: number, dateStr: string): Promise<any> {
    const payload = {
      weight: weightValue,
      record_date: dateStr,
      notes: '日常称重'
    };
    const res = await apiFetch(`/cats/${catId}/weights`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return String(res.id);
  },

  async deleteWeight(recordId: string): Promise<void> {
    await apiFetch(`/cats/weights/${recordId}`, {
      method: 'DELETE'
    });
  },

  // ==================== TASKS ENDPOINTS ====================
  async listTasks(): Promise<any[]> {
    const backendTasks = await apiFetch('/tasks/');
    return backendTasks.map((t: any) => ({
      id: String(t.id),
      catId: t.cat_id ? String(t.cat_id) : 'all',
      catIds: (t.cat_ids || []).map((id: number) => String(id)),
      completedCatIds: (t.completed_cat_ids || []).map((id: number) => String(id)),
      title: t.title,
      intervalDays: t.frequency_days,
      scheduleType: t.schedule_type || (t.frequency_days > 0 ? 'interval' : 'temporary'),
      cronExpression: t.cron_expression || '',
      lastCompletedDate: null,
      nextDueDate: t.next_due_date ? toLocalDateTimeInput(t.next_due_date) : toLocalDateTimeInput(new Date().toISOString()),
      completionTarget: Number(t.completion_target || 0),
      completedCount: Number(t.completed_count || 0),
      linkedItemId: t.linked_item_id ? String(t.linked_item_id) : '',
      linkedItemQuantity: Number(t.linked_item_quantity || 0),
      note: t.description || ''
    }));
  },

  async createTask(task: any): Promise<any> {
    const payload = {
      title: task.title,
      description: task.note,
      task_type: 'Care',
      frequency_days: task.intervalDays,
      schedule_type: task.scheduleType || (task.intervalDays > 0 ? 'interval' : 'temporary'),
      cron_expression: task.cronExpression || null,
      next_due_date: task.nextDueDate ? new Date(task.nextDueDate).toISOString() : new Date().toISOString(),
      reminder_minutes: 30,
      completion_target: task.completionTarget || 0,
      linked_item_id: task.linkedItemId ? Number(task.linkedItemId) : null,
      linked_item_quantity: task.linkedItemQuantity || 0,
      bark_enabled: true,
      cat_ids: (task.catIds || (task.catId === 'all' ? [] : [task.catId])).map(Number)
    };
    const response = await apiFetch('/tasks/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return String(response.id);
  },

  async updateTask(id: string, task: any): Promise<void> {
    const payload = {
      title: task.title,
      description: task.note,
      task_type: 'Care',
      frequency_days: task.intervalDays,
      schedule_type: task.scheduleType || (task.intervalDays > 0 ? 'interval' : 'temporary'),
      cron_expression: task.cronExpression || null,
      next_due_date: task.nextDueDate ? new Date(task.nextDueDate).toISOString() : new Date().toISOString(),
      completion_target: task.completionTarget || 0,
      linked_item_id: task.linkedItemId ? Number(task.linkedItemId) : null,
      linked_item_quantity: task.linkedItemQuantity || 0,
      cat_ids: (task.catIds || (task.catId === 'all' ? [] : [task.catId])).map(Number)
    };
    await apiFetch(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async completeTask(id: string, catId: string | undefined, notes = '', severity: 'normal' | 'warning' | 'abnormal' = 'normal'): Promise<any> {
    const response = await apiFetch(`/tasks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        completed_at: new Date().toISOString(),
        cat_id: catId ? Number(catId) : null,
        notes,
        severity
      })
    });
    return response;
  },

  async listTaskCompletions(id: string): Promise<any[]> {
    const rows = await apiFetch(`/tasks/${id}/completions`);
    return rows.map((row: any) => ({
      id: String(row.id),
      taskId: String(row.task_id),
      catId: row.cat_id ? String(row.cat_id) : '',
      completedAt: toLocalDateTimeInput(row.completed_at),
      notes: row.notes || '',
      severity: row.severity || 'normal',
      linkedItemId: row.linked_item_id ? String(row.linked_item_id) : '',
      deductedQuantity: Number(row.deducted_quantity || 0)
    }));
  },

  async listAllTaskCompletions(filters: TaskCompletionFilters = {}): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters.startDate) params.set('start_date', `${filters.startDate}:00+08:00`);
    if (filters.endDate) params.set('end_date', `${filters.endDate}:59+08:00`);
    if (filters.taskId) params.set('task_id', filters.taskId);
    if (filters.scheduleType) params.set('schedule_type', filters.scheduleType);
    if (filters.severity) params.set('severity', filters.severity);

    const query = params.toString();
    const rows = await apiFetch(`/tasks/completions/all${query ? `?${query}` : ''}`);
    return rows.map((row: any) => ({
      id: String(row.id),
      taskId: String(row.task_id),
      completedAt: toLocalDateTimeInput(row.completed_at),
      notes: row.notes || '',
      severity: row.severity || 'normal',
      linkedItemId: row.linked_item_id ? String(row.linked_item_id) : '',
      deductedQuantity: Number(row.deducted_quantity || 0)
    }));
  },

  async deleteTask(id: string): Promise<void> {
    await apiFetch(`/tasks/${id}`, {
      method: 'DELETE'
    });
  },

  // ==================== INVENTORY ENDPOINTS ====================
  async listInventory(): Promise<any[]> {
    const items = await apiFetch('/inventory/items');
    return items.map((item: any) => {
      return {
        id: String(item.id),
        name: item.name,
        brand: item.brand || '',
        isFood: Boolean(item.is_food),
        purchaseUrl: item.purchase_url || '',
        categoryId: item.category_id ? String(item.category_id) : null,
        categoryName: item.category?.name || '未分类',
        categoryIcon: item.category?.icon || '📦',
        stockAmount: Number(item.current_quantity || 0),
        unit: item.unit || '件',
        minThreshold: Number(item.warning_threshold || 0),
        warningUnit: item.warning_unit || item.unit || '份',
        dailyConsumption: Number(item.daily_consumption || 0),
        consumptionUnit: item.consumption_unit || item.unit || '份',
        productionDate: item.production_date || '',
        shelfLifeDays: Number(item.shelf_life_days || 0),
        expiryWarningDays: Number(item.expiry_warning_days || 7),
        note: item.notes || '',
        lastUpdated: item.updated_at || new Date().toISOString()
      };
    });
  },

  async listInventoryCategories(): Promise<any[]> {
    const rows = await apiFetch('/inventory/categories');
    return rows.map((row: any) => ({
      id: String(row.id),
      name: row.name,
      icon: row.icon || '📦',
      sortOrder: row.sort_order || 0
    }));
  },

  async createInventoryCategory(name: string): Promise<any> {
    const row = await apiFetch('/inventory/categories', {
      method: 'POST',
      body: JSON.stringify({ name, icon: '📦', sort_order: 0 })
    });
    return {
      id: String(row.id),
      name: row.name,
      icon: row.icon || '📦',
      sortOrder: row.sort_order || 0
    };
  },

  async createInventoryItem(supply: any): Promise<any> {
    const categoryId = supply.categoryId ? Number(supply.categoryId) : await getOrCreateCategory(supply.categoryName);

    const payload = {
      name: supply.name,
      brand: supply.brand || null,
      is_food: Boolean(supply.isFood),
      unit: supply.unit,
      current_quantity: supply.stockAmount,
      weekly_consumption: supply.dailyConsumption ? supply.dailyConsumption * 7 : 0,
      daily_consumption: supply.dailyConsumption || 0,
      consumption_unit: supply.consumptionUnit || supply.unit,
      warning_threshold: supply.minThreshold,
      warning_unit: supply.warningUnit || supply.unit,
      warning_weeks: 1,
      expiry_warning_days: supply.expiryWarningDays || 7,
      production_date: supply.productionDate || null,
      shelf_life_days: supply.shelfLifeDays || null,
      price_per_unit: 0,
      purchase_url: supply.purchaseUrl || null,
      notes: supply.note,
      category_id: categoryId
    };

    const res = await apiFetch('/inventory/items', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return String(res.id);
  },

  async updateInventoryItem(id: string, supply: any): Promise<void> {
    const categoryId = supply.categoryId ? Number(supply.categoryId) : await getOrCreateCategory(supply.categoryName);
    const payload = {
      name: supply.name,
      brand: supply.brand || null,
      is_food: Boolean(supply.isFood),
      unit: supply.unit,
      current_quantity: supply.stockAmount,
      weekly_consumption: supply.dailyConsumption ? supply.dailyConsumption * 7 : 0,
      daily_consumption: supply.dailyConsumption || 0,
      consumption_unit: supply.consumptionUnit || supply.unit,
      warning_threshold: supply.minThreshold,
      warning_unit: supply.warningUnit || supply.unit,
      expiry_warning_days: supply.expiryWarningDays || 7,
      production_date: supply.productionDate || null,
      shelf_life_days: supply.shelfLifeDays || null,
      purchase_url: supply.purchaseUrl || null,
      notes: supply.note,
      category_id: categoryId
    };

    await apiFetch(`/inventory/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteInventoryItem(id: string): Promise<void> {
    await apiFetch(`/inventory/items/${id}`, {
      method: 'DELETE'
    });
  }
};

// Local utilities to parse birthday
function calculateAge(birthdayStr: string): { years: number; months: number } {
  try {
    const birth = new Date(birthdayStr);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    return { years: Math.max(0, years), months: Math.max(0, months) };
  } catch (e) {
    return { years: 0, months: 0 };
  }
}

function toLocalDateTimeInput(value: string): string {
  const date = parseApiDateTime(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function calculateBirthday(years: number, months: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setMonth(date.getMonth() - months);
  return formatLocalDate(date);
}

// Map inventory category names to backend Categories (create on demand)
async function getOrCreateCategory(category: string): Promise<number | null> {
  const target = { name: category || '未分类', icon: '📦' };
  
  try {
    const categoriesList = await apiFetch('/inventory/categories');
    const existing = categoriesList.find((c: any) => c.name === target.name);
    if (existing) {
      return existing.id;
    }

    // Create on the backend
    const created = await apiFetch('/inventory/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: target.name,
        icon: target.icon,
        sort_order: 0
      })
    });
    return created.id;
  } catch (e) {
    console.warn('Failed to resolve category list, fallback to category_id null', e);
    return null;
  }
}
