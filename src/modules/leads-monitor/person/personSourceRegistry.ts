import type { PersonSourceHealth, PersonSourceKind } from './personSourceTypes'

export type PersonSourceDescriptor = {
  id: string
  label: string
  kind: PersonSourceKind
  health: PersonSourceHealth
  note: string
}

export const PERSON_SOURCE_CATALOG: PersonSourceDescriptor[] = [
  {
    id: 'authorized_employees',
    label: 'Fonte autorizada de funcionários',
    kind: 'PERSON_SOURCE',
    health: 'NAO_CONFIGURADA',
    note: 'API licenciada de funcionários não configurada.',
  },
  {
    id: 'licensed_person_api',
    label: 'API licenciada',
    kind: 'PERSON_SOURCE',
    health: 'NAO_CONFIGURADA',
    note: 'Sem URL/credencial de API de pessoas.',
  },
  {
    id: 'csv',
    label: 'CSV autorizado',
    kind: 'PERSON_SOURCE',
    health: 'ATIVA',
    note: 'Importação CSV do Monitor (quando o arquivo autorizado for enviado).',
  },
  {
    id: 'meta_lead_ads',
    label: 'Meta Lead Ads',
    kind: 'PERSON_SOURCE',
    health: 'NAO_CONFIGURADA',
    note: 'Meta Ads não está conectado.',
  },
  {
    id: 'webhook',
    label: 'Webhook',
    kind: 'PERSON_SOURCE',
    health: 'ATIVA',
    note: 'Inbox/webhook do Monitor, se configurado na empresa.',
  },
  {
    id: 'official_public_persons',
    label: 'Fonte oficial pública',
    kind: 'OFFICIAL_PUBLIC_SOURCE',
    health: 'NAO_CONFIGURADA',
    note: 'Portal de transparência/dados abertos de pessoas não ligado.',
  },
]

export function listPersonSourceDescriptors(): PersonSourceDescriptor[] {
  return PERSON_SOURCE_CATALOG
}
