# Offline-First — Mobile

## Por quê

Q&A com Ouro Pães: *"tem comércios na região que ficam em área com sinal ruim"*. Perder uma visita por sinal ruim significa custo de combustível e tempo desperdiçado — o problema #1 que o sistema deve resolver.

## Camadas

### 1. Persistência local (`expo-sqlite`)

`apps/mobile/src/lib/db.ts`:

```sql
CREATE TABLE visits_outbox (
  client_uuid    TEXT PRIMARY KEY,
  payload_json   TEXT NOT NULL,
  photo_uri      TEXT,
  attempts       INTEGER DEFAULT 0,
  last_error     TEXT,
  created_at     INTEGER NOT NULL
);

CREATE TABLE visits_cache (
  id                TEXT PRIMARY KEY,
  client_uuid       TEXT NOT NULL,
  fantasy_name      TEXT NOT NULL,
  classification    TEXT NOT NULL,
  viability_score   INTEGER NOT NULL,
  visited_at        TEXT NOT NULL,
  status            TEXT NOT NULL
);
```

### 2. Idempotência (`clientUuid`)

Cada nova visita gera `uuidv4()` no aparelho **antes** do envio. O servidor faz:
```ts
prisma.visit.upsert({ where: { clientUuid }, create: {...}, update: {...} })
```
→ reenvio do mobile **não duplica**.

### 3. Detecção de rede (`@react-native-community/netinfo`)

```ts
NetInfo.addEventListener((state) => {
  if (state.isConnected && state.isInternetReachable) processOutbox()
});
```
Listener fica ativo durante toda a vida do app (registrado em `app/_layout.tsx`).

### 4. Sync engine (`apps/mobile/src/lib/sync.ts`)

Para cada item em `visits_outbox`:
1. Se tem `photo_uri`:
   - `POST /uploads/facade` → recebe `uploadUrl` pré-assinada (5min)
   - `PUT` na URL com bytes da imagem (depois de `compressImage`: 1024px / qualidade 0.7)
   - Anexa `facadePhotoKey` no payload
2. `POST /visits` com payload completo
3. Em sucesso: insere em `visits_cache`, remove de `visits_outbox`
4. Em falha:
   - Incrementa `attempts`
   - Grava `last_error`
   - Próxima janela de retry (exponencial) — atual: dispara junto à próxima mudança de rede

## Conflict resolution

| Campo | Vencedor |
|---|---|
| Dados preenchidos pelo rep | **Cliente** (sempre) |
| `viabilityScore` | **Servidor** (autoritativo) |
| `classification` | **Servidor** |
| `status` | **Servidor** |
| `syncedAt` | **Servidor** |

Score do cliente é descartado — servidor recalcula a partir do mesmo `@solupaes/shared/score.ts` para garantir consistência.

## UX da fila

Tela `apps/mobile/app/(tabs)/fila-sync.tsx`:
- Mostra cards de cada item pendente com `attempts` e `last_error`
- Botão "Tentar enviar agora" força `processOutbox`
- Cada card tem opção "Descartar" (com confirmação) caso a visita esteja inválida

## Falhas conhecidas e mitigações

| Cenário | Comportamento |
|---|---|
| App fechado durante sync | OK — outbox persiste; próxima abertura reativa NetInfo dispara sync |
| Foto > 5MB | `compressImage` reduz para <500KB; se ainda exceder, server rejeita com 400 e visita fica em outbox com erro claro |
| Permissão de câmera negada | Visita pode ser enviada sem foto; score perde 5 pontos |
| Permissão de GPS negada | Idem; visita ainda válida, sem marcador no mapa do gestor |
| Token expirou no meio do sync | `apiFetch` faz refresh automaticamente; falha → outbox preserva tudo |
| Servidor offline | `attempts++`; usuário pode forçar retry mais tarde |

## Background sync (roadmap)

No MVP: sync acontece em **foreground** (com o app aberto).
v1.1: adicionar `expo-background-fetch` + `expo-task-manager` para tentar sync periódico mesmo com app fechado (limitado pelo OS, especialmente iOS).
