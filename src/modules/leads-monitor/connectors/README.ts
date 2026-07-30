/**
 * Como adicionar um novo conector (sem alterar o núcleo):
 *
 * 1. Crie `connectors/meuFonte.connector.ts` implementando `LeadConnector`
 *    (meta + fetch + normalize).
 * 2. Em `connectors/index.ts`, importe e chame `registerConnector(meuFonte)`.
 * 3. Defina `meta.autorizado` e `meta.enabled` conforme LGPD / prontidão.
 *
 * O pipeline (normalize → dedupe → classify → score → approve → CRM)
 * passa a consumir o conector automaticamente.
 */
export {}
