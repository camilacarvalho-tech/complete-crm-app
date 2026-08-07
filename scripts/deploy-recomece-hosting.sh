#!/usr/bin/env bash
# Deploy do CRM Recomece Cred para Firebase Hosting (projeto recomece-cred-oficial).
# NÃO usa NX CRM / Nexus Platform.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Projeto Firebase: recomece-cred-oficial"
echo "==> App: Recomece Cred CRM Oficial"

if [[ ! -f package.json ]]; then
  echo "Erro: rode na raiz do repositório complete-crm-app"
  exit 1
fi

echo "==> Instalando dependências (se necessário)..."
if [[ ! -d node_modules ]]; then
  npm ci
fi

echo "==> Build de produção..."
npm run build

if [[ ! -f dist/index.html ]]; then
  echo "Erro: dist/index.html não gerado"
  exit 1
fi

# Garante título Recomece no artefato
if grep -qi 'Nexus Platform\|Nexus CRM\|CredFlow' dist/index.html; then
  echo "Erro: build ainda contém marca NX/CredFlow"
  exit 1
fi

echo "==> Deploy hosting only (recomece-cred-oficial)..."
npx --yes firebase-tools@13 deploy --only hosting --project recomece-cred-oficial --non-interactive

echo ""
echo "OK — site publicado:"
echo "  https://recomece-cred-oficial.web.app"
echo "  https://recomece-cred-oficial.firebaseapp.com"
