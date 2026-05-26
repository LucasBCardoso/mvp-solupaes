import NetInfo from '@react-native-community/netinfo';
import { apiFetch, BASE_URL } from './api';
import {
  initDb,
  listOutbox,
  markOutboxFailure,
  removeFromOutbox,
  upsertVisitCache,
} from './db';
import { loadSession } from './secureStore';
import type { Visit } from '@solupaes/shared';

let processing = false;

async function uploadPhoto(localUri: string, clientUuid: string, contentType: string): Promise<string> {
  const head = await apiFetch<{ uploadUrl: string; key: string }>(`/uploads/facade`, {
    method: 'POST',
    body: JSON.stringify({
      clientUuid,
      contentType,
      size: 0,
    }),
  });

  const fileResponse = await fetch(localUri);
  const blob = await fileResponse.blob();

  const { accessToken } = await loadSession();
  const uploadRes = await fetch(head.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, ...(accessToken ? {} : {}) },
    body: blob,
  });
  if (!uploadRes.ok) throw new Error(`Falha ao subir foto: ${uploadRes.status}`);
  return head.key;
}

export async function processOutbox(): Promise<{ processed: number; failed: number }> {
  if (processing) return { processed: 0, failed: 0 };
  initDb();
  processing = true;
  let processed = 0;
  let failed = 0;
  try {
    const items = listOutbox();
    for (const item of items) {
      try {
        const payload = JSON.parse(item.payload_json) as Record<string, unknown>;
        if (item.photo_uri) {
          const ext = item.photo_uri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
          try {
            const key = await uploadPhoto(
              item.photo_uri,
              item.client_uuid,
              ext === 'png' ? 'image/png' : 'image/jpeg',
            );
            payload.facadePhotoKey = key;
          } catch (err) {
            // continua sem foto (server aceita) e marca tentativa
            markOutboxFailure(
              item.client_uuid,
              `foto: ${err instanceof Error ? err.message : 'erro'}`,
            );
            failed += 1;
            continue;
          }
        }

        const visit = await apiFetch<Visit>('/visits', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        upsertVisitCache({
          id: visit.id,
          client_uuid: visit.clientUuid,
          fantasy_name: visit.fantasyName,
          classification: visit.classification,
          viability_score: visit.viabilityScore,
          visited_at: visit.visitedAt,
          status: visit.status,
        });

        removeFromOutbox(item.client_uuid);
        processed += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'erro';
        markOutboxFailure(item.client_uuid, msg);
        failed += 1;
      }
    }
  } finally {
    processing = false;
  }
  return { processed, failed };
}

export function startNetworkWatcher(onChange: (online: boolean) => void): () => void {
  const unsub = NetInfo.addEventListener((state) => {
    const online = !!state.isConnected && state.isInternetReachable !== false;
    onChange(online);
    if (online) {
      processOutbox().catch(() => undefined);
    }
  });
  return unsub;
}

export { BASE_URL };
