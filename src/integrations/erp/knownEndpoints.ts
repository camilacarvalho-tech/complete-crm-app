/**
 * Endpoints documentados nos projetos reais da Área de Trabalho.
 * Não são rotas inventadas: webhook_server.py, cloud_disparo/api_sync.py, render.yaml.
 */
export const NX_ERP_CLOUD_DISPARO_BASE = 'https://nx-erp-disparo-nuvem.onrender.com'
export const NX_ERP_CLOUD_HEALTH_PATH = '/health'
export const NX_ERP_LOCAL_WEBHOOK_BASE = 'http://127.0.0.1:5000'
export const NX_ERP_LOCAL_HEALTH_PATH = '/health'
export const NX_ERP_CLOUD_JOBS_PATH = '/jobs'

/** Rotas da integração CRM já expostas pelo NX ERP. */
export const NX_ERP_CRM_HEALTH_PATH = '/api/crm/health'
export const NX_ERP_CRM_LEADS_PATH = '/api/crm/leads'
export const NX_ERP_CRM_CLIENTES_PATH = '/api/crm/clientes'
export const NX_ERP_CRM_EVENTOS_PATH = '/api/crm/eventos'

/** Mesmo header já usado em functions/nxErpHealth.js ao chamar o ERP. */
export const NX_ERP_AUTH_HEADER = 'Authorization'
