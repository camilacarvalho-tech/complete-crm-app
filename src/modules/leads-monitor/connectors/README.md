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

## Checklist — new connector

1. [ ] Create `nome.connector.ts` implementing `IConnector`
2. [ ] Set `meta.id`, `meta.version`, `meta.apiVersion`
3. [ ] LGPD: `autorizado` + `normalize` rejects rows without legal basis
4. [ ] Register in `index.ts` via `registerConnector`
5. [ ] Do **not** edit `pipeline/` core
6. [ ] Breaking change → bump `apiVersion`, keep previous version registered
7. [ ] Update `ARCHITECTURE.md`

## Built-in

| id | Status |
|----|--------|
| `formularios_autorizados` | Active (v1) |
| `bases_publicas_empresas` | Active (v1) |
| `integracao_api` | Stub → V1.1 |
| `webhook` | Stub → V1.1 |

## Future (same pattern)

`metaLeadAds`, `googleAds`, `rdStation`, `hubspot`, `crmExterno`
