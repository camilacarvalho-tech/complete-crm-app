# Connectors

Every lead source implements **`IConnector`** and lives in this folder.

## Contract

```ts
interface IConnector {
  meta: ConnectorMeta  // id, version, apiVersion, autorizado, enabled, ...
  fetch(ctx): Promise<ConnectorRawRecord[]>
  normalize(raw, ctx): NormalizedLead | null
}
```

## Versioning & deprecation policy

| Field | Meaning |
|-------|---------|
| `meta.id` | Stable identity — never rename (`integracao_api`) |
| `meta.apiVersion` | Contract generation (`1`, `2`, …) |
| `meta.version` | Implementation semver (`1.0.0`, `1.1.0`) |

### Rules

1. **Breaking change** (fetch/normalize shape, required fields, auth) → bump `apiVersion`, keep the previous implementation registered under the old `apiVersion`.
2. **Non-breaking** (bugfix, latency, optional fields) → bump `meta.version` only.
3. Companies may **pin** `connectorId` + `apiVersion` in `leadsMonitorConfig` so upgrades are opt-in in the admin UI.
4. **Deprecation:** after shipping `apiVersion N+1`, keep `N` registered and runnable for **at least one product release**. Mark deprecated in docs/`docsUrl`; do not delete until tenants have migrated.
5. **Removal:** only after zero tenants pin the old `apiVersion` (or master force-upgrade), then drop the old file from `registerConnector`.

Registry key: `id@apiVersion` (see `connectorRegistryKey`).

## Checklist — new connector

1. [ ] Create `nome.connector.ts` implementing `IConnector`
2. [ ] Set `meta.id`, `meta.version`, `meta.apiVersion`
3. [ ] LGPD: `autorizado` + `normalize` rejects rows without legal basis
4. [ ] Register in `index.ts` via `registerConnector`
5. [ ] Do **not** edit `pipeline/` core
6. [ ] Breaking change → bump `apiVersion`, keep previous version registered
7. [ ] Update `ARCHITECTURE.md`
8. [ ] Never store secrets in connector code — use Secret Manager / ciphertext config

## Built-in (V1.1)

| id | Status |
|----|--------|
| `integracao_api` | Production — config por empresa |
| `webhook` | Production — inbox via Cloud Function |
| `formularios_autorizados` | **Demo — não registrado** (`enabled: false`) |
| `bases_publicas_empresas` | **Demo — não registrado** (`enabled: false`) |

## Future (same pattern)

`metaLeadAds`, `googleAds`, `rdStation`, `hubspot`, `crmExterno`
