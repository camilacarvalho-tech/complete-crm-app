# Continuar amanhã — Nexus Leads Monitor

> Atualizado: **2026-07-31** · Retomar por este arquivo + `ARCHITECTURE_V1.2.md`

## O que fazer amanhã (ordem)

1. Ler `ARCHITECTURE_V1.2.md` e **aprovar** (ou pedir ajustes).
2. Só depois de aprovação: implementar **E1** (tipos + version `1.2.0`).
3. Seguir etapas E2→E9, testando cada uma antes da próxima.

## V1.2 — estado

| Item | Status |
|------|--------|
| Arquitetura escrita | ✅ `ARCHITECTURE_V1.2.md` |
| Aprovação do usuário | ⏳ pendente |
| Código V1.2 | ❌ ainda não iniciado (combinado: arquitetura antes de codar) |
| Roadmap etapas | ✅ `ROADMAP_V1.2.md` |

## V1.1 — estado (homolog / visual)

| Item | Status |
|------|--------|
| Hosting | ✅ `https://recomece-cred-oficial.web.app` |
| Firestore rules | ✅ publicadas |
| Cloud Functions produção | ❌ bloqueado (billing/Blaze) |
| Webhook público | ❌ 404 até Functions no Blaze |
| Emulator Functions local | ✅ funciona com `functions/.secret.local` |
| Fluxo webhook → inbox → job → normalize → audit → CRM | ✅ homologado (script + UI) |
| UI Ops (Inbox / Jobs / Logs / Audit) | ✅ painel no `LeadsMonitor.tsx` |
| Versão UI | `1.1.0` |

### Evidência visual (última sessão)

- Login homolog: `teste@nexuscrm.com` · tenant `nexus-homologacao-v1`
- Dev server: `http://127.0.0.1:5474`
- Screenshots em Temp Cursor: Dashboard, Leads Monitor, Inbox/Jobs/Logs/Audit
- Webhook teste (emulator): inbox `Z4Y8FcFu1N3RL6hOZ7ka`, job `XpxL3EYCBfNgMq793ZnB` → drain OK → cliente CRM

### Fix local importante (Functions emulator)

- Arquivo: `functions/.secret.local` com `LEADS_MONITOR_KEK=…`
- Env: `FUNCTIONS_DISCOVERY_TIMEOUT=60000` ajuda no load
- Sem Blaze, Secret Manager cloud continua indisponível

## Comandos úteis amanhã

```powershell
cd "C:\Users\carva\OneDrive\Desktop\Nexus CRM Clean"
npm run dev -- --port 5474 --host 127.0.0.1

# Emulator webhook (outro terminal)
$env:LEADS_MONITOR_KEK='nexus-leads-monitor-emulator-kek'
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60000'
firebase emulators:start --project recomece-cred-oficial --only functions

# Webhook homolog (token já seedado)
$env:HOMOLOG_WEBHOOK_TOKEN='homolog-live-wh-d9938658'
node scripts/homolog-webhook-staging.mjs curl
```

## Arquivos-chave

- Arquitetura V1.2: `src/modules/leads-monitor/ARCHITECTURE_V1.2.md`
- Roadmap: `src/modules/leads-monitor/ROADMAP_V1.2.md`
- Arch V1.1: `src/modules/leads-monitor/ARCHITECTURE.md`
- Página: `src/pages/LeadsMonitor.tsx`
- Hook: `src/modules/leads-monitor/hooks/useLeadsMonitor.ts`
- Functions: `functions/src/index.ts`
- Scripts: `scripts/homolog-*.mjs`
