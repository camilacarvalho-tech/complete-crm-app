# Nexus Leads Monitor — Roadmap pós V1.1

## Incluído na V1.1

- Jobs assíncronos + lease, audit, logs, health
- API REST + Webhook (Cloud Functions v2 + Secret Manager)
- UI admin + reprocessamento DLQ
- Conectores demo removidos do registry
- CRM apenas após aprovação
- Painel Ops na UI: Inbox · Jobs · Logs · Audit Trail

## Pendências infra (ainda V1.1 / go-live)

| Item | Motivo |
|------|--------|
| Deploy Cloud Functions + Secret Manager | **Requer plano Blaze** no Firebase |
| Proxy server-side para API Bearer (sem KEK no browser) | Evitar KEK no cliente |
| Índices compostos Firestore + worker server-side (Cloud Tasks) | Escala além do worker no browser |
| Testes automatizados (unit + e2e webhook→CRM) | Ambiente sem suite no repo |
| Emulador smoke CI | Deploy/auth locais |

## V1.2 — Busca Inteligente

Documento completo: **[ARCHITECTURE_V1.2.md](./ARCHITECTURE_V1.2.md)**  
Handoff: **[CONTINUAR_AMANHA.md](./CONTINUAR_AMANHA.md)**

### Etapas (após aprovação da arquitetura)

| Etapa | Entrega |
|-------|---------|
| E1 | Tipos + coleções `Fontes`/`SearchRuns` + filtros V1.2 + version `1.2.0` |
| E2 | Tela CRUD Fontes de Pesquisa + health/limites |
| E3 | SearchEngine + job `search_inteligente` + progresso/cancel |
| E4 | Conector CSV real |
| E5 | Score inteligente + métricas do painel |
| E6 | Histórico de pesquisas + tabela profissional |
| E7 | Stubs Google / Meta / LinkedIn + config de credenciais |
| E8 | IA: prioridade + sugestão de contato |
| E9 | Homologação E2E + changelog |

### Regra

Não scraped fontes de terceiros. APIs oficiais, CSV, webhooks e conectores com credenciais apenas.
