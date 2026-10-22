import { User, Subject, StudySession, SubjectSummary, Goal, TagSummary, AuditEntry } from './types';

const API_BASE = '/api';
const TOKEN_KEY = 'studysync_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

// Fired on any 401 so the app can drop back to the login screen
export const UNAUTHORIZED_EVENT = 'studysync:unauthorized';

async function request<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && token) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  return res.json();
}

type SessionInput = {
  subjectId: number;
  durationMinutes: number;
  sessionDate: string;
  notes?: string;
  tags?: string[];
};

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ success: boolean; token?: string; user?: User; error?: string }>('/auth/login', 'POST', { username, password }),
  register: (username: string, email: string, password: string) =>
    request<{ success: boolean; token?: string; user?: User; error?: string }>('/auth/register', 'POST', { username, email, password }),
  me: () => request<{ success: boolean; user?: User }>('/auth/me'),

  // Subjects
  getSubjects: () => request<{ success: boolean; data: Subject[] }>('/subjects'),
  addSubject: (name: string, colorCode: string) =>
    request<{ success: boolean; error?: string }>('/subjects', 'POST', { name, colorCode }),

  // Study sessions
  getSessions: () => request<{ success: boolean; data: StudySession[] }>('/sessions'),
  addSession: (data: SessionInput) => request<{ success: boolean; error?: string }>('/sessions', 'POST', data),
  updateSession: (id: number, data: SessionInput) =>
    request<{ success: boolean; error?: string }>(`/sessions/${id}`, 'PUT', data),
  deleteSession: (id: number) => request<{ success: boolean; error?: string }>(`/sessions/${id}`, 'DELETE'),

  // Analytics
  getSummary: () => request<{ success: boolean; data: SubjectSummary[] }>('/summary'),
  getDaily: () => request<{ success: boolean; data: { session_date: string; total_minutes: number }[] }>('/daily'),
  getTagSummary: () => request<{ success: boolean; data: TagSummary[] }>('/tag-summary'),
  getGoals: () => request<{ success: boolean; data: Goal[] }>('/goals'),
  setGoal: (subjectId: number, weeklyTargetMinutes: number) =>
    request<{ success: boolean; error?: string }>(`/goals/${subjectId}`, 'PUT', { weeklyTargetMinutes }),
  getAudit: () => request<{ success: boolean; data: AuditEntry[] }>('/audit'),
  refreshCharts: () => request('/charts/refresh', 'POST'),

  // Charts are per-user and need the auth header, so fetch as a blob URL
  getChartUrl: async (name: string): Promise<string | null> => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/charts/${name}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok ? URL.createObjectURL(await res.blob()) : null;
  },
};
