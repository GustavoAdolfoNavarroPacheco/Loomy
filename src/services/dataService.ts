// Servicio de datos para la DEMO "Loomy"
// Sustituye a Firebase Firestore por una API REST sobre Neon (PostgreSQL).

const API_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'loomy_token';

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error || `Error ${res.status}`);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Conversión de datos (ISO strings → Date, eliminación de undefined)
// ---------------------------------------------------------------------------
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export const convertFirestoreData = (data: any): any => {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string' && ISO_DATE_RE.test(data)) return new Date(data);
  if (Array.isArray(data)) return data.map((item) => convertFirestoreData(item));
  if (typeof data === 'object' && !(data instanceof Date)) {
    const converted: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        converted[key] = convertFirestoreData(data[key]);
      }
    }
    return converted;
  }
  return data;
};

export const sanitizeForFirestore = (data: any): any => {
  if (data === null || data === undefined) return data;
  if (data instanceof Date) return data.toISOString();
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map((v) => sanitizeForFirestore(v));
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) {
        sanitized[key] = sanitizeForFirestore(data[key]);
      }
    }
    return sanitized;
  }
  return data;
};

export const convertDoc = <T extends { id: string }>(doc: any): T => {
  return convertFirestoreData(doc) as T;
};

// ---------------------------------------------------------------------------
// Colecciones (CRUD)
// ---------------------------------------------------------------------------
// Intervalo de polling: 10s para ser amables con el free tier de Neon.
const POLL_MS = 10000;

export const subscribeToCollection = <T extends { id: string }>(
  collectionName: string,
  callback: (data: T[]) => void,
  orderField?: string
): (() => void) => {
  let stopped = false;
  let hasLoggedError = false;

  const load = async () => {
    try {
      const qs = orderField ? `?order=${encodeURIComponent(orderField)}` : '';
      const items = await request<any[]>(`/collections/${encodeURIComponent(collectionName)}${qs}`);
      hasLoggedError = false;
      if (!stopped) callback(items.map((it) => convertFirestoreData(it)));
    } catch (err) {
      if (!hasLoggedError) {
        hasLoggedError = true;
        console.error(`Error polling ${collectionName}:`, err);
      }
    }
  };

  load();
  const interval = setInterval(load, POLL_MS);

  return () => {
    stopped = true;
    clearInterval(interval);
  };
};

export const listCollection = async <T extends { id: string }>(
  collectionName: string,
  orderField?: string
): Promise<T[]> => {
  const qs = orderField ? `?order=${encodeURIComponent(orderField)}` : '';
  const items = await request<any[]>(`/collections/${encodeURIComponent(collectionName)}${qs}`);
  return items.map((it) => convertFirestoreData(it));
};

export const addItem = async (collectionName: string, data: any): Promise<{ id: string }> => {
  return request<{ id: string }>(`/collections/${encodeURIComponent(collectionName)}`, {
    method: 'POST',
    body: JSON.stringify(sanitizeForFirestore(data)),
  });
};

export const updateItem = async (collectionName: string, id: string, data: any) => {
  await request(`/collections/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(sanitizeForFirestore(data)),
  });
};

export const setItem = async (collectionName: string, id: string, data: any, _options: any = { merge: true }) => {
  await updateItem(collectionName, id, data);
};

export const deleteItem = async (collectionName: string, id: string) => {
  await request(`/collections/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
};

export const clearCollection = async (collectionName: string) => {
  await request(`/collections/${encodeURIComponent(collectionName)}`, { method: 'DELETE' });
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const apiLogin = async (email: string, password: string) => {
  return request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const apiMe = async () => {
  return request<{ user: any }>('/auth/me');
};

export const apiLogout = async () => {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  }
  clearToken();
};

export const createUser = async (data: {
  email: string;
  password: string;
  modifyLocal?: boolean;
  modifyInternational?: boolean;
  isCotizador?: boolean;
}) => {
  await request('/users', { method: 'POST', body: JSON.stringify(data) });
};

export const updateUser = async (email: string, data: {
  modifyLocal?: boolean;
  modifyInternational?: boolean;
  isCotizador?: boolean;
}) => {
  await request(`/users/${encodeURIComponent(email)}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteUser = async (email: string) => {
  await request(`/users/${encodeURIComponent(email)}`, { method: 'DELETE' });
};

// ---------------------------------------------------------------------------
// Archivos
// ---------------------------------------------------------------------------
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const uploadFile = async (file: File, _path: string): Promise<string> => {
  const base64 = await fileToBase64(file);
  const res = await request<{ url: string }>('/files', {
    method: 'POST',
    body: JSON.stringify({ name: file.name, mime: file.type, base64 }),
  });
  return res.url;
};

export const deleteFile = async (url: string): Promise<void> => {
  const match = url.match(/\/api\/files\/([^/?]+)/);
  if (!match) return;
  await request(`/files/${match[1]}`, { method: 'DELETE' });
};
