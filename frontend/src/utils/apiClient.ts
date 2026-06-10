export interface ApiConfig {
  enableApiMode: boolean;
  apiBaseUrl: string; // e.g., "http://localhost:8000"
}

export const getApiConfig = (): ApiConfig => {
  return {
    enableApiMode: true,
    apiBaseUrl: '',
  };
};

export const saveApiConfig = (config: ApiConfig): void => {
  // API traffic is proxied by frontend/server.ts; runtime changes are not needed here.
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
      ageYears: cat.birthday ? calculateAge(cat.birthday).years : 0,
      ageMonths: cat.birthday ? calculateAge(cat.birthday).months : 0,
      weight: Number(cat.weight || 0),
      avatarUrl: cat.avatar || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150',
      guardian: cat.color || '守护者',
      description: cat.notes || '',
      createdAt: cat.created_at || new Date().toISOString()
    }));
  },

  async createCat(cat: any): Promise<any> {
    const payload = {
      name: cat.name,
      gender: genderToBackend(cat.gender),
      breed: cat.breed,
      birthday: calculateBirthday(cat.ageYears, cat.ageMonths),
      weight: cat.weight,
      color: cat.guardian,
      avatar: cat.avatarUrl,
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
      birthday: calculateBirthday(cat.ageYears, cat.ageMonths),
      weight: cat.weight,
      color: cat.guardian,
      avatar: cat.avatarUrl,
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
        date: r.record_date || new Date().toISOString().split('T')[0]
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
      title: t.title,
      intervalDays: t.frequency_days,
      lastCompletedDate: null,
      nextDueDate: t.next_due_date ? t.next_due_date.split('T')[0] : new Date().toISOString().split('T')[0],
      note: t.description || ''
    }));
  },

  async createTask(task: any): Promise<any> {
    const payload = {
      title: task.title,
      description: task.note,
      task_type: 'Care',
      frequency_days: task.intervalDays,
      next_due_date: task.nextDueDate ? `${task.nextDueDate}T09:00:00` : new Date().toISOString(),
      reminder_minutes: 30,
      bark_enabled: true,
      cat_id: task.catId === 'all' ? null : Number(task.catId)
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
      next_due_date: task.nextDueDate ? `${task.nextDueDate}T09:00:00` : new Date().toISOString(),
      cat_id: task.catId === 'all' ? null : Number(task.catId)
    };
    await apiFetch(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async completeTask(id: string): Promise<any> {
    const response = await apiFetch(`/tasks/${id}/complete`, {
      method: 'POST'
    });
    return response;
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
      let cat: any = 'Other';
      const catName = item.category?.name || '其他';
      if (catName.includes('粮') || catName.includes('Food')) cat = 'Food';
      else if (catName.includes('零食') || catName.includes('Treat')) cat = 'Treat';
      else if (catName.includes('砂') || catName.includes('Litter')) cat = 'Litter';
      else if (catName.includes('医') || catName.includes('医疗') || catName.includes('Medical')) cat = 'Medical';

      return {
        id: String(item.id),
        name: item.name,
        category: cat,
        stockAmount: Number(item.current_quantity || 0),
        unit: item.unit || '件',
        minThreshold: Number(item.warning_threshold || 0),
        note: item.notes || '',
        lastUpdated: item.updated_at || new Date().toISOString()
      };
    });
  },

  async createInventoryItem(supply: any): Promise<any> {
    // 1. Ensure category ID exists
    const categoryId = await getOrCreateCategory(supply.category);
    
    const payload = {
      name: supply.name,
      unit: supply.unit,
      current_quantity: supply.stockAmount,
      weekly_consumption: 0,
      warning_threshold: supply.minThreshold,
      warning_weeks: 1,
      price_per_unit: 0,
      purchase_url: '',
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
    const categoryId = await getOrCreateCategory(supply.category);
    const payload = {
      name: supply.name,
      unit: supply.unit,
      current_quantity: supply.stockAmount,
      warning_threshold: supply.minThreshold,
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

function calculateBirthday(years: number, months: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
}

// Map inventory category names to backend Categories (create on demand)
async function getOrCreateCategory(category: string): Promise<number | null> {
  const mappings: { [key: string]: { name: string; icon: string } } = {
    'Food': { name: '主食猫粮', icon: '🍱' },
    'Treat': { name: '零食冻干', icon: '🍗' },
    'Litter': { name: '猫砂用品', icon: '🧹' },
    'Medical': { name: '医疗健康', icon: '💊' },
    'Other': { name: '其他商品', icon: '📦' }
  };

  const target = mappings[category] || mappings['Other'];
  
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
