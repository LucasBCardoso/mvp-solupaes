import { loadSession, updateTokens, clearSession } from './secureStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

let refreshing: Promise<string | null> | null = null;

async function attemptRefresh(): Promise<string | null> {
  const { refreshToken } = await loadSession();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
    if (!json.success || !json.data) return null;
    await updateTokens(json.data.accessToken, json.data.refreshToken);
    return json.data.accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const { skipAuth, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (!headers.has('Content-Type') && rest.body) headers.set('Content-Type', 'application/json');

  if (!skipAuth) {
    const { accessToken } = await loadSession();
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const doRequest = async () =>
    fetch(`${BASE_URL}${path}`, { ...rest, headers });

  let res = await doRequest();

  if (res.status === 401 && !skipAuth) {
    const newToken = await (refreshing ??= attemptRefresh());
    refreshing = null;
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`${BASE_URL}${path}`, { ...rest, headers });
    } else {
      await clearSession();
      throw new ApiError(401, 'Sessão expirada', null);
    }
  }

  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Erro ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  const ok = body as ApiResponse<T>;
  if (!ok.success || ok.data === undefined) {
    throw new ApiError(res.status, ok.error ?? 'Resposta inválida', body);
  }
  return ok.data;
}

export { ApiError, BASE_URL };
