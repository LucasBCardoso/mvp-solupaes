import { apiFetch } from './api';
import { saveSession, clearSession } from './secureStore';
import { setAuthed } from './sessionState';
import type { User } from '@solupaes/shared';

export async function login(email: string, password: string): Promise<User> {
  const data = await apiFetch<{ accessToken: string; refreshToken: string; user: User }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    },
  );
  await saveSession(data.accessToken, data.refreshToken, data.user);
  setAuthed(true);
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
  await clearSession();
  setAuthed(false);
}
