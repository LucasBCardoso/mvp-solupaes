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
| Mobile (representante) | React Native 0.81 + Expo SDK 54 (managed) + expo-router 6 + NativeWind + expo-sqlite |
| Web (gestor) | React 19 + Vite + Tailwind 4 + shadcn/ui + Leaflet |
| API | Node.js + Express + Prisma + Zod + JWT + argon2 |
| Banco | PostgreSQL 16 (Docker local em dev, Railway em produção) |
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

## Pré-requisitos

- **Node.js** ≥ 20.10 (recomendo via `nvm use` — há um `.nvmrc`)
- **pnpm** ≥ 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- **Docker Desktop** rodando (para o Postgres local)
- **Expo Go** instalado no celular (Android Play Store / iOS App Store) — versão compatível com **SDK 54**

## Quickstart (1 comando)

```bash
./scripts/start-dev.sh
```

Sobe o Postgres, instala deps, gera Prisma, migra, popula dados de demo (5 usuários,
15 estabelecimentos em RS+SC, 17 visitas e ~50 estratégias) e te diz o próximo comando.

Se preferir entender cada etapa ou não quiser usar o script, siga o **Setup manual** abaixo.

---

## Setup manual passo a passo

### 1. Subir o Postgres com Docker

O `docker-compose.yml` na raiz já está configurado (Postgres 16, porta `5432`, healthcheck, volume nomeado).

```bash
docker compose up -d                              # sobe em background
docker compose ps                                 # confere status (deve estar "healthy")
docker compose logs -f postgres                   # opcional: acompanhar logs
```

Credenciais do banco local (já refletidas no `DATABASE_URL` do `.env.example`):
- host: `localhost` • porta: `5432`
- user: `postgres` • senha: `postgres` • db: `solupaes`

Para zerar tudo (volume + dados): `docker compose down -v`.

### 2. Configurar o .env da API

```bash
cp packages/api/.env.example packages/api/.env
```

Edite `packages/api/.env` e ajuste os campos abaixo (os outros podem ficar como estão para dev):

| Variável | Como gerar |
|---|---|
| `JWT_SECRET` | `openssl rand -base64 64` |
| `REFRESH_SECRET` | `openssl rand -base64 64` (diferente do JWT_SECRET) |
| `SEED_PASSWORD` | qualquer senha com ≥ 8 caracteres — é a senha dos usuários do seed |

Macete one-liner (preenche os 3 e mostra a senha que ficou):
```bash
JWT=$(openssl rand -base64 64 | tr -d '\n')
REF=$(openssl rand -base64 64 | tr -d '\n')
sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=\"$JWT\"|" packages/api/.env
sed -i '' "s|^REFRESH_SECRET=.*|REFRESH_SECRET=\"$REF\"|" packages/api/.env
sed -i '' 's|^SEED_PASSWORD=.*|SEED_PASSWORD="Senha@123"|' packages/api/.env
echo "SEED_PASSWORD=Senha@123"
```
(em Linux, use `sed -i` sem o `''`)

### 3. Instalar deps e preparar o banco

```bash
pnpm install                # instala todo o monorepo
pnpm db:migrate             # aplica as migrations do Prisma
pnpm db:seed                # popula usuários + clientes + visitas demo
```

### 4. Rodar o sistema web (e a API)

Em um terminal, da raiz do repo:

```bash
pnpm dev                    # API em :4000 + Web em :5173 em paralelo
```

Abra **http://localhost:5173** e logue com qualquer credencial abaixo (senha = o valor de `SEED_PASSWORD`):

| Email | Papel |
|---|---|
| `gestor@ouropaes.com.br` | Gestor — vê tudo |
| `carlos@ouropaes.com.br` | Representante (Rio Grande/Pelotas) |
| `ana@ouropaes.com.br` | Representante (Palhoça) |
| `roberto@ouropaes.com.br` | Representante (Florianópolis) |
| `admin@solupaes.com.br` | Admin Solupães |

Sanity check rápido:
```bash
curl http://localhost:4000/health
# {"success":true,"data":{"status":"ok","ts":"..."}}
```

Para rodar isolado:
- só API: `pnpm dev:api`
- só Web: `pnpm dev:web`
- Prisma Studio (GUI do banco): `pnpm db:studio`

### 5. Rodar o app mobile com Expo Go

**A coisa mais importante**: em dispositivo físico (e até no emulador Android), `localhost` aponta pro **celular**, não pro seu Mac/PC. Você precisa apontar a app pro **IP da sua máquina na LAN**.

#### 5.1. Descobrir o IP da máquina

```bash
./scripts/show-ip.sh        # script do repo
# ou manualmente:
ipconfig getifaddr en0      # macOS Wi-Fi
hostname -I | awk '{print $1}'  # Linux
```

Vamos supor que retornou `192.168.0.42`.

#### 5.2. Apontar o app pra esse IP

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Edite `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL="http://192.168.0.42:4000"
```

> No Android Studio Emulator (não em device físico), use `http://10.0.2.2:4000` — alias do host.
> No iOS Simulator (rodando no mesmo Mac da API), `http://localhost:4000` funciona.

#### 5.3. Iniciar o Metro

Em outro terminal:
```bash
pnpm dev:mobile             # equivalente a: cd apps/mobile && pnpm start
```

Aparece um QR Code no terminal e em http://localhost:8081.

#### 5.4. Abrir no celular

- **Android (Expo Go)**: abra o Expo Go → "Scan QR code" → mira o QR do terminal.
- **iOS (Expo Go)**: abra a câmera nativa do iPhone → aponta pro QR → toca no banner que aparece → abre no Expo Go.

Login no app: mesma conta da web (ex.: `carlos@ouropaes.com.br` + senha do `SEED_PASSWORD`).

#### 5.5. Troubleshooting do mobile

| Sintoma | Causa provável | Solução |
|---|---|---|
| **"Network request failed"** ao logar | `EXPO_PUBLIC_API_URL` aponta pra `localhost` | Trocar pelo IP LAN do passo 5.1 + reiniciar Metro com `--clear` |
| App fica preso na tela de login após login bem-sucedido | Cache de bundle antigo | `pnpm dev:mobile -- --clear` |
| Não acha o IP / Wi-Fi público com isolamento | Roteador bloqueia comunicação entre dispositivos | Use túnel: `pnpm dev:mobile -- --tunnel` (Expo cria URL ngrok) |
| Expo Go reclama da versão | App store do celular tem Expo Go ≠ SDK 54 | Atualiza o Expo Go ou usa `expo-dev-client` (advanced) |
| Mudou o `.env` e nada muda | Vars `EXPO_PUBLIC_*` entram no bundle em build | Sempre reinicia Metro com `--clear` após editar `.env` |

---

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
