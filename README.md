# Solupães

Plataforma SaaS de **gestão inteligente de informações comerciais em campo**.
MVP desenvolvido para o cliente piloto **Ouro Pães** — distribuidora de panificação congelada
do Rio Grande do Sul, com filial em Palhoça-SC.

## Visão geral

Substitui o registro em papel de visitas comerciais por um sistema integrado que:
- coleta dados padronizados em campo (representante via app móvel),
- gera score de viabilidade e estratégias automatizadas (engine + IA opcional),
- entrega ao gestor um painel web com mapa, dashboard e Kanban de estratégias,
- funciona **offline-first** para áreas com sinal ruim.

## Stack

| Camada | Tecnologia |
|---|---|
| Mobile (representante) | React Native + Expo SDK 51 (managed) + NativeWind + expo-sqlite |
| Web (gestor) | React 19 + Vite + Tailwind 4 + shadcn/ui + Leaflet |
| API | Node.js + Express + Prisma + Zod + JWT + argon2 |
| Banco | PostgreSQL (Docker local em dev, Railway em produção) |
| Storage | Cloudflare R2 (S3-compatível) |
| Mapa | Leaflet + OpenStreetMap |
| Hospedagem | Vercel (web) + Railway (api/db) + EAS Build (mobile) |
| Observabilidade | Sentry + pino |

## Estrutura (monorepo pnpm)

```
solupaes/
├── apps/
│   ├── web/        # Backoffice do gestor
│   └── mobile/     # App nativo do representante
├── packages/
│   ├── api/        # Backend Express + Prisma
│   └── shared/     # Tipos, Zod schemas, score engine
├── scripts/        # Bootstrap, túnel, utilidades
└── docs/           # Documentação técnica
```

## Quickstart (1 comando)

**Pré-requisitos**: Node ≥ 20, pnpm 9, Docker Desktop rodando.

```bash
./scripts/start-dev.sh
```

Isso sobe o Postgres, instala deps, gera Prisma, migra, popula dados de demo (5 usuários,
15 estabelecimentos em RS+SC, 17 visitas e ~50 estratégias) e te diz o próximo comando.

Depois:
```bash
pnpm dev            # api (4000) + web (5173)
pnpm dev:mobile     # app Expo (em outro terminal)
```

Abra **http://localhost:5173** e logue:

| Email | Papel |
|---|---|
| `gestor@ouropaes.com.br` | Gestor — vê tudo |
| `carlos@ouropaes.com.br` | Representante (Rio Grande/Pelotas) |
| `ana@ouropaes.com.br` | Representante (Palhoça) |
| `roberto@ouropaes.com.br` | Representante (Florianópolis) |
| `admin@solupaes.com.br` | Admin Solupães |

Senha de todos: o valor que você definiu em `SEED_PASSWORD` no `packages/api/.env`
(o `.env` é local e nunca vai pro git — defina antes de rodar o seed).

## Modos de execução

| Modo | Quem acessa | Setup |
|---|---|---|
| **Localhost** | Você no navegador | `pnpm dev` |
| **Rede local** | Mobile na mesma Wi-Fi | Use `./scripts/show-ip.sh` para pegar o IP |
| **Cloudflare Tunnel** | Qualquer pessoa, enquanto sua máquina estiver ligada | `./scripts/tunnel.sh` |

Ver guia completo: **[docs/LOCAL_DEPLOYMENT.md](docs/LOCAL_DEPLOYMENT.md)**.

## Documentação

- [docs/LOCAL_DEPLOYMENT.md](docs/LOCAL_DEPLOYMENT.md) — **comece por aqui** (deploy local + túnel + APK)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — decisões e diagramas
- [docs/API.md](docs/API.md) — endpoints e contratos REST
- [docs/SECURITY.md](docs/SECURITY.md) — threat model e LGPD
- [docs/SCORE_ENGINE.md](docs/SCORE_ENGINE.md) — regras de viabilidade Ouro Pães
- [docs/OFFLINE_SYNC.md](docs/OFFLINE_SYNC.md) — fluxo offline-first
- [docs/ONBOARDING.md](docs/ONBOARDING.md) — guia para gestor e representante

## Scripts úteis

| Comando | O que faz |
|---|---|
| `./scripts/start-dev.sh` | Setup completo (1ª vez) |
| `./scripts/tunnel.sh` | Expõe API via Cloudflare Tunnel |
| `./scripts/show-ip.sh` | Mostra IP local para mobile dev |
| `./scripts/reset-db.sh` | Zera o banco e re-aplica seed |
| `pnpm dev` | API + Web em paralelo |
| `pnpm dev:mobile` | App Expo |
| `pnpm db:studio` | GUI do banco (Prisma Studio) |
| `pnpm typecheck` | TypeScript --noEmit em tudo |
| `pnpm test` | Vitest em tudo |

## Licença

Proprietária — Solupães Tecnologia Ltda.
