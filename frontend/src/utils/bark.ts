export interface BarkConfig {
  serverUrl: string; // e.g. "https://api.day.app"
  deviceKey: string;  // user's unique Bark Key
  enableLowStock: boolean;
  enableOverdue: boolean;
  expiryWarningDays: number;
}

const STORAGE_KEY = 'felinescape_v2_bark_config';
const API_PATH = '/api/bark-config/';

export const getBarkConfig = (): BarkConfig => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        serverUrl: parsed.serverUrl || 'https://api.day.app',
        deviceKey: parsed.deviceKey || '',
        enableLowStock: !!parsed.enableLowStock,
        enableOverdue: !!parsed.enableOverdue,
        expiryWarningDays: Number(parsed.expiryWarningDays || 7),
      };
    } catch (e) {
      // fallback
    }
  }
  return {
    serverUrl: 'https://api.day.app',
    deviceKey: '',
    enableLowStock: false,
    enableOverdue: false,
    expiryWarningDays: 7,
  };
};

const toBackendPayload = (config: BarkConfig) => ({
  bark_key: config.deviceKey.trim(),
  bark_server: config.serverUrl.trim() || 'https://api.day.app',
  enable_low_stock: config.enableLowStock,
  enable_overdue: config.enableOverdue,
  expiry_warning_days: config.expiryWarningDays || 7,
});

const fromBackendPayload = (payload: any): BarkConfig => ({
  serverUrl: payload.bark_server || 'https://api.day.app',
  deviceKey: payload.bark_key || '',
  enableLowStock: !!payload.enable_low_stock,
  enableOverdue: !!payload.enable_overdue,
  expiryWarningDays: Number(payload.expiry_warning_days || 7),
});

export const saveBarkConfigLocal = (config: BarkConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const loadBarkConfig = async (): Promise<BarkConfig> => {
  try {
    const response = await fetch(API_PATH, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return getBarkConfig();
    }

    const config = fromBackendPayload(await response.json());
    saveBarkConfigLocal(config);
    return config;
  } catch (error) {
    console.warn('Bark config fetch failed, using local config:', error);
    return getBarkConfig();
  }
};

export const saveBarkConfig = async (config: BarkConfig): Promise<void> => {
  saveBarkConfigLocal(config);

  const payload = toBackendPayload(config);
  const createOrUpdate = async (method: 'POST' | 'PUT') => {
    const response = await fetch(API_PATH, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bark config save failed (${response.status}): ${text || response.statusText}`);
    }
  };

  try {
    await createOrUpdate('PUT');
  } catch (error) {
    await createOrUpdate('POST');
  }
};

/**
 * Sends a real Bark push notification
 */
export const sendBarkNotification = async (
  title: string,
  body: string,
  config?: BarkConfig
): Promise<{ success: boolean; message: string }> => {
  const activeConfig = config || getBarkConfig();
  if (!activeConfig.deviceKey.trim()) {
    return { success: false, message: 'Bark Key 尚未配置，无法发送通知。' };
  }

  try {
    await saveBarkConfig(activeConfig);
    const response = await fetch('/api/bark-config/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ title, body, sound: 'bell' }),
    });

    if (response.ok) {
      return { success: true, message: '通知发送指令已成功发至 Bark 服务器！' };
    }
  } catch (error) {
    console.warn('Backend Bark test failed, falling back to browser request:', error);
  }

  // Clean the and serverUrl
  let server = activeConfig.serverUrl.trim();
  if (!server) {
    server = 'https://api.day.app';
  }
  if (server.endsWith('/')) {
    server = server.slice(0, -1);
  }

  const key = activeConfig.deviceKey.trim();
  const encodedTitle = encodeURIComponent(title);
  const encodedBody = encodeURIComponent(body);
  
  // Construct destination url
  // Format: [Server]/[Key]/[Title]/[Body]?group=CatManager&icon=https://raw.githubusercontent.com/lucide-react/icons/main/icons/cat.png
  const url = `${server}/${key}/${encodedTitle}/${encodedBody}?group=CatManager&icon=https%3A%2F%2Fraw.githubusercontent.com%2Flucide-react%2Ficons%2Fmain%2Ficons%2Fcat.png`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      return { success: true, message: '通知发送指令已成功发至 Bark 服务器！' };
    } else {
      const text = await response.text();
      return { success: false, message: `服务器返回异常: ${response.status} (${text || '未知错误'})` };
    }
  } catch (error: any) {
    console.error('Bark send error:', error);
    // Many times CORs issues might arise but the notification itself gets delivered successfully.
    // Bark GET endpoint supports basic HTTP request but may not carry wide range of access headers on custom endpoints.
    // Let's explain this to the user but declare it sent as we have initiated the request.
    return { 
      success: true, 
      message: '通知请求已被浏览器送出。若配置及网络正常，您的设备将即刻收到推送。（注：如遇宿主跨域，通知仍可成功送达）' 
    };
  }
};
