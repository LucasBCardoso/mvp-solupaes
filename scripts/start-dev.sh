#!/usr/bin/env bash
# Solupães — bootstrap completo de desenvolvimento local.
# Sobe Postgres (Docker), instala deps, gera Prisma, migra, seeda e inicia api+web.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}▶${NC} $*"; }
ok()  { echo -e "${GREEN}✓${NC} $*"; }
warn(){ echo -e "${YELLOW}!${NC} $*"; }
err() { echo -e "${RED}✗${NC} $*"; }

# 1. Pré-requisitos
log "Verificando pré-requisitos..."
command -v pnpm >/dev/null 2>&1 || { err "pnpm não encontrado. Instale com: npm i -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { err "docker não encontrado. Instale o Docker Desktop."; exit 1; }
docker info >/dev/null 2>&1 || { err "Docker não está rodando. Abra o Docker Desktop."; exit 1; }
ok "pnpm e docker prontos"

# 2. Postgres
log "Subindo Postgres em Docker..."
docker compose up -d postgres
echo -n "  Aguardando Postgres aceitar conexões"
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo
    ok "Postgres pronto na porta 5432"
    break
  fi
  echo -n "."
  sleep 1
  if [ "$i" -eq 30 ]; then echo; err "Postgres não respondeu em 30s"; exit 1; fi
done

# 3. .env files
log "Garantindo arquivos .env..."
[ -f packages/api/.env ] || cp packages/api/.env.example packages/api/.env
[ -f apps/web/.env ] || cp apps/web/.env.example apps/web/.env
[ -f apps/mobile/.env ] || cp apps/mobile/.env.example apps/mobile/.env
ok ".env criados (edite se quiser ajustar JWT_SECRET etc.)"

# 3.1 Validar SEED_PASSWORD
if ! grep -E '^SEED_PASSWORD="?.{8,}"?$' packages/api/.env >/dev/null 2>&1; then
  warn "SEED_PASSWORD ausente ou curta em packages/api/.env"
  echo "    Defina uma senha forte (mín. 8 chars) para os usuários de dev e rode novamente:"
  echo
  echo "      ${YELLOW}\$EDITOR packages/api/.env${NC}"
  echo "      (ajuste a linha SEED_PASSWORD=\"...\" e salve)"
  echo
  exit 1
fi

# 4. Dependências
if [ ! -d node_modules ]; then
  log "Instalando dependências (pode demorar na primeira vez)..."
  pnpm install
  ok "Dependências instaladas"
else
  log "Dependências já instaladas (pnpm install para atualizar)"
fi

# 5. Prisma generate
log "Gerando cliente Prisma..."
pnpm --filter @solupaes/api db:generate
ok "Prisma client gerado"

# 6. Migrate
log "Aplicando migrations..."
if [ -d packages/api/prisma/migrations ] && [ "$(ls -A packages/api/prisma/migrations 2>/dev/null)" ]; then
  pnpm --filter @solupaes/api db:migrate:deploy
else
  pnpm --filter @solupaes/api exec prisma migrate dev --name init
fi
ok "Schema aplicado"

# 7. Seed
log "Populando dados de demo..."
pnpm --filter @solupaes/api db:seed
ok "Seed concluído"

# 8. IP local
IP=$(./scripts/show-ip.sh 2>/dev/null || echo "127.0.0.1")

echo
ok "Tudo pronto. Inicie com:"
echo
echo "    ${GREEN}pnpm dev${NC}        # api (4000) + web (5173) em paralelo"
echo "    ${GREEN}pnpm dev:mobile${NC} # app Expo (em outro terminal)"
echo
echo "  Acessos:"
echo "    Web local:    http://localhost:5173"
echo "    API local:    http://localhost:4000/health"
echo "    Web na rede:  http://${IP}:5173   (mesma Wi-Fi)"
echo "    API na rede:  http://${IP}:4000   (mesma Wi-Fi)"
echo
echo "  Login: gestor@ouropaes.com.br · senha definida em SEED_PASSWORD (packages/api/.env)"
echo
echo "  Para expor publicamente (Cloudflare Tunnel):"
echo "    ${YELLOW}./scripts/tunnel.sh${NC}"
echo
