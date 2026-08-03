# Nexus Leads Monitor — Cloud Functions

## Pré-requisitos

- Node 20
- Firebase CLI autenticado (`firebase login`)
- Secret Manager: `LEADS_MONITOR_KEK`
- Plano Blaze (Functions + Scheduler)

## Functions

| Export | Tipo | Papel |
|--------|------|--------|
| `leadsMonitorWebhook` | HTTPS | Bearer (+ HMAC opcional) → inbox + job |
| `leadsMonitorSaveSecret` | HTTPS | Grava ciphertext (AES-GCM / KEK) |
| `leadsMonitorJobWorker` | Schedule `every 1 minutes` | Claim/lease `drain_inbox` / `reprocess_dlq` |

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

### Com HMAC (opcional)

Se `hmacSecret` estiver configurado na UI:

```bash
BODY='{"nome":"Lead HMAC","telefone":"11988887777","consentimentoLgpd":true,"cidade":"São Paulo","estado":"SP","segmento":"credito_clt"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "SEU_HMAC_SECRET" | awk '{print $2}')

curl -X POST "https://southamerica-east1-PROJECT.cloudfunctions.net/leadsMonitorWebhook?empresaId=SEU_TENANT" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=$SIG" \
  -d "$BODY"
```

## Save secret

Requires Firebase ID token of a user belonging to the tenant (or master):

```bash
curl -X POST "https://southamerica-east1-PROJECT.cloudfunctions.net/leadsMonitorSaveSecret" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"empresaId\":\"SEU_TENANT\",\"configDoc\":\"webhook\",\"field\":\"webhookToken\",\"plainSecret\":\"meu-token-longo\"}"
```

SPA: set `VITE_LEADS_MONITOR_SAVE_SECRET_URL` to this URL.

## Job worker

`leadsMonitorJobWorker` roda a cada minuto, faz claim atômico (lease) em `leadsMonitorJobs` e processa `drain_inbox` / `reprocess_dlq` no Admin SDK (escala horizontal sem double-processing). Jobs `search*` continuam no worker do cliente (conectores SPA / Search Engine).
