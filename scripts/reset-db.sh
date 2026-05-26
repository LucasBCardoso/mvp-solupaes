#!/usr/bin/env bash
# Solupães — limpa o banco e reaplica seed.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "⚠️  Isso vai APAGAR todos os dados locais e recriar o schema."
read -p "Continuar? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelado."
  exit 0
fi

pnpm --filter @solupaes/api exec prisma migrate reset --force
echo "✅ Banco resetado e re-seedado."
