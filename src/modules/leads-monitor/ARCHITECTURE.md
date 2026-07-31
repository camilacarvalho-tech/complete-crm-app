# Nexus Leads Monitor — Architecture

## Overview

Independent module for capturing, qualifying and approving opportunities before they enter Nexus CRM.

**Core pipeline (unchanged by new connectors):**

`IConnector.fetch` → `normalize` → Dedupe → Classify/Score (Nexus AI hook) → Approval → CRM

## Multi-tenant

All data lives under `empresas/{empresaId}/…`. Workers, Cloud Functions and Firestore rules must always scope by `empresaId`. Cross-tenant access is forbidden.

## IConnector (versioned)

| Field | Meaning |
|-------|---------|
| `meta.id` | Stable connector identity |
| `meta.apiVersion` | Contract generation (1, 2, …) |
| `meta.version` | Implementation semver |
| `meta.autorizado` | LGPD / legal gate |
| `meta.enabled` | Default runnable flag (company config can override later) |

Register with `registerConnector()`. Multiple `apiVersion`s of the same `id` can coexist; companies may pin a version in config.

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
| `leadsMonitorConfig` | Non-secret config (V1.1) |
| `leadsMonitorJobs` | Async queue with lease |
| `leadsMonitorInbox` | Webhook raw events |
| `leadsMonitorLogs` | Operational logs |
| `leadsMonitorDLQ` | Dead letter queue |
| `leadsMonitorAudit` | Audit trail |
| `leadsMonitorHealth` | Connector health |

## Secrets

Never store tokens/keys in Firestore plaintext. Use ciphertext + KEK (Secret Manager / env). UI shows masked values only.

## Horizontal scale

Jobs use `leaseOwner` / `leaseUntil` / `idempotencyKey` so multiple workers can claim without double-processing.

## Docs

- `connectors/README.md` — connector checklist
- `functions/README.md` — webhook deploy (V1.1)
