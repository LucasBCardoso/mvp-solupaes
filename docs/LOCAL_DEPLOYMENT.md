# Deploy Local & Cloudflare Tunnel

Este guia cobre os **3 modos** de rodar o Solupães na sua máquina, do mais simples ao mais aberto:

| Modo | Cenário | Quem acessa |
|---|---|---|
| **1. Localhost** | Desenvolvimento solo | Só você, no seu navegador |
| **2. Rede local (IP)** | Testar o mobile na mesma Wi-Fi | Você + seu celular Android/iPhone na mesma rede |
| **3. Cloudflare Tunnel** | Demo externa (investidor, cliente, beta tester) | Qualquer pessoa no mundo, enquanto seu servidor estiver ligado |

O banco **Postgres roda na sua máquina** (container Docker) em todos os modos — você é dono dos dados.

---

## Pré-requisitos (uma vez só)

- **Node.js ≥ 20** + **pnpm 9** (`npm i -g pnpm`)
- **Docker Desktop** (https://www.docker.com/products/docker-desktop)
- **cloudflared** (apenas modo 3): `brew install cloudflared` no macOS

Para o mobile (modos 2 e 3):
- **Expo Go** instalado no celular (Play Store / App Store)
- Para o APK assinado: conta **Expo + EAS** (`npm i -g eas-cli && eas login`)

---

## Modo 1 — Localhost

Setup em uma linha:

```bash
./scripts/start-dev.sh
```

Isso faz, na sequência:
1. Sobe Postgres no Docker
2. Copia `.env.example` → `.env` se necessário
3. Instala dependências (`pnpm install`)
4. Gera o cliente Prisma
5. Cria migrations e aplica o schema
6. Roda o seed (5 usuários, 15 estabelecimentos, 17 visitas, ~50 estratégias em vários estados do Kanban)

Depois é só:
```bash
pnpm dev
```

Abra **http://localhost:5173** e logue com `gestor@ouropaes.com.br` e a senha que você
definiu em `SEED_PASSWORD` no `packages/api/.env`.

---

## Modo 2 — Rede local (web + mobile conversando em 2 terminais)

O cenário mais comum em dev: web no navegador + app no celular, ambos consumindo
a mesma API local. Mudança no mobile → aparece no web em segundos.

### Setup (uma vez por máquina/Wi-Fi)

```bash
# 1. Descobre seu IP na rede
./scripts/show-ip.sh
# → 192.168.0.42
```

**Edite `apps/mobile/.env`** apontando para o IP da sua máquina:
```env
EXPO_PUBLIC_API_URL=http://192.168.0.42:4000
```

**Edite `packages/api/.env`** liberando o IP no CORS (necessário se for abrir o web
também pelo IP em outra máquina; só usando localhost no navegador o default já basta):
```env
CORS_ORIGINS=http://localhost:5173,http://192.168.0.42:5173,http://localhost:8081
```

> Firewall do macOS pode bloquear a porta 4000. Vá em *Configurações → Rede →
> Firewall → Opções* e permita `node`, ou desative o firewall temporariamente.

### Rodando dia-a-dia (2 terminais)

**Terminal 1 — API + Web:**
```bash
pnpm dev
```
- API em `http://localhost:4000`
- Web em `http://localhost:5173`

**Terminal 2 — Mobile (Expo):**
```bash
pnpm dev:mobile
```
QR code aparece. Escaneie com:
- **Android:** app "Expo Go" (Play Store)
- **iOS:** câmera nativa (abre o Expo Go automaticamente)

### Validando a comunicação bidirecional

1. **Navegador:** abra `http://localhost:5173` e logue com `gestor@ouropaes.com.br`.
2. **Celular:** logue no app com `carlos@ouropaes.com.br`.
3. **No celular:** abra "Nova visita", preencha um estabelecimento, capture GPS e foto,
   toque em "Salvar e sincronizar".
4. **No navegador:** volte para a aba — em até ~15 segundos a visita nova aparece em:
   - *Dashboard* (KPI "Visitas Realizadas" sobe, e card de "Top Oportunidades" se score ≥ 70)
   - *Visitas* (linha nova no topo da tabela)
   - *Mapa* (pin novo na cor da classificação)
   - *Estratégias* (cards novos na coluna "Proposta")

O web está configurado para refetch automático:
- ao voltar foco para a aba do navegador
- a cada 15s em segundo plano (polling leve)

Se quiser ver instantâneo, é só dar `F5` ou trocar de aba e voltar.

### Como funciona por dentro

```
 ┌──────────────────────┐                              ┌──────────────────────┐
 │  Celular (Expo Go)   │                              │ Navegador (localhost)│
 │  EXPO_PUBLIC_API_URL │                              │   VITE_API_URL       │
 │  = 192.168.0.42:4000 │                              │   = localhost:4000   │
 └─────────┬────────────┘                              └─────────┬────────────┘
           │ HTTPS / JWT                                         │ HTTPS / JWT
           │ POST /visits                                        │ GET /dashboard
           │                                                     │ GET /visits
           └───────────────────────┬─────────────────────────────┘
                                   ▼
                         ┌───────────────────┐
                         │  API (porta 4000) │
                         │  Express+Prisma   │
                         └─────────┬─────────┘
                                   ▼
                         ┌───────────────────┐
                         │  Postgres Docker  │
                         │  (porta 5432)     │
                         └───────────────────┘
```

A API roda em `0.0.0.0:4000`, ou seja, aceita conexões tanto de `localhost:4000`
(navegador) quanto de `192.168.0.42:4000` (celular). O banco é o mesmo Postgres
em container Docker — fonte única de verdade.

### Troubleshooting de rede

- **Celular não conecta na API:**
  - Confirme que celular e máquina estão na **mesma Wi-Fi** (não 4G/5G no celular)
  - Confirme que o IP em `apps/mobile/.env` é o da sua máquina (e não `localhost`)
  - Teste no próprio celular: abra o navegador do celular em `http://<seu-ip>:4000/health` — tem que devolver `{"success":true,...}`
  - macOS: libere o firewall conforme acima
- **Mudanças no `.env` do mobile não pegam:** o Expo cacheia. No terminal do Expo, pressione `r` (reload) ou Ctrl+C e suba de novo.
- **`pnpm dev` reclama de porta ocupada:** outro processo está em 4000 ou 5173. Use `lsof -i :4000` para descobrir e mate-o.

---

## Modo 3 — Cloudflare Tunnel (acesso externo)

Quando você quer alguém de outra cidade testar — sem deploy, sem servidor na nuvem, sem expor IP público.

### 3.1 — Subir o servidor local

```bash
./scripts/start-dev.sh
pnpm dev
```

### 3.2 — Abrir o túnel (em outro terminal)

```bash
./scripts/tunnel.sh
```

Vai aparecer algo como:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take up to a minute to be reachable):  |
|  https://random-words-here.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

Esse URL **público** aponta direto para a sua API em `localhost:4000`. Enquanto o terminal estiver aberto, qualquer pessoa pode acessar.

### 3.3 — Configurar os clientes para usar o túnel

**Mobile** (`apps/mobile/.env`):
```env
EXPO_PUBLIC_API_URL=https://random-words-here.trycloudflare.com
```

Reinicie `pnpm dev:mobile`. Agora você pode dar build do APK (próxima seção) e enviar pro celular de qualquer pessoa — basta sua máquina estar ligada.

**Web público** (opcional — para alguém testar a parte do gestor): faça deploy do `apps/web` na Vercel e configure `VITE_API_URL=https://random-words-here.trycloudflare.com`. Adicione o domínio da Vercel ao `CORS_ORIGINS` da API e reinicie.

### 3.4 — Atenção sobre Cloudflare Tunnel "quick mode"

- **URL muda a cada execução.** Toda vez que você rodar `./scripts/tunnel.sh` vai sair um URL diferente.
- **Sem garantia de uptime.** Se sua máquina desligar, o túnel cai.
- **Sem autenticação por IP.** O JWT do app é a única barreira — por isso é importante não deixar o `JWT_SECRET` padrão em testes públicos.

Para um setup mais estável (URL fixo, com sua conta), use o modo "named tunnel" — veja [docs.cloudflare.com/cloudflare-one/connections/connect-networks](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

---

## Gerando o APK experimental

Quando você quiser distribuir o app para alguém testar fora do Expo Go:

```bash
cd apps/mobile
eas login                        # uma vez só
eas build:configure              # uma vez só
eas build --profile preview --platform android
```

Depois de ~15 minutos o EAS te dá um link `.apk`. Mande pro WhatsApp da pessoa, ela instala (precisa habilitar "instalar fontes desconhecidas") e o app conecta no `EXPO_PUBLIC_API_URL` que estiver configurado no `eas.json` (perfil `preview`).

**Para o preview apontar para o seu túnel:**
```jsonc
// apps/mobile/eas.json
"preview": {
  "distribution": "internal",
  "android": { "buildType": "apk" },
  "env": {
    "EXPO_PUBLIC_API_URL": "https://random-words-here.trycloudflare.com"
  }
}
```

Edite antes de rodar `eas build`.

---

## Resumo dos comandos

| O que | Comando |
|---|---|
| Setup completo (1ª vez) | `./scripts/start-dev.sh` |
| Iniciar dev (api+web) | `pnpm dev` |
| Iniciar mobile | `pnpm dev:mobile` |
| Ver IP da máquina | `./scripts/show-ip.sh` |
| Expor API publicamente | `./scripts/tunnel.sh` |
| Zerar banco e re-seedar | `./scripts/reset-db.sh` |
| Abrir Prisma Studio (GUI do DB) | `pnpm db:studio` |
| Build APK experimental | `cd apps/mobile && eas build --profile preview --platform android` |

---

## Troubleshooting

**"Cannot connect to Docker daemon"** → abra o Docker Desktop.

**"Port 5432 already in use"** → você tem outro Postgres rodando. Pare-o ou mude a porta no `docker-compose.yml`.

**"CORS error" no navegador** → adicione o origin ao `CORS_ORIGINS` no `packages/api/.env` e reinicie a API.

**Mobile não conecta na API local** → confirme que `EXPO_PUBLIC_API_URL` é o IP da máquina (não `localhost`), que celular e máquina estão na mesma Wi-Fi, e que o firewall permite a porta 4000.

**Túnel Cloudflare cai sozinho** → conexão instável. Considere usar um named tunnel com conta Cloudflare grátis (URL fixo, reconecta automaticamente).

**APK instalado não conecta** → o `EXPO_PUBLIC_API_URL` está fixado no momento do build via `eas.json`. Se o túnel mudou de URL, você precisa rebuildar o APK.
