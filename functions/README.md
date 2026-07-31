# Nexus Leads Monitor — Cloud Functions

## Deploy

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

Set `LEADS_MONITOR_KEK` (strong secret) in Function env / Secret Manager.

## Webhook

```bash
curl -X POST "https://REGION-PROJECT.cloudfunctions.net/leadsMonitorWebhook?empresaId=SEU_TENANT" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"nome\":\"Lead Teste\",\"telefone\":\"11999999999\",\"consentimentoLgpd\":true,\"cidade\":\"São Paulo\",\"estado\":\"SP\",\"segmento\":\"credito_clt\"}"
```

Expect `202 { id, jobId, status: "accepted" }`.

## Save secret

Requires Firebase ID token of a user belonging to the tenant (or master):

```bash
curl -X POST "https://REGION-PROJECT.cloudfunctions.net/leadsMonitorSaveSecret" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"empresaId\":\"SEU_TENANT\",\"configDoc\":\"webhook\",\"field\":\"webhookToken\",\"plainSecret\":\"meu-token-longo\"}"
```

Homolog UI may still encrypt locally; production should prefer this Function + Secret Manager KEK.