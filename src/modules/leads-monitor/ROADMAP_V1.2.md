# Nexus Leads Monitor — Roadmap pós V1.1

## Incluído na V1.1

- Jobs assíncronos + lease, audit, logs, health
- API REST + Webhook (Cloud Functions v2 + Secret Manager)
- UI admin + reprocessamento DLQ
- Conectores demo removidos do registry
- CRM apenas após aprovação

## Pendências V1.2

| Item | Motivo |
|------|--------|
| Deploy Cloud Functions + Secret Manager | **Requer plano Blaze** no Firebase (`crm-recomece` ainda Spark) |
| Proxy server-side para API Bearer (sem KEK no browser) | Evitar `VITE_LEADS_MONITOR_KEK` no cliente |
| Conectores Meta / Google Ads / RD / HubSpot | Fora do escopo V1.1 |
| Índices compostos Firestore + worker server-side (Cloud Tasks) | Escala além do worker no browser |
| Testes automatizados (unit + e2e webhook→CRM) | Ambiente sem suite no repo |
| UI de logs/audit detalhada | V1.1 tem escrita; exploração rica fica para V1.2 |
| Emulador smoke CI | Deploy/auth locais | 
