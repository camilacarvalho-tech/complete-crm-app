# Relatório de Homologação — Nexus Leads Monitor V1.1

**Data:** 2026-07-31  
**Ambiente staging:** Firebase `recomece-cred-oficial` / empresa `nexus-homologacao-v1`  
**Git:** `main` + tag `v1.1.0` publicados em `origin`  
**Commits relevantes:** `33e87bc` … `56bcd5d` (+ correções pós-homolog)

---

## 1. Testes executados

| # | Teste | Ambiente | Resultado |
|---|--------|----------|-----------|
| T1 | `git push origin main` | GitHub | **PASS** |
| T2 | `git push origin v1.1.0` | GitHub | **PASS** |
| T3 | Deploy Firestore Rules | `recomece-cred-oficial` | **PASS** |
| T4 | Deploy Cloud Functions | `recomece-cred-oficial` | **FAIL** (billing/Blaze) |
| T5 | Deploy Hosting staging | — | **SKIP** (não solicitado como bloqueante; Functions já bloqueadas) |
| T6 | Auth usuário homologação | Live | **PASS** (`teste@nexuscrm.com`) |
| T7 | Inbox create bloqueado a clientes | Live rules | **PASS** |
| T8 | Persist oportunidade + Logs + Audit | Live | **PASS** |
| T9 | Aprovar lead | Live | **PASS** |
| T10 | Enviar lead → CRM (`clientes`) | Live | **PASS** (`lLkQHtjnURr5pdE0vKFF`) |
| T11 | Webhook Function → Inbox → Job | Emulator Functions → Firestore live | **PASS** após correção (`jTXvhuxDaniqClJhJzSj` / `CasigcAQmyLThL31dtCR`) |
| T12 | Drain inbox → normalize → approve → CRM | Live | **PASS** (`op=pFW40uwGbZre83iRrCCD`, `cliente=GeajHl2rFxYUu50Uusa6`) |
| T13 | Firestore Emulator E2E local | Local | **FAIL** (Java não instalado / UAC cancelado) |
| T14 | Smoke estrutural offline | Local | **PASS** (`scripts/smoke-leads-monitor-flow.mjs`) |

---

## 2. Resultados por etapa do fluxo

| Etapa | Status | Evidência |
|-------|--------|-----------|
| Receber webhook | **PASS** | HTTP `202 accepted` via Function emulator |
| Criar Inbox | **PASS** | `leadsMonitorInbox/jTXvhuxDaniqClJhJzSj` status `pending` |
| Gerar Job | **PASS** | `leadsMonitorJobs/CasigcAQmyLThL31dtCR` type `drain_inbox` / `queued` |
| Normalizar o lead | **PASS** | oportunidade `pFW40uwGbZre83iRrCCD` |
| Registrar Logs | **PASS** | `leadsMonitorLogs/I7uxl0FxGENzOWBVWivI` |
| Registrar Audit Trail | **PASS** | `webhook.accept` (Function) + `oportunidade.normalize` / `send_crm` |
| Aprovar o lead | **PASS** | status `aprovado` |
| Enviar ao Nexus CRM | **PASS** | `clientes/GeajHl2rFxYUu50Uusa6` |

---

## 3. Erros encontrados e corrigidos

| Erro | Correção |
|------|----------|
| Rules publicadas só em `crm-recomece` (SPA usa `recomece-cred-oficial`) | `.firebaserc` com alias `staging` → `recomece-cred-oficial`; rules reimplantadas |
| `admin.firestore.FieldValue.serverTimestamp` undefined (Admin SDK v12) | Import `FieldValue` de `firebase-admin/firestore` |
| Emulator Functions timeout com `defineString` | Removido `defineString`; KEK via `process.env` / emulador |
| Usuário homolog sem doc `usuarios/{uid}` → 403 em writes | Bootstrap do perfil tenant no script live (rules permitem self-create) |
| `main` local divergia do remoto (ahead/behind) | Merge `origin/main` antes do push |

---

## 4. Pendências restantes

1. **Upgrade Blaze + billing** em `recomece-cred-oficial` para deploy real das Cloud Functions e Secret Manager  
2. **Java JDK** no ambiente local para Firestore Emulator (E2E 100% offline)  
3. Configurar `VITE_LEADS_MONITOR_SAVE_SECRET_URL` após deploy das Functions  
4. Worker browser processando inbox automaticamente (homolog drainou via script; UI worker já existe no código)  
5. Itens de produto V1.2 (proxy API sem KEK no client, conectores Meta/Google, testes CI) — ver `ROADMAP_V1.2.md`

---

## 5. Pronto para produção?

**Não — ainda não para publicação plena em produção.**

### O que está pronto
- Código V1.1 + tag `v1.1.0` no GitHub  
- Firestore Rules no projeto correto de staging  
- Fluxo de negócio validado: webhook→inbox→job→normalize→logs→audit→approve→CRM  
- Isolamento multi-tenant e bloqueio de inbox no cliente confirmados  

### O que impede produção
1. Cloud Functions **não implantadas** (billing account não aberta / Blaze)  
2. Secret Manager indisponível sem Blaze  
3. Sem URL pública de webhook em produção  

**Recomendação:** manter V1.1 em **homologação/staging** até Blaze + deploy Functions + smoke curl na URL pública. Depois disso, promover a produção.
