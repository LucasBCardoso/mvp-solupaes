import { useSyncExternalStore } from 'react';
import { loadSession } from './secureStore';

type SessionState = {
  authed: boolean;
  loaded: boolean;
};

let state: SessionState = { authed: false, loaded: false };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(next: SessionState) {
  state = next;
  emit();
}

export async function bootstrapSession(): Promise<void> {
  const { accessToken } = await loadSession();
  setState({ authed: !!accessToken, loaded: true });
}

export function setAuthed(authed: boolean): void {
  setState({ ...state, authed });
}

export function useSessionState(): SessionState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => state,
    () => state,
  );
}
