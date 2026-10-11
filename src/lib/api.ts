import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';

/** Server origin. Override with EXPO_PUBLIC_API_URL (see .env.example). */
export const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://attendance.bots.ng').replace(/\/$/, '');

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // the native cookie jar keeps the Django session between launches
  timeout: 30_000,
  headers: {
    // Django's CSRF check compares Origin/Referer on HTTPS, which native clients don't send by default.
    Origin: BASE_URL,
    Referer: `${BASE_URL}/`,
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': `NASRDA-Attendance-Mobile/1.0 (${Platform.OS})`,
  },
});

let csrfToken = '';
const capture = (headers: unknown) => {
  const raw = (headers as Record<string, unknown> | undefined)?.['set-cookie'];
  const text = Array.isArray(raw) ? raw.join(';') : String(raw ?? '');
  const match = /csrftoken=([^;,\s]+)/.exec(text);
  if (match) csrfToken = match[1];
};

let priming: Promise<unknown> | null = null;
const primeCsrf = () => (priming ??= api.get('/auth/me/').finally(() => (priming = null)));

api.interceptors.request.use(async (cfg) => {
  if (!csrfToken && cfg.method !== 'get' && !cfg.url?.includes('/auth/me/')) await primeCsrf();
  if (csrfToken) cfg.headers['X-CSRFToken'] = csrfToken;
  return cfg;
});

// ---- Session expiry --------------------------------------------------------------------
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

api.interceptors.response.use(
  (res) => { capture(res.headers); return res; },
  (err: AxiosError<any>) => {
    capture(err.response?.headers);
    const detail = String(err.response?.data?.detail ?? '');
    const expired = (err.response?.status === 401 || err.response?.status === 403) && /credentials were not provided|not authenticated/i.test(detail);
    if (expired) onUnauthorized?.();
    return Promise.reject(err);
  },
);

// ---- Errors ----------------------------------------------------------------------------
export type ApiError = { code: string; message: string };

/**
 * Normalises the two error shapes the backend returns: our DomainError `{code, message}`
 * and DRF validation errors (`{field: ["msg"]}` / `{detail}`), plus network failures.
 */
export const errorOf = (e: any): ApiError => {
  const data = e?.response?.data;
  if (data?.code && data?.message) return data;
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return { code: 'VALIDATION', message: data.detail };
    const parts = Object.entries(data).flatMap(([field, msgs]) =>
      (Array.isArray(msgs) ? msgs : [msgs]).map((m) => (field === 'non_field_errors' ? String(m) : `${field}: ${m}`)),
    );
    if (parts.length) return { code: 'VALIDATION', message: parts.join(' ') };
  }
  if (!e?.response && (e?.code === 'ERR_NETWORK' || e?.code === 'ECONNABORTED' || e?.message === 'Network Error'))
    return { code: 'OFFLINE', message: 'Internet connection is required to verify and record attendance.' };
  if (e?.code && e?.message && !e?.response && !e?.isAxiosError) return { code: e.code, message: e.message };
  return { code: e?.code ?? 'UNKNOWN', message: e?.message ?? 'Something went wrong. Please try again.' };
};
