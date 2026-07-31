# Nexus Leads Monitor — Cloud Functions

## Pré-requisitos

- Node 20
- Firebase CLI autenticado (`firebase login`)
- Secret Manager: `LEADS_MONITOR_KEK`

## Deploy

```bash
cd functions
npm install
npm run build

# Uma vez por projeto:
firebase functions:secrets:set LEADS_MONITOR_KEK

# Do root do repositório:
firebase deploy --only functions:leads-monitor,firestore:rules
```

Região: `southamerica-east1`.

## Webhook

```bash
curl -X POST "https://southamerica-east1-PROJECT.cloudfunctions.net/leadsMonitorWebhook?empresaId=SEU_TENANT" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"nome\":\"Lead Teste\",\"telefone\":\"11999999999\",\"consentimentoLgpd\":true,\"cidade\":\"São Paulo\",\"estado\":\"SP\",\"segmento\":\"credito_clt\"}"
```

Expect `202 { id, jobId, status: "accepted" }`.

## Save secret

Requires Firebase ID token of a user belonging to the tenant (or master):

```bash
curl -X POST "https://southamerica-east1-PROJECT.cloudfunctions.net/leadsMonitorSaveSecret" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"empresaId\":\"SEU_TENANT\",\"configDoc\":\"webhook\",\"field\":\"webhookToken\",\"plainSecret\":\"meu-token-longo\"}"
```

SPA: set `VITE_LEADS_MONITOR_SAVE_SECRET_URL` to this URL.
