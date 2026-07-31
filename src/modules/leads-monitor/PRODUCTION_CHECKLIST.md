# Checklist de produção — Nexus Leads Monitor V1.1

**Projeto Firebase:** `recomece-cred-oficial`  
**Região das Functions:** `southamerica-east1`  
**Tag Git:** `v1.1.0`  
**Empresa de smoke (homolog):** `nexus-homologacao-v1` (troque pelo tenant real em produção)

Marque cada etapa só após a validação passar.

---

## Pré-requisitos (antes de começar)

```bash
cd "C:\Users\carva\OneDrive\Desktop\Nexus CRM Clean"
firebase login
firebase use staging
# deve imprimir: Now using alias staging (recomece-cred-oficial)
node -v          # ideal: v20.x (Functions pedem 20; host com 24 funciona no deploy)
firebase --version
git status -sb   # main atualizado com v1.1.0 + correções FieldValue
```

| Esperado | Como validar |
|----------|----------------|
| Projeto ativo = `recomece-cred-oficial` | `firebase use` mostra esse ID |
| CLI autenticada | `firebase projects:list` lista o projeto |

---

## Etapa 1 — Ativar Firebase Blaze

### Comandos / ações

1. Abra: https://console.firebase.google.com/project/recomece-cred-oficial/usage/details  
2. Clique em **Modificar plano** → **Blaze**  
3. Vincule uma conta de faturamento Google Cloud com status **Aberta**  
4. Confirme o upgrade

### Resultado esperado

- Plano do projeto = **Blaze (pay as you go)**  
- Sem erro *“Billing account … is not open”*

### Como validar

```bash
firebase use staging
# Tente habilitar uma API que exige Blaze (não precisa concluir deploy ainda):
firebase functions:secrets:get LEADS_MONITOR_KEK
```

- Se o secret ainda não existir: erro do tipo *Secret … not found* (OK — Blaze/API ok)  
- Se aparecer *must be on the Blaze plan* ou *Billing account … is not open* → Blaze ainda incompleto

---

## Etapa 2 — Configurar o Secret Manager (KEK)

O código atual lê `process.env.LEADS_MONITOR_KEK`. Em produção use **Secret Manager** ligado às Functions.

### 2A — Criar o secret

Gere um valor forte (não commitado):

```powershell
# PowerShell — gera KEK e NÃO imprime no histórico se redirecionar com cuidado
$kek = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
# Guarde $kek em um cofre (1Password/Bitwarden). Não commitar.
```

No terminal (interativo — o CLI pede o valor):

```bash
firebase use staging
firebase functions:secrets:set LEADS_MONITOR_KEK
# Cole o valor da KEK quando solicitado
```

### 2B — Ligar o secret no código (obrigatório para Secret Manager)

Em `functions/src/index.ts`, use o padrão:

```ts
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'

const leadsMonitorKek = defineSecret('LEADS_MONITOR_KEK')

const fnOpts = {
  region: 'southamerica-east1' as const,
  cors: true,
  secrets: [leadsMonitorKek],
}

function resolveKek(): string {
  const v = leadsMonitorKek.value()
  if (v?.trim()) return v.trim()
  if (process.env.FUNCTIONS_EMULATOR === 'true') return 'nexus-leads-monitor-emulator-kek'
  throw new Error('LEADS_MONITOR_KEK missing')
}
```

Rebuild:

```bash
cd functions
npm install
npm run build
cd ..
```

### Alternativa rápida (sem alterar código)

No Google Cloud Console → Cloud Run / Cloud Functions → variáveis de ambiente  
`LEADS_MONITOR_KEK=<mesmo valor>`  
Funciona, mas **não** é Secret Manager (menos seguro). Preferir 2A+2B.

### Resultado esperado

- Secret `LEADS_MONITOR_KEK` existe no projeto  
- Functions compilam (`npm run build` exit 0)

### Como validar

```bash
firebase functions:secrets:access LEADS_MONITOR_KEK
# imprime o valor — use só em máquina segura; confirme que não está vazio
firebase functions:secrets:get LEADS_MONITOR_KEK
# mostra metadados (versão, etc.)
```

---

## Etapa 3 — Variáveis de ambiente (Functions + SPA)

### 3.1 Functions

| Variável | Onde | Valor |
|----------|------|--------|
| `LEADS_MONITOR_KEK` | Secret Manager (Etapa 2) | KEK aleatória |

Arquivo local **não versionado** (só emulador / fallback):

```bash
cd functions
copy .env.example .env
# Edite .env: LEADS_MONITOR_KEK=<mesmo valor do Secret Manager>
```

Confirme que `functions/.env` está no `.gitignore`.

### 3.2 SPA (Vite)

Na raiz do app (`.env` / `.env.production` / painel da Vercel/hosting):

```env
VITE_LEADS_MONITOR_SAVE_SECRET_URL=https://southamerica-east1-recomece-cred-oficial.cloudfunctions.net/leadsMonitorSaveSecret
```

Opcional (só se API REST no browser precisar decrypt de Bearer):

```env
VITE_LEADS_MONITOR_KEK=<mesmo valor da KEK>
```

Preferível em produção: `authType=none` ou header sem secret no client; evitar KEK no bundle.

### Resultado esperado

- Secret no GCP  
- SPA com URL da Function `SaveSecret` após o deploy (Etapa 4)

### Como validar

```bash
# Após Etapa 4, a URL deve responder (mesmo que 401 sem token):
curl -i -X POST "https://southamerica-east1-recomece-cred-oficial.cloudfunctions.net/leadsMonitorSaveSecret"
# Esperado: 401 missing_auth (não 404 / DNS error)
```

No build:

```bash
npm run build
# bundle não deve conter tokens de webhook em plaintext
```

---

## Etapa 4 — Deploy das Cloud Functions

```bash
firebase use staging
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions --non-interactive
```

### Resultado esperado

```
✔  functions[southamerica-east1-leadsMonitorWebhook] ...
✔  functions[southamerica-east1-leadsMonitorSaveSecret] ...
✔  Deploy complete!
```

URLs típicas:

- `https://southamerica-east1-recomece-cred-oficial.cloudfunctions.net/leadsMonitorWebhook`  
- `https://southamerica-east1-recomece-cred-oficial.cloudfunctions.net/leadsMonitorSaveSecret`

### Como validar

```bash
firebase functions:list
curl -i -X POST "https://southamerica-east1-recomece-cred-oficial.cloudfunctions.net/leadsMonitorWebhook"
# Esperado: 400 empresaId_required (função no ar)
```

Console: https://console.firebase.google.com/project/recomece-cred-oficial/functions

---

## Etapa 5 — Publicar Firestore Rules

```bash
firebase use staging
firebase deploy --only firestore:rules --non-interactive
```

### Resultado esperado

```
✔  cloud.firestore: rules file firestore.rules compiled successfully
✔  firestore: released rules ...
✔  Deploy complete!
```

### Como validar

```bash
# Já feito em homolog; revalidar create de inbox negado ao cliente:
node scripts/homolog-live-crm-bridge.mjs
# Deve manter PASS em "Inbox create bloqueado a clientes"
```

Console → Firestore → Rules → data de publicação recente.

---

## Etapa 6 — Validar URL pública do webhook

### 6.1 Configurar token na UI (ou script)

1. Login no CRM (tenant correto)  
2. `/leads-monitor` → Integrações → Webhook **Ativo**  
3. Definir Bearer token forte → Salvar (via Function `SaveSecret` se `VITE_LEADS_MONITOR_SAVE_SECRET_URL` estiver setada)

Ou seed de hash (homolog):

```bash
node scripts/homolog-webhook-staging.mjs seed
# Anote TOKEN impresso
```

### 6.2 Curl produção

```bash
set EMPRESA=nexus-homologacao-v1
set TOKEN=SEU_BEARER_TOKEN

curl -i -X POST ^
  "https://southamerica-east1-recomece-cred-oficial.cloudfunctions.net/leadsMonitorWebhook?empresaId=%EMPRESA%" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"nome\":\"Lead Prod V1.1\",\"telefone\":\"11988887777\",\"email\":\"prod.v11@example.com\",\"cidade\":\"São Paulo\",\"estado\":\"SP\",\"segmento\":\"credito_clt\",\"consentimentoLgpd\":true}"
```

### Resultado esperado

```http
HTTP/1.1 202 Accepted
{"id":"<inboxId>","jobId":"<jobId>","status":"accepted"}
```

Negativos:

| Chamada | Esperado |
|---------|----------|
| Sem `empresaId` | `400 empresaId_required` |
| Sem Bearer | `401 missing_bearer` |
| Token errado | `401 invalid_token` |
| Webhook desabilitado | `403 webhook_disabled` |

### Como validar no Firestore

Path: `empresas/{empresaId}/leadsMonitorInbox/{id}` → `status: pending`  
Path: `empresas/{empresaId}/leadsMonitorJobs/{jobId}` → `type: drain_inbox`, `status: queued`  
Path: `empresas/{empresaId}/leadsMonitorAudit` → `action: webhook.accept`

---

## Etapa 7 — Teste ponta a ponta em produção

### Sequência

1. **Webhook** (Etapa 6) → anotar `inboxId` e `jobId`  
2. Abrir o app logado no tenant → `/leads-monitor` (worker do browser processa a fila)  
   - Ou, se necessário: `node scripts/homolog-drain-inbox.mjs <inboxId> <jobId>`  
3. Confirmar oportunidade `status: novo`  
4. Na UI: **Aprovar e enviar ao CRM**  
5. Conferir `clientes/{crmClienteId}` e oportunidade `enviado_crm`

### Checklist E2E

| Etapa | Validação |
|-------|-----------|
| Webhook | HTTP 202 |
| Inbox | doc `pending` → depois `processed` |
| Job | `queued` → `succeeded` |
| Normalize | `leadsMonitorOportunidades` com dados do payload |
| Logs | `leadsMonitorLogs` com mensagem do job |
| Audit | `webhook.accept`, `oportunidade.approve`, `oportunidade.send_crm` |
| CRM | `empresas/{id}/clientes` com `origem` contendo `Leads Monitor` |

### Scripts de apoio

```bash
node scripts/smoke-leads-monitor-flow.mjs          # estrutural offline
node scripts/homolog-live-crm-bridge.mjs           # bridge CRM + rules
node scripts/homolog-webhook-staging.mjs seed      # prepara hash (dev/homolog)
```

### Resultado esperado

`HOMOLOG_FULL_FLOW_OK` (ou equivalente manual) com cliente criado no CRM.

---

## Etapa 8 — Confirmação oficial “pronto para produção”

Só marque **SIM** se **todas** as linhas abaixo forem verdadeiras:

| Critério | OK? |
|----------|-----|
| Plano Blaze ativo + billing aberto | ☐ |
| Secret `LEADS_MONITOR_KEK` no Secret Manager (ou env prod documentado) | ☐ |
| `leadsMonitorWebhook` e `leadsMonitorSaveSecret` deployadas | ☐ |
| Firestore Rules publicadas em `recomece-cred-oficial` | ☐ |
| Curl público do webhook = `202` | ☐ |
| Inbox + Job criados no tenant | ☐ |
| Lead normalizado, audit/log presentes | ☐ |
| Aprovação → documento em `clientes` | ☐ |
| `VITE_LEADS_MONITOR_SAVE_SECRET_URL` apontando para a Function pública | ☐ |
| Nenhum token de webhook em plaintext no Firestore | ☐ |
| Conectores demo fora do registry (só API + webhook) | ☐ |

### Declaração

> **Nexus Leads Monitor V1.1 está oficialmente pronto para produção** quando o checklist da Etapa 8 estiver 100% marcado e o E2E da Etapa 7 tiver passado na URL **pública** (não no emulador).

Enquanto Blaze/Functions públicas faltarem, o status permanece: **homologado / aguardando go-live**.

---

## Referências

- [DEPLOY.md](./DEPLOY.md)  
- [SECRETS.md](./SECRETS.md)  
- [HOMOLOGACAO_V1.1.md](./HOMOLOGACAO_V1.1.md)  
- [functions/README.md](../../functions/README.md)  
- [CHANGELOG.md](../../CHANGELOG.md)  
- Tag: `v1.1.0`
