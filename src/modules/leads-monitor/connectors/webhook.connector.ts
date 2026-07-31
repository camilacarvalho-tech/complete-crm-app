/**
 * IConnector — consome inbox de webhooks (Cloud Function → Firestore).
 * Inbox create é Admin SDK only; este conector só lê pending e marca processed.
 */
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_INBOX } from '../constants'
import { loadWebhookConfig } from '../services/configStore'
import type {
  ConnectorFetchContext,
  ConnectorRawRecord,
  IConnector,
  NormalizedLead,
} from './types'
import { asBool, asString, getByPath } from './jsonMapper'

export const webhookConnector: IConnector = {
  meta: {
    id: 'webhook',
    label: 'Webhook',
    descricao: 'Leads recebidos via Cloud Function (Bearer + HMAC opcional).',
    autorizado: true,
    enabled: true,
    version: '1.1.0',
    versao: '1.1.0',
    apiVersion: 1,
    tiposSuportados: ['pessoa', 'empresa'],
  },

  async fetch(ctx: ConnectorFetchContext): Promise<ConnectorRawRecord[]> {
    const cfg = await loadWebhookConfig(ctx.empresaId)
    if (!cfg.enabled) return []

    const q = query(
      collection(db, 'empresas', ctx.empresaId, COL_INBOX),
      where('status', '==', 'pending'),
      limit(ctx.limite ?? 20)
    )
    const snap = await getDocs(q)
    const now = new Date().toISOString()
    const out: ConnectorRawRecord[] = []

    for (const d of snap.docs) {
      const data = d.data()
      if (data.empresaId && data.empresaId !== ctx.empresaId) continue
      out.push({
        externalId: data.externalId || d.id,
        fetchedAt: now,
        payload: {
          ...(data.payload || data.body || {}),
          __inboxId: d.id,
          __fonte: data.source || 'webhook',
        },
      })
      await updateDoc(doc(db, 'empresas', ctx.empresaId, COL_INBOX, d.id), {
        status: 'processing',
        updatedAt: serverTimestamp(),
      }).catch(() => {})
    }
    return out
  },

  normalize(raw, ctx): NormalizedLead | null {
    const p = raw.payload
    const nome = asString(getByPath(p, 'nome') || getByPath(p, 'name') || getByPath(p, 'full_name'))
    if (!nome) return null
    const telefone = asString(
      getByPath(p, 'telefone') || getByPath(p, 'phone') || getByPath(p, 'whatsapp')
    )
    const email = asString(getByPath(p, 'email'))
    const cnpj = asString(getByPath(p, 'cnpj'))
    if (!telefone && !email && !cnpj) return null
    if (!asBool(getByPath(p, 'consentimentoLgpd') ?? getByPath(p, 'opt_in'), true)) return null

    const dedupeKey = cnpj
      ? `cnpj:${cnpj.replace(/\D/g, '')}`
      : telefone
        ? `tel:${telefone.replace(/\D/g, '')}`
        : `email:${email.toLowerCase()}`

    // marca inbox processed (best-effort)
    const inboxId = asString(p.__inboxId)
    if (inboxId && ctx.empresaId) {
      updateDoc(doc(db, 'empresas', ctx.empresaId, COL_INBOX, inboxId), {
        status: 'processed',
        updatedAt: serverTimestamp(),
      }).catch(() => {})
    }

    return {
      connectorId: 'webhook',
      connectorVersion: '1.1.0',
      connectorApiVersion: 1,
      origemLabel: 'Webhook',
      dedupeKey,
      tipo: cnpj ? 'empresa' : 'pessoa',
      nome,
      telefone: telefone || undefined,
      email: email || undefined,
      cnpj: cnpj || undefined,
      cidade: asString(getByPath(p, 'cidade') || getByPath(p, 'city')),
      estado: asString(getByPath(p, 'estado') || getByPath(p, 'state')).toUpperCase(),
      segmento: asString(getByPath(p, 'segmento') || getByPath(p, 'segment')),
      consentimentoLgpd: true,
      baseLegal:
        asString(getByPath(p, 'baseLegal')) ||
        'Lead recebido via webhook autenticado (fonte autorizada).',
      externalId: raw.externalId,
      metadados: { fonte: 'webhook', inboxId },
    }
  },
}
