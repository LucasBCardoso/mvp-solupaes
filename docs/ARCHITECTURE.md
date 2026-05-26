# Arquitetura — Solupães

## Visão de alto nível

O sistema é dividido em **três aplicações independentes** comunicando via API REST sobre HTTPS, com autenticação JWT:

```
┌──────────────────────┐        ┌──────────────────────┐
│  apps/mobile         │        │  apps/web            │
│  Expo SDK 51         │        │  React + Vite        │
│  (Representante)     │        │  (Gestor / Admin)    │
└──────────┬───────────┘        └──────────┬───────────┘
           │ Bearer JWT (15min)            │ Bearer JWT
           │ Refresh rotacionado (7d)      │
           └──────────────┬────────────────┘
                          ▼
              ┌───────────────────────┐
              │  packages/api         │
              │  Express + Prisma     │
              │  Zod + argon2 + JWT   │
              └──────────┬────────────┘
                         ▼
              ┌───────────────────────┐
              │  PostgreSQL (Railway) │
              │  + Cloudflare R2      │
              └───────────────────────┘
```

## Princípios

1. **Offline-first no mobile**: nenhuma visita é perdida por falta de sinal. SQLite + fila de envio com idempotência.
2. **Score como contrato**: o algoritmo de viabilidade vive em `packages/shared` e é executado tanto no mobile (para feedback imediato) quanto no servidor (autoridade final).
3. **Segurança por padrão**: validação 100% no boundary (Zod), RBAC declarativo, audit log obrigatório em mutações, refresh token rotacionado e hashado.
4. **Single-tenant agora, multi-tenant amanhã**: schema sem `tenantId`, mas tipos e middlewares isolados o suficiente para adicionar uma coluna opcional + filtro em pouco esforço.
5. **Reuso máximo**: tipos, schemas Zod, score e proposta de estratégia são compartilhados via `@solupaes/shared`.

## Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| Mobile | Expo SDK 51 + expo-router | Loja oficial (Play/App), câmera/GPS nativos, EAS Build |
| Mobile UI | NativeWind (Tailwind no RN) | DX consistente com o web |
| Mobile offline | expo-sqlite | API síncrona simples; suficiente p/ outbox |
| Web | React 19 + Vite + Tailwind 4 | Continuidade do protótipo existente |
| Mapa | Leaflet + OSM | Zero custo; clusters via leaflet.markercluster |
| API | Express + Prisma + Zod | Maturidade do time, ecossistema |
| Auth | JWT (HS256) + argon2id | Padrão atual; refresh rotacionado |
| DB | PostgreSQL (Railway) | Relacional, JSON nativo, full-text |
| Storage | Cloudflare R2 | S3-compatible, custo zero até dezenas de GB |
| IA (opt-in) | Gemini 1.5 Flash | Reuso da dep já presente; barato |
| Logs | pino + pino-http | Estruturado, performance |
| Observabilidade | Sentry (3 projetos) | Stack trace em web/mobile/api |

## Fluxos críticos

### Login (Web/Mobile)
1. Cliente envia `POST /auth/login` com email/senha
2. API verifica `argon2.verify(hash, plain)`
3. API assina access (15min) + refresh (7d) e grava `sha256(refresh)` em `User.refreshTokenHash`
4. Cliente persiste em `SecureStore` (mobile) ou `localStorage` via zustand-persist (web)

### Refresh
1. Quando access expira, cliente chama `POST /auth/refresh` com refresh atual
2. API compara `sha256(refresh)` com o salvo; se ok, **rotaciona** (gera novo par + sobrescreve hash)
3. Reuso de refresh antigo → 401 + audit `user.refresh.token_reuse` (sinal de roubo)

### Cadastro de visita offline
1. Rep preenche formulário → `insertOutbox` (SQLite)
2. Foto capturada → `compressImage` → URI local salva
3. `NetInfo` detecta conexão → `processOutbox`:
   - `POST /uploads/facade` → URL pré-assinada R2
   - `PUT` na URL com a foto
   - `POST /visits` com `clientUuid` (idempotente via `@@unique`)
   - Servidor calcula score **autoritativo** (não confia no payload)
   - Servidor gera estratégias automáticas via `strategyEngine`
4. Em caso de sucesso: remove de outbox, insere em `visits_cache`
5. Em falha: incrementa `attempts`, registra `last_error`

### Score & estratégia
- Cálculo em `@solupaes/shared/score.ts` (puro, testável, sem deps)
- API NÃO aceita score vindo do cliente — recalcula sempre
- `strategyEngine` gera 1-5 propostas baseadas em regras (volume, preço, equipamentos, mercado novo)
- Se `ENABLE_AI_STRATEGY=true` e `GEMINI_API_KEY` presente, descrições são enriquecidas via Gemini 1.5 Flash; falha silenciosa volta às regras

## Decisões registradas (ADR resumido)

| # | Decisão | Motivo |
|---|---|---|
| 1 | Expo (managed) em vez de PWA | Cliente solicitou app nativo; melhor câmera e background |
| 2 | Single-tenant inicial | MVP enxuto; schema admite multi-tenant futuro |
| 3 | Leaflet/OSM em vez de Mapbox | Zero custo; suficiente para densidade de visitas atual |
| 4 | Cloudflare R2 em vez de Supabase Storage | Plano gratuito mais generoso; ferramentas S3 padrão |
| 5 | argon2id em vez de bcrypt | Recomendação OWASP atual; melhor resistência a GPU |
| 6 | Refresh token rotacionado | Detecta reuso (token roubado) automaticamente |
| 7 | Score server-side autoritativo | Cliente não pode falsificar classificação |
| 8 | `clientUuid` como chave de idempotência | Reenvio do mobile não duplica registros |

Veja também: [SECURITY.md](./SECURITY.md), [SCORE_ENGINE.md](./SCORE_ENGINE.md), [OFFLINE_SYNC.md](./OFFLINE_SYNC.md).
