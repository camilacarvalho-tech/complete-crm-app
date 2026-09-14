# Nexus — CODE Tecnologia Empresarial

Plataforma CRM + ERP + IA + automações da CODE. Stack atual: **React + TypeScript + Vite + Firebase** (Auth, Firestore, Storage, Cloud Functions).

Identidade visual: [codetechoficial.com.br](https://codetechoficial.com.br/)

## Rodar

```bash
npm i
npm run dev
```

Build: `npx vite build` (ou `node node_modules/vite/bin/vite.js build`).

## Variáveis

Ver `.env.example`. Secrets (WhatsApp, bancos, fiscal, KEK do Leads Monitor) ficam no **backend / Secret Manager**, nunca no frontend.

## Multiempresa

Dados operacionais em `empresas/{empresaId}/{coleção}`. Regras em `firestore.rules` exigem `empresaId` no create das subcoleções.

## Providers (credencial pendente ≠ módulo incompleto)

| Provider | Status sem credencial |
|---|---|
| BankProvider | `not_configured` — sem margem/taxa inventada |
| FiscalProvider | `not_configured` — sem NF falsa |
| WhatsAppProvider | `not_configured` — webhook em `metaWhatsAppWebhook` |
| VoIP | discador do SO; SIP não configurado |

## Robô Letícia

Fluxos em `automacoes`. Eventos em `automacaoEventos` (novo lead, proposta, mensagem, lançamento). Worker no app processa a fila. WhatsApp só envia com provider configurado.

## Leads Monitor

Módulo existente preservado. Functions: `leadsMonitorWebhook`, `leadsMonitorSaveSecret`.

## Documentação

Ver `docs/ARQUITETURA.md`.
