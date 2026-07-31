# Nexus Leads Monitor V1.1 — Guia de implantação

Versão do módulo: **1.1.0** (`LEADS_MONITOR_VERSION`).

## Pré-requisitos

- Node 20+ (Functions exigem engine 20; deploy Firebase recomenda Blaze)
- Firebase CLI (`firebase-tools`) autenticado
- Projeto: `crm-recomece` (ver `.firebaserc`)
- Plano **Blaze** para Cloud Functions e Secret Manager (Rules já publicáveis no Spark)

## 1. Firestore Rules

```bash
firebase deploy --only firestore:rules
```

Status V1.1: **publicado** em `crm-recomece`.

## 2. Cloud Functions

```bash
cd functions
cp .env.example .env
# Edite LEADS_MONITOR_KEK com valor aleatório forte (não versionar .env)
npm install
npm run build
cd ..
firebase deploy --only functions
```

Região: `southamerica-east1`  
Codebase: `leads-monitor`  
Funções: `leadsMonitorWebhook`, `leadsMonitorSaveSecret`

### Secret Manager (após Blaze)

```bash
firebase functions:secrets:set LEADS_MONITOR_KEK
# Depois: trocar defineString → defineSecret em functions/src/index.ts
# Ver SECRETS.md
```

## 3. SPA (Vite)

```bash
# Root do repositório
cp .env.leads-monitor.example .env.local   # ou mesclar no .env existente
```

Variáveis:

| Variável | Uso |
|----------|-----|
| `VITE_LEADS_MONITOR_SAVE_SECRET_URL` | URL HTTPS de `leadsMonitorSaveSecret` |
| `VITE_LEADS_MONITOR_KEK` | Opcional — só se API Bearer no browser precisar decrypt |

```bash
npm install
npm run build
# ou: npm run dev
```

## 4. Configuração por empresa (UI)

1. Abrir `/leads-monitor` autenticado
2. Ativar **Webhook** e/ou **API REST** no painel Integrações
3. Salvar Bearer/HMAC (enviados à Function — sem plaintext no Firestore)
4. Habilitar pesquisas salvas para auto-refresh

## 5. Smoke do webhook

```bash
curl -X POST \
  "https://southamerica-east1-PROJECT.cloudfunctions.net/leadsMonitorWebhook?empresaId=SEU_TENANT" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"nome\":\"Lead Teste\",\"telefone\":\"11999999999\",\"consentimentoLgpd\":true,\"cidade\":\"São Paulo\",\"estado\":\"SP\",\"segmento\":\"credito_clt\"}"
```

Esperado: `202 { id, jobId, status: "accepted" }`.

Com a página do Monitor aberta, o worker drena a inbox → oportunidades. Aprovar → CRM (`clientes`).

Smoke estrutural (offline):

```bash
node scripts/smoke-leads-monitor-flow.mjs
```

## 6. Documentação relacionada

| Arquivo | Conteúdo |
|---------|----------|
| [CHANGELOG.md](../../CHANGELOG.md) | Notas da release |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitetura do módulo |
| [SECRETS.md](./SECRETS.md) | KEK / secrets |
| [ROADMAP_V1.2.md](./ROADMAP_V1.2.md) | Pendências |
| [functions/README.md](../../functions/README.md) | Deploy Functions |
| [connectors/README.md](./connectors/README.md) | Como adicionar conector |

## Tag

Release Git: `v1.1.0`
