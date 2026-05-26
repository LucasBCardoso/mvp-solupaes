#!/usr/bin/env bash
# Solupães — expõe a API local via Cloudflare Tunnel (sem conta necessária).
# Uso: ./scripts/tunnel.sh [porta]
# Padrão: 4000 (API). Use 5173 se quiser expor o frontend web.

set -euo pipefail

PORT="${1:-4000}"
URL="http://localhost:${PORT}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

if ! command -v cloudflared >/dev/null 2>&1; then
  echo -e "${RED}✗${NC} cloudflared não encontrado."
  echo
  echo "Instale com:"
  echo "  macOS:   brew install cloudflared"
  echo "  Linux:   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  echo "  Windows: https://github.com/cloudflare/cloudflared/releases"
  exit 1
fi

if ! curl -s -o /dev/null --max-time 2 "${URL}/health" 2>/dev/null; then
  if [ "$PORT" = "4000" ]; then
    echo -e "${YELLOW}!${NC} API não responde em ${URL}/health."
    echo "  Suba antes com: pnpm dev:api  (ou pnpm dev)"
    echo "  Continuando mesmo assim — o túnel ficará pronto quando você ligar o servidor."
    echo
  fi
fi

echo -e "${BLUE}▶${NC} Criando túnel Cloudflare para ${URL}..."
echo
echo "  Quando aparecer um URL ${GREEN}https://*.trycloudflare.com${NC}, use-o para:"
echo
echo "  • Configurar o mobile (apps/mobile/.env):"
echo "      EXPO_PUBLIC_API_URL=https://<seu-url>.trycloudflare.com"
echo
echo "  • Configurar o web em deploy externo (apps/web/.env):"
echo "      VITE_API_URL=https://<seu-url>.trycloudflare.com"
echo
echo "  • Atualizar CORS_ORIGINS em packages/api/.env para incluir o origin do web público"
echo
echo -e "  ${YELLOW}Mantenha este terminal aberto.${NC} Fechando = túnel cai."
echo
echo "──────────────────────────────────────────────────────────────"
exec cloudflared tunnel --url "$URL"
