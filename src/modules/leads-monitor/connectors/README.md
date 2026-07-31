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

## Built-in (V1.1)

| id | Status |
|----|--------|
| `integracao_api` | Production — config por empresa |
| `webhook` | Production — inbox via Cloud Function |
| `formularios_autorizados` | **Demo — não registrado** (`enabled: false`) |
| `bases_publicas_empresas` | **Demo — não registrado** (`enabled: false`) |

## Future (same pattern)

`metaLeadAds`, `googleAds`, `rdStation`, `hubspot`, `crmExterno`
