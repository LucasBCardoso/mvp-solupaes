# API — Solupães

Base URL local: `http://localhost:4000`
Auth: Bearer JWT (`Authorization: Bearer <accessToken>`)
Formato de resposta:
```json
{ "success": true, "data": <T>, "meta"?: { "total": n, "page": n, "limit": n } }
```
Erros: `{ "success": false, "error": "mensagem", "details"?: ... }`

## Autenticação

### POST /auth/login
```json
{ "email": "gestor@ouropaes.com.br", "password": "<senha-do-usuario>" }
```
**200**:
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { "id":"...", "email":"...", "name":"...", "role":"GESTOR", "active":true, "createdAt":"...", "lastLoginAt":null }
  }
}
```
**Rate limit**: 5/min/IP.

### POST /auth/refresh
```json
{ "refreshToken": "..." }
```
Rotaciona o par. **Refresh antigo é invalidado** — reusá-lo retorna 401 e gera audit `user.refresh.token_reuse`.

### POST /auth/logout
Invalida o refresh atual.

### GET /auth/me
Retorna o usuário do token.

## Usuários (GESTOR/ADMIN)

- `GET /users` — lista todos
- `POST /users` — cria (campos: email, name, password, role)
- `PATCH /users/:id` — atualiza nome/role/active/password
- `DELETE /users/:id` — soft-delete (active=false + refresh limpo)

## Clientes

- `GET /clients?search=` — busca por nome/razão/cidade
- `GET /clients/:id` — inclui últimas 50 visitas e estratégias
- `POST /clients` — cria manualmente (geralmente é criado automático no `/visits`)
- `PATCH /clients/:id` — atualiza

## Visitas

- `GET /visits?representativeId=&classification=&fromDate=&toDate=&geoBox=&page=&limit=`
- `GET /visits/:id`
- `POST /visits` — corpo:
```json
{
  "clientUuid": "uuid-v4",
  "fantasyName": "Padaria X",
  "addressLine": "Rua Y, 100",
  "lat": -29.5, "lng": -52.5,
  "facadePhotoKey": "facades/uuid-ts.jpg",
  "worksWithFrozen": true,
  "currentSupplier": "Concorrente",
  "dailyVolume": 50,
  "currentPrice": 16.5,
  "equipmentLent": ["Freezer"],
  "observations": "Cliente interessado",
  "visitedAt": "2026-05-26T22:30:00Z"
}
```
**Score e classificação são calculados pelo servidor.**

- `POST /visits/sync` — batch (até 50):
```json
{ "visits": [ ...mesmos campos do POST /visits ] }
```
**Idempotente** via `clientUuid` (upsert). Retorna array com status individual de cada item.

## Estratégias

- `GET /strategies?status=PROPOSED` — lista
- `POST /strategies` (GESTOR) — criar manualmente
- `PATCH /strategies/:id` (GESTOR) — mudar status/follow-up/título

## Uploads (foto da fachada)

### POST /uploads/facade
```json
{ "clientUuid": "uuid-v4", "contentType": "image/jpeg", "size": 123456 }
```
**200**:
```json
{ "success": true, "data": { "uploadUrl": "https://...r2.cloudflarestorage.com/...", "key": "facades/uuid-ts.jpg", "expiresIn": 300 } }
```
Cliente faz `PUT` na `uploadUrl` com `Content-Type` e bytes da imagem. URL expira em 5min.

## Dashboard (todos os papéis; rep só vê próprias visitas)

- `GET /dashboard/summary` — KPIs e top oportunidades
- `GET /dashboard/map` — pontos para o mapa (até 2000)

## Códigos de erro

| Status | Significado |
|---|---|
| 400 | Validação Zod falhou — ver `details.fieldErrors` |
| 401 | Token ausente, expirado ou inválido |
| 403 | Papel sem permissão para o recurso |
| 404 | Recurso inexistente OU sem permissão de leitura (rep tentando ler visita alheia) |
| 409 | Conflito (e-mail duplicado, auto-desativação) |
| 429 | Rate limit (login ou global) |
| 500 | Erro interno (gravado em Sentry + pino) |
