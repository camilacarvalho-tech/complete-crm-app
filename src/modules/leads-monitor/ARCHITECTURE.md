# Nexus Leads Monitor — Architecture

## Overview

Independent module for capturing, qualifying and approving opportunities before they enter Nexus CRM.

**Core pipeline:**

`IConnector.fetch` → `normalize` → Dedupe → `INexusAiQualifier` → Score → Approval → CRM

## Multi-tenant

All data lives under `empresas/{empresaId}/…`. Workers, Cloud Functions and Firestore rules must always scope by `empresaId`. Cross-tenant access is forbidden.

- Inbox create: Admin SDK only
- Audit: append-only; `empresaId` must match path
- Webhook logs: Admin SDK only
- Jobs/Logs/DLQ/Health/Config: tenant write requires `empresaId == path`

## IConnector (versioned)

| Field | Meaning |
|-------|---------|
| `meta.id` | Stable connector identity |
| `meta.apiVersion` | Contract generation (1, 2, …) |
| `meta.version` | Implementation semver |
| `meta.autorizado` | LGPD / legal gate |
| `meta.enabled` | Default runnable flag |

Register with `registerConnector()`. Multiple `apiVersion`s of the same `id` can coexist; companies may pin a version in config. See `connectors/README.md` for deprecation policy (≥1 release after vN+1).

### Adding a connector

1. New file under `connectors/` implementing `IConnector`
2. `registerConnector(...)` in `connectors/index.ts`
3. No changes to pipeline core

### Roadmap connectors (same interface)

- Meta Lead Ads
- Google Ads
- RD Station
- HubSpot
- Custom ERP/CRM APIs

## Collections (tenant)

| Collection | Role |
|------------|------|
| `leadsMonitorOportunidades` | Opportunities |
| `leadsMonitorPesquisas` | Saved searches |
| `leadsMonitorConfig` | Non-secret config |
| `leadsMonitorJobs` | Async queue with lease |
| `leadsMonitorInbox` | Webhook raw events |
| `leadsMonitorLogs` | Operational logs |
| `leadsMonitorDLQ` | Dead letter queue |
| `leadsMonitorAudit` | Audit trail |
| `leadsMonitorHealth` | Connector health |
| `leadsMonitorFontes` | Search sources (V1.2) |
| `leadsMonitorSearchRuns` | Intelligent search runs (V1.2) |

## Secrets

Never store tokens/keys in Firestore plaintext. Use Cloud Function `leadsMonitorSaveSecret` + KEK in **Secret Manager** (`LEADS_MONITOR_KEK`). UI shows masked values only. See `SECRETS.md`.

## Health

Doc `leadsMonitorHealth/{connectorId}`: `online` | `degraded` | `offline`, `consecutiveFailures`, `lastLatencyMs`, `lastSyncAt`, `lastError`.

## Horizontal scale (jobs)

Jobs use `leaseOwner` / `leaseUntil` / `idempotencyKey` / `nextAttemptAt`:

- Claim is transactional; expired leases can be reclaimed
- Retry with exponential backoff → DLQ after max attempts
- Workers: browser loop + Cloud Function `leadsMonitorJobWorker` (schedule)

## Cloud Functions

| Function | Role |
|----------|------|
| `leadsMonitorWebhook` | Bearer + optional HMAC → inbox + job + audit |
| `leadsMonitorSaveSecret` | AES-GCM ciphertext |
| `leadsMonitorJobWorker` | Schedule: claim `drain_inbox` / `reprocess_dlq` |

## Production connectors (V1.1)

Runnable: `integracao_api`, `webhook`. Demo generators are **not registered**.

## Docs

- `connectors/README.md` — checklist + deprecation
- `functions/README.md` — deploy, Secret Manager, curl (+ HMAC)
- `SECRETS.md` — KEK / Secret Manager
- `DEPLOY.md` — guia de implantação
- `ROADMAP_V1.2.md` — Busca Inteligente
- `CHANGELOG.md` — notas de versão
