# Segurança — Solupães

## Threat model (resumo)

| Ativo | Ameaça | Mitigação |
|---|---|---|
| Senhas de usuário | Vazamento de hash | argon2id, sem reuso entre apps |
| Token de acesso | Roubo (sniff/xss/extension) | TTL curto (15min), HTTPS-only |
| Refresh token | Roubo persistente | Rotação a cada uso; reuso detectado → 401 + audit |
| Dados comerciais | Acesso cross-rep | RBAC + filtro automático no `visits.ts` |
| Fotos de fachada | Acesso público | Bucket R2 privado + URL pré-assinada (1h) |
| Endpoint público | Brute force login | Rate limit 5/min/IP |
| Endpoint público | DoS leve | Rate limit global 300/min/IP |
| Banco de dados | SQL injection | Prisma (sem raw queries com interpolação) |
| Front | XSS | React escapa por padrão; nada de `dangerouslySetInnerHTML` |
| Upload | Abuso (executável) | Whitelist `image/jpeg|png|webp`, tamanho ≤ 5MB |
| Configuração | Vazamento de secrets | `.env` no `.gitignore`; validação no boot |
| Sessão | CSRF | Tokens em Authorization header (não em cookie) |

## Controles implementados

### Autenticação
- **Hash**: argon2id (`type: argon2.argon2id`), parâmetros padrão da lib
- **Access token**: HS256, TTL 15min, payload mínimo (`sub`, `email`, `role`)
- **Refresh token**: HS256 separado, TTL 7d, `jti` aleatório, rotação obrigatória
- **Detecção de reuso**: refresh antigo após troca → 401 + `audit_log.action = user.refresh.token_reuse`

### Autorização
- `requireRole(...)` declarativo por rota
- `requireGestor` (ADMIN|GESTOR) vs `requireAuth` (todos)
- Filtro automático em `/visits` quando `role === REPRESENTANTE` — só vê próprias visitas
- Operação cross-rep retorna **404** (não 403), para não vazar existência

### Validação
- **100% das mutações** usam `validate(zodSchema)` antes da rota
- Inputs normalizados (trim, toLowerCase em emails) no schema
- Tamanhos máximos em todos os campos texto

### Rate limit
- `loginRateLimit`: 5 req/min/IP em `/auth/login`
- `globalRateLimit`: 300 req/min/IP em toda a API

### Headers HTTP
- `helmet()` aplicado globalmente
- CORS com whitelist explícita via `CORS_ORIGINS`

### Storage de fotos
- Bucket R2 **privado**
- Upload via URL pré-assinada (5min de validade, PUT only)
- Download via URL pré-assinada (1h) — não há link permanente
- Server-side: validação de `contentType` no schema Zod

### Audit log
Registrado para: login (sucesso e falha), logout, troca de senha, criação/atualização de usuário, criação de visita, criação/atualização de estratégia, presign de upload, detecção de reuso de refresh.

Campos: `userId`, `action`, `entity`, `entityId`, `ipAddress`, `userAgent`, `metadata` (JSON), `createdAt`.

### Logs
- `pino` com nível configurável via env
- **Redaction**: `req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.passwordHash`, `*.refreshToken`

## Secret management

| Variável | Onde | Como rotacionar |
|---|---|---|
| `JWT_SECRET` | Railway env | Gere novo com `openssl rand -base64 64`; deploy provoca logout de todos |
| `REFRESH_SECRET` | Railway env | Mesma rotação acima |
| `R2_SECRET_ACCESS_KEY` | Railway env | Painel Cloudflare → gerar nova chave → atualizar env → revogar antiga |
| `DATABASE_URL` | Railway env | Auto-gerenciado pelo Railway PG |
| `GEMINI_API_KEY` | Railway env (opt) | Google AI Studio |

**Nenhum secret deve aparecer em commit.** Hooks de pre-commit (gitleaks) recomendados em iteração futura.

## LGPD

- **Base legal**: execução de contrato (Ouro Pães é responsável; Solupães é operadora)
- **Dados pessoais coletados**:
  - Funcionários Ouro Pães: nome, email, papel
  - Clientes Ouro Pães (B2B): nome fantasia, CNPJ, telefone, endereço (não há dado pessoal de pessoa física como regra)
- **Direitos**:
  - Acesso: `GET /auth/me`, painel do gestor
  - Exclusão: `DELETE /users/:id` (soft-delete + anonimização do `repName` nas visitas históricas)
  - Correção: `PATCH /users/:id`, `PATCH /clients/:id`
- **Retenção**: visitas mantidas por 5 anos (regra comercial); audit log mantido por 2 anos
- **Vazamento**: incidente → notificar Ouro Pães em 24h → ANPD se aplicável

## Checklist pré-deploy

- [ ] `JWT_SECRET` e `REFRESH_SECRET` rotacionados, ≥ 64 bytes, randômicos
- [ ] `CORS_ORIGINS` contém apenas domínios de produção
- [ ] `NODE_ENV=production`
- [ ] HTTPS forçado (Railway/Vercel cuidam por padrão)
- [ ] Backup automático do Postgres ativo (Railway nativo)
- [ ] Sentry DSN configurado
- [ ] Rate limit verificado em produção
- [ ] Headers de segurança verificados em https://securityheaders.com
- [ ] `npm audit` sem CVEs HIGH/CRITICAL
