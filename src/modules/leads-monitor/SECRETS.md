# Nexus Leads Monitor V1.1 — Secrets & Deploy

## Secret Manager (plano Blaze)

O projeto **crm-recomece** precisa estar no plano **Blaze** para habilitar `secretmanager.googleapis.com`.

Enquanto estiver no Spark / sem Secret Manager:

1. Use `functions/.env` com `LEADS_MONITOR_KEK=...` (não commitado; ver `.env.example`).
2. O código lê `process.env.LEADS_MONITOR_KEK` (e fallback de emulador).

Após upgrade Blaze:

```bash
firebase functions:secrets:set LEADS_MONITOR_KEK
# Opcional: migrar para defineSecret('LEADS_MONITOR_KEK') + secrets: [...] em functions/src/index.ts
firebase deploy --only functions
```

## Deploy imediato (sem Secret Manager)

```bash
# Rules (já publicadas em V1.1)
firebase deploy --only firestore:rules

# Functions (requer Blaze para Cloud Functions em muitos projetos)
cd functions && npm install && npm run build && cd ..
# Crie functions/.env a partir de .env.example
firebase deploy --only functions
```

## SPA env

```env
VITE_LEADS_MONITOR_SAVE_SECRET_URL=https://southamerica-east1-PROJECT.cloudfunctions.net/leadsMonitorSaveSecret
# Opcional (só se API Bearer no browser precisar decrypt):
# VITE_LEADS_MONITOR_KEK=<mesmo valor da KEK>
```

## Garantias V1.1

- Firestore nunca recebe tokens em plaintext (Function grava ciphertext + `webhookTokenHash`).
- UI não faz encrypt local com KEK hardcoded.
- Webhook autentica preferencialmente por hash SHA-256 (sem decrypt).
- KEK nunca vai para o repositório (`.env` / Secret Manager).
