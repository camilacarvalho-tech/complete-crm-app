# Changelog — Nexus Leads Monitor

Todas as mudanças notáveis deste módulo são documentadas neste arquivo.

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/).

---

## [1.1.0] — 2026-07-31

### Novas funcionalidades

- Pipeline assíncrono com fila de jobs (`leadsMonitorJobs`), lease/claim e worker no cliente
- Conector **API REST** genérico por empresa (URL, método, auth, mapeamento JSON)
- Conector **Webhook** com inbox Firestore (`leadsMonitorInbox`) alimentada por Cloud Function
- Cloud Functions v2: `leadsMonitorWebhook` e `leadsMonitorSaveSecret` (região `southamerica-east1`)
- Painel admin de integrações (API, Webhook, saúde dos conectores)
- Reprocessamento de itens da **DLQ** pela UI
- Audit trail append-only (`leadsMonitorAudit`)
- Logs operacionais (`leadsMonitorLogs`) e health por conector (`leadsMonitorHealth`)
- Hook extensível `INexusAiQualifier` para classificação/score
- Secrets gravados apenas como ciphertext + `webhookTokenHash` (nunca plaintext no Firestore)
- Documentação: `ARCHITECTURE.md`, `SECRETS.md`, `ROADMAP_V1.2.md`, `DEPLOY.md`, `functions/README.md`
- Smoke estrutural: `scripts/smoke-leads-monitor-flow.mjs`

### Melhorias de arquitetura

- `IConnector` versionado (`id` + `apiVersion` + `version`) com registry plugável
- Isolamento multi-tenant sob `empresas/{empresaId}/…`
- CRM recebe leads **somente** após aprovação explícita (`sendToCrm` → `clientes`)
- Inbox com create bloqueado a clientes (Admin SDK / Function)
- KEK preparada para Secret Manager (`defineString` hoje; migração documentada para `defineSecret` no Blaze)
- UI de secrets via Function autenticada (`VITE_LEADS_MONITOR_SAVE_SECRET_URL`)
- Conectores demo (`formularios_autorizados`, `bases_publicas_empresas`) **fora do registry** de produção
- Firestore Rules do Monitor publicadas no projeto `crm-recomece`

### Correções

- Removido double-fetch de conectores no worker (health no próprio pipeline)
- `INexusAiQualifier` efetivamente ligado ao pipeline
- `leadsMonitorSaveSecret` exige Firebase ID token + checagem de tenant/master
- Comparação HMAC do webhook com timing-safe
- Auto-refresh não empilha jobs duplicados para a mesma pesquisa
- Removido encrypt local com KEK hardcoded na UI
- Removida duplicata `connectors/README.ts`

### Pendências para V1.2

- Upgrade Firebase para **Blaze** e deploy das Cloud Functions + Secret Manager
- Proxy server-side para Bearer da API (eliminar KEK no browser)
- Conectores Meta Lead Ads, Google Ads, RD Station, HubSpot
- Worker server-side (Cloud Tasks) + índices compostos Firestore
- Suite de testes unitários e e2e Webhook → CRM
- UI rica de logs/audit
- Smoke CI com emuladores

Ver também: [ROADMAP_V1.2.md](src/modules/leads-monitor/ROADMAP_V1.2.md)

---

## [1.0.0] — 2026-07-30

### Novas funcionalidades

- Módulo Leads Monitor V1 com filtros, pesquisas salvas, auto-refresh e dedupe
- Conectores iniciais (formulários / bases públicas — demonstração)
- Score Nexus AI heurístico + aprovação → envio ao CRM
- Rota `/leads-monitor` e item de menu
