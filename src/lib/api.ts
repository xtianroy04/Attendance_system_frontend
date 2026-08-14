const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export type Role = 'admin' | 'staff';

export type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  is_active?: boolean;
};

export type Seminarian = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  birthdate: string;
  age: number;
  address: string;
  is_adventist: boolean;
  created_at: string;
};

export type Seminar = {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  day_count: number;
  is_active: boolean;
  has_ended: boolean;
  has_started: boolean;
  dates: string[];
  created_at: string;
};

export type TallyRow = {
  seminarian_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  is_adventist: boolean;
  days: Record<string, 'P' | 'A' | '-'>;
  present_count: number;
  elapsed_days: number;
  total_days: number;
  perfect_attendance: boolean;
  today_status: 'P' | 'A' | '-';
};

export type SeminarTally = {
  seminar: Seminar;
  dates: string[];
  today: string;
  can_mark_today: boolean;
  rows: TallyRow[];
  perfect_count: number;
  total_seminarians: number;
  present_today: number;
};

export type RaffleEntry = {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  is_adventist: boolean;
  present_count: number;
  total_days: number;
  perfect_attendance: boolean;
};

export type RafflePool = {
  seminar: Seminar;
  mode: 'all' | 'perfect' | 'manual' | 'non_adventist';
  day_count: number;
  pool: RaffleEntry[];
  pool_count: number;
  all_seminarians: RaffleEntry[];
};

export type DashboardStats = {
  total_seminarians: number;
  present_today: number;
  absent_today: number;
  date: string;
  active_seminar: Seminar | null;
};

export type SeminarArchiveItem = {
  seminar: Seminar;
  total_seminarians: number;
  total_days: number;
  elapsed_days: number;
  total_present_marks: number;
  perfect_count: number;
  attendance_rate: number;
  present_today: number | null;
};

export type SeminarArchiveResponse = {
  status: string;
  count: number;
  results: SeminarArchiveItem[];
};

export type MarkPresentResult = {
  id: number;
  seminar_id: number;
  seminarian_id: number;
  full_name: string;
  date: string;
  status: string;
  created: boolean;
  greeting: 'welcome' | 'welcome_back';
  is_returning: boolean;
  prior_present_days: number;
  present_count: number;
  total_days: number;
  seminar_title: string;
  message: string;
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers,
  });

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    if (typeof data === 'object' && data) {
      const obj = data as Record<string, unknown>;
      if ('detail' in obj) {
        detail = String(obj.detail);
      } else if (Array.isArray(obj.non_field_errors)) {
        detail = obj.non_field_errors.map(String).join(' ');
      } else {
        const parts: string[] = [];
        for (const [key, val] of Object.entries(obj)) {
          if (Array.isArray(val)) {
            parts.push(key === 'non_field_errors' ? val.join(' ') : `${key}: ${val.join(' ')}`);
          } else if (typeof val === 'string') {
            parts.push(`${key}: ${val}`);
          }
        }
        if (parts.length) detail = parts.join(' ');
      }
    }
    throw new ApiError(detail, res.status, data);
  }

  return data as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ access: string; refresh: string; user: User }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<User>('/auth/me/'),

  verifyPassword: (password: string) =>
    request<{ ok: boolean }>('/auth/verify-password/', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  dashboardStats: () => request<DashboardStats>('/dashboard/stats/'),

  listSeminarians: () => request<Seminarian[]>('/seminarians/'),

  createSeminarian: (payload: {
    first_name: string;
    last_name: string;
    birthdate: string;
    address: string;
    is_adventist: boolean;
    mark_present?: boolean;
  }) =>
    request<Seminarian>('/seminarians/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSeminarian: (
    id: number,
    payload: Partial<{
      first_name: string;
      last_name: string;
      birthdate: string;
      address: string;
      is_adventist: boolean;
    }>
  ) =>
    request<Seminarian>(`/seminarians/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteSeminarian: (id: number) =>
    request<void>(`/seminarians/${id}/`, { method: 'DELETE' }),

  listSeminars: () => request<Seminar[]>('/seminars/'),

  createSeminar: (payload: { title: string; start_date: string; end_date: string }) =>
    request<Seminar>('/seminars/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteSeminar: (id: number) =>
    request<void>(`/seminars/${id}/`, { method: 'DELETE' }),

  seminarTally: (id: number) => request<SeminarTally>(`/seminars/${id}/tally/`),

  seminarArchive: (status: 'all' | 'ended' | 'active' | 'upcoming' = 'all') =>
    request<SeminarArchiveResponse>(`/seminars/archive/?status=${status}`),

  exportTally: async (id: number, format: 'xlsx' | 'pdf') => {
    const token = getToken();
    const res = await fetch(`${API_URL}/api/seminars/${id}/tally/export/?type=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      let detail = `Export failed (${res.status})`;
      try {
        const data = await res.json();
        if (data?.detail) detail = String(data.detail);
      } catch {
        /* ignore */
      }
      throw new ApiError(detail, res.status, null);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || `seminar_tally.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  rafflePool: (id: number, mode: 'all' | 'perfect' | 'manual' | 'non_adventist' = 'all') =>
    request<RafflePool>(`/seminars/${id}/raffle-pool/?mode=${mode}`),

  markPresent: (seminarian_id: number, seminar_id: number) =>
    request<MarkPresentResult>('/attendance/mark/', {
      method: 'POST',
      body: JSON.stringify({ seminarian_id, seminar_id }),
    }),

  listUsers: () => request<User[]>('/users/'),

  createUser: (payload: {
    username: string;
    password: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    role: Role;
  }) =>
    request<User>('/users/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUser: (
    id: number,
    payload: Partial<{
      username: string;
      password: string;
      first_name: string;
      last_name: string;
      email: string;
      role: Role;
      is_active: boolean;
    }>
  ) =>
    request<User>(`/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteUser: (id: number) =>
    request<void>(`/users/${id}/`, { method: 'DELETE' }),
};

export function calcAge(birthdate: string): number | null {
  if (!birthdate) return null;
  const dob = new Date(birthdate + 'T00:00:00');
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
