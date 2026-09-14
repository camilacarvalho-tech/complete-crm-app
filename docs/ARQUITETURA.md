# Arquitetura Nexus

## Frontend
`src/pages` (módulos), `src/contexts/NexusStore` (Firestore realtime por tenant), `src/integrations/providers.ts`, `src/lib/leticiaEngine.ts`, `src/lib/finance.ts`.

## Backend
`functions/src/index.ts` — ingestão Leads Monitor + webhook Meta WhatsApp (persistência WAMID/wa_id, sem envio fake).

## Isolamento
Firestore: `belongsToTenant(empresaId)`. Create de subcoleção exige `empresaId` igual ao path.

## Automações
TRIGGER → IF/ELSE → ACTION → DELAY (delay registrado; execução imediata no worker da sessão). Histórico em `leticiaRuns`.

## IA
Nexus AI consulta o store do tenant. Nexus AI Financeiro usa `buildDre` / `runFinanceAi` sobre lançamentos reais.

## O que depende de credencial
WhatsApp Cloud API token, Bank API, Fiscal API, SIP/WebRTC. UI e health check: NOT CONFIGURED.
