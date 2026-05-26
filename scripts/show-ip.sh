#!/usr/bin/env bash
# Solupães — mostra o IP da máquina na rede local (para mobile dev na mesma Wi-Fi).

set -euo pipefail

# macOS / Linux
if command -v ipconfig >/dev/null 2>&1; then
  # macOS
  IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
fi

if [ -z "${IP:-}" ] && command -v ip >/dev/null 2>&1; then
  # Linux
  IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' || true)
fi

if [ -z "${IP:-}" ] && command -v hostname >/dev/null 2>&1; then
  IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
fi

if [ -z "${IP:-}" ]; then
  echo "127.0.0.1"
  exit 0
fi

echo "$IP"
