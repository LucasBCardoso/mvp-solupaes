import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from './auth';

const baseURL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const newToken = await (refreshing ??= refreshAccess());
        refreshing = null;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        refreshing = null;
        useAuthStore.getState().logout();
        throw err;
      }
    }
    throw err;
  },
);

async function refreshAccess(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error('Sem refresh token');
  const { data } = await axios.post<{ data: { accessToken: string; refreshToken: string } }>(
    `${baseURL}/auth/refresh`,
    { refreshToken },
  );
  useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
  return data.data.accessToken;
}

export interface ApiOk<T> {
  success: true;
  data: T;
  meta?: { total?: number; page?: number; limit?: number };
}
