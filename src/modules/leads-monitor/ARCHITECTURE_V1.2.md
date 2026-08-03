# Nexus Leads Monitor — Arquitetura V1.2 (Busca Inteligente)

> Status: **proposta apresentada · aguardando aprovação formal para implementar**  
> Base: V1.1 (IConnector, Jobs, Logs, Audit, DLQ, Health, Secrets, CRM pós-aprovação)  
> Data: 2026-07-31

## Objetivo

Transformar o Leads Monitor em sistema que **encontra oportunidades automaticamente**, com múltiplas fontes configuráveis, busca real (APIs oficiais / CSV / webhooks), score Nexus AI e UI em tempo real — **sem scraping que viole ToS**.

## Princípio

```
UI (filtros + fontes ativas)
        ↓
Job type: search_inteligente
        ↓
SearchEngine.run(filtros, fontes[])
        ↓
para cada fonte → IConnector.fetch (ou stub needs_credentials)
        ↓
merge → dedupe → normalize → Nexus AI score → Firestore
        ↓
UI em tempo real (onSnapshot) + progresso do job
```

**Regra legal:** só APIs oficiais, webhooks, CSV importado e conectores com credenciais. Fonte sem credencial fica cadastrada/inativa com health `needs_credentials`.

## Herança V1.1 (não reinventar)

- Multi-tenant: `empresas/{empresaId}/…`
- `IConnector` versionado + registry
- Jobs com lease / retry / DLQ
- Logs + Audit Trail + Health
- Secrets via Cloud Function + Secret Manager (`LEADS_MONITOR_KEK`)
- CRM **somente** após aprovação humana

## Novas coleções

| Coleção | Papel |
|---------|--------|
| `leadsMonitorFontes` | Cadastro de fontes (tipo, status, limite, health, config) |
| `leadsMonitorSearchRuns` | Histórico + progresso de cada “Buscar Agora” |

### Documento fonte

- `nome`, `tipo` (`google_maps` | `gbp` | `google_search` | `instagram` | `facebook_pages` | `linkedin_companies` | `site_proprio` | `api_externa` | `csv` | `webhook` | `custom`)
- `status`: `ativa` | `inativa`
- `limiteDiario`, `usadoHoje`, `ultimaSyncEm`
- `errosRecentes[]`
- `health`: `ok` | `degraded` | `error` | `needs_credentials` | `idle`
- `config` (não-secreto)
- `secretRef` (nunca plaintext)
- `connectorId` + `apiVersion`

### Documento search run

- `filtros`, `fontesIds[]`, `usuarioId`, `usuarioNome`
- `status`: `queued` | `running` | `paused` | `cancelled` | `succeeded` | `failed`
- `progresso`: `{ percent, etapa, fontesConcluidas, fontesTotal, encontrados, novos, duplicados, tempoMs, etaMs }`
- `resultadoResumo`, `jobId`, timestamps

### Novos tipos de job

- `search_inteligente`
- `search_cancel`
- `import_csv`

## Camadas de código (planejado)

```
pages/
  LeadsMonitor.tsx       → painel (métricas, tabela, progresso)
  FontesPesquisa.tsx     → CRUD fontes + health

modules/leads-monitor/
  search/
    SearchEngine.ts
    SearchProgress.ts
    filters.ts           → FiltrosPesquisa V1.2
  scoring/
    smartScore.ts
  connectors/            → stubs Google/Meta/LinkedIn + CSV real
  ai/                    → estender INexusAiQualifier
```

## Fontes — prontidão V1.2

| Fonte | Entrega V1.2 | Ativação real |
|-------|--------------|---------------|
| CSV | Completo (upload + parse) | imediato |
| Webhooks / API externa | Já V1.1 + UI fonte | com token |
| Sites próprios | HTTP configurável | URL + auth |
| Google Maps / GBP / Search | UI + contrato + `needs_credentials` | keys oficiais |
| Instagram / Facebook / LinkedIn | UI + contrato + OAuth prep | tokens |

## Filtros V1.2

`cidade`, `estado`, `bairro`, `cep`, `segmento`, `cnae`, `palavraChave`, `nomeEmpresa`, `site`, `instagram`, `facebook`, `googleMapsQuery`

## Score inteligente

1. Heurística: WhatsApp, IG, FB, reviews (qtd + nota), cidade/segmento, porte, frescor  
2. Nexus AI (opcional): classificação, prioridade, sugestão de contato, motivos  

Campos: `score`, `temperatura`, `motivosScore[]`, `sugestaoContato`, `origemScore`

## UI

- KPIs: empresas hoje, novas, duplicadas, fontes consultadas, tempo, qualificados, score médio
- Barra de progresso / cancelar / continuar depois
- Tabela profissional (sort, paginação, filtros rápidos)
- Tela Fontes de Pesquisa + ícones por tipo
- Ops V1.1 (Inbox / Jobs / Logs / Audit) mantidos

## Etapas de implementação (após aprovação)

| Etapa | Entrega | Teste |
|-------|---------|--------|
| **E1** | Tipos + coleções + filtros V1.2 + version `1.2.0` | types/build |
| **E2** | CRUD Fontes de Pesquisa + health/limites (stubs) | UI + Firestore |
| **E3** | SearchEngine + job + progresso/cancel | job + searchRun |
| **E4** | Conector CSV real + merge no painel | import → oportunidades |
| **E5** | Score inteligente + métricas do painel | scores coerentes |
| **E6** | Histórico + tabela profissional | UI |
| **E7** | Stubs Google/Meta/LinkedIn + credenciais | needs_credentials |
| **E8** | IA: prioridade + sugestão contato | qualify |
| **E9** | Homologação E2E + docs/changelog | checklist |

## Fora do escopo imediato

- Scraping de Google/redes
- Cloud Tasks server-side (E10 se Blaze ativo)
- Contas Google/Meta sem keys do cliente

## Decisões pendentes (perguntar amanhã)

1. Arquitetura aprovada como está?
2. Priorizar Google Places antes do CSV? Omitir LinkedIn no MVP?
3. Worker só no browser vs. já preparar Function?
4. Tenant homologação continua `nexus-homologacao-v1`?
