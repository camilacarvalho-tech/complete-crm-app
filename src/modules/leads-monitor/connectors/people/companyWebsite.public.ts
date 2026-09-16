/**
 * Site público da empresa (URL já conhecida no Monitor).
 * Sem login, sem proxy, sem scraping agressivo. CORS pode impedir a leitura.
 */
import { formatPhoneBrIntl, whatsappMeUrl } from '../../pipeline/normalizeFields'
import type { PeopleSource, PeopleSourceHit, PeopleSourceResult } from '../../services/peopleSearch/types'

function isPublicHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase()
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null
    if (/^(10\.|127\.|169\.254\.|192\.168\.|0\.)/.test(host)) return null
    return url
  } catch {
    return null
  }
}

function extractWhatsapp(html: string): { phone: string; url: string } {
  const me = html.match(/wa\.me\/(\+?55?\d{10,13})/i)
  if (me?.[1]) {
    const phone = formatPhoneBrIntl(me[1])
    return { phone, url: `https://wa.me/${me[1].replace(/\D/g, '')}` }
  }
  const api = html.match(/api\.whatsapp\.com\/send\?[^"'>\s]*phone=(\+?55?\d{10,13})/i)
  if (api?.[1]) {
    const phone = formatPhoneBrIntl(api[1])
    const digits = api[1].replace(/\D/g, '')
    return { phone, url: `https://api.whatsapp.com/send?phone=${digits}` }
  }
  return { phone: '', url: '' }
}

function extractPhones(html: string): string[] {
  const found = new Set<string>()
  const tel = html.matchAll(/tel:(\+?55?\d{10,13})/gi)
  for (const m of tel) {
    const formatted = formatPhoneBrIntl(m[1])
    if (formatted) found.add(formatted)
  }
  return Array.from(found)
}

function extractSocial(html: string, pageUrl: string): Pick<PeopleSourceHit, 'linkedinUrl' | 'instagramUrl' | 'facebookUrl'> {
  const abs = (href: string) => {
    try {
      return new URL(href, pageUrl).toString()
    } catch {
      return ''
    }
  }
  const hrefs = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map((m) => abs(m[1]))
  const linkedinUrl = hrefs.find((u) => /linkedin\.com\/(in|company)\//i.test(u)) || ''
  const instagramUrl = hrefs.find((u) => /instagram\.com\/[A-Za-z0-9._]+/i.test(u)) || ''
  const facebookUrl = hrefs.find((u) => /facebook\.com\//i.test(u) && !/facebook\.com\/sharer/i.test(u)) || ''
  return { linkedinUrl, instagramUrl, facebookUrl }
}

export const companyWebsiteSource: PeopleSource = {
  id: 'company_website',
  label: 'Site público',
  async search(ctx): Promise<PeopleSourceResult> {
    const raw = String(ctx.opportunity.website || ctx.opportunity.dominio || '').trim()
    const url = raw ? isPublicHttpUrl(raw) : null
    if (!url) {
      return {
        sourceId: 'company_website',
        label: 'Site público',
        hits: [],
        skipped: true,
        error: 'Empresa sem website público no Monitor.',
      }
    }

    const pageUrl = url.toString()
    const waFromUrl = extractWhatsapp(pageUrl)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 10000)
    try {
      const res = await fetch(pageUrl, {
        signal: ctrl.signal,
        headers: { Accept: 'text/html' },
      })
      if (!res.ok) {
        return {
          sourceId: 'company_website',
          label: 'Site público',
          hits: [],
          companyWhatsapp: waFromUrl.phone,
          companyWhatsappUrl: waFromUrl.url,
          error: `Site HTTP ${res.status}`,
        }
      }
      const html = (await res.text()).slice(0, 400_000)
      const social = extractSocial(html, pageUrl)
      const wa = extractWhatsapp(html)
      const phones = extractPhones(html)
      const companyPhone = phones[0] || ''
      const companyWhatsapp = wa.phone || waFromUrl.phone
      const companyWhatsappUrl = wa.url || waFromUrl.url || (companyWhatsapp ? whatsappMeUrl(companyWhatsapp) : '')

      const hits: PeopleSourceHit[] = []
      const inProfile = social.linkedinUrl && /linkedin\.com\/in\//i.test(social.linkedinUrl)
      if (inProfile) {
        hits.push({
          personName: 'Perfil LinkedIn público (site da empresa)',
          jobTitle: '',
          relationToCompany: 'profissional_relacionado',
          phone: '',
          phoneType: 'nao_identificado',
          phoneSource: '',
          phoneSourceUrl: '',
          whatsapp: '',
          whatsappSource: '',
          whatsappSourceUrl: '',
          whatsappVerified: false,
          source: 'company_website',
          sourceUrl: pageUrl,
          sourceName: 'Site oficial da empresa',
          confidence: 45,
          linkedinUrl: social.linkedinUrl,
          instagramUrl: '',
          facebookUrl: '',
        })
      }

      return {
        sourceId: 'company_website',
        label: 'Site público',
        hits,
        companyPhone,
        companyWhatsapp,
        companyWhatsappUrl,
        manuais: [
          social.linkedinUrl && !inProfile
            ? { platform: 'linkedin', label: 'LinkedIn da empresa', url: social.linkedinUrl }
            : null,
          social.instagramUrl ? { platform: 'instagram', label: 'Instagram', url: social.instagramUrl } : null,
          social.facebookUrl ? { platform: 'facebook', label: 'Facebook', url: social.facebookUrl } : null,
        ].filter(Boolean) as PeopleSourceResult['manuais'],
      }
    } catch (e: any) {
      return {
        sourceId: 'company_website',
        label: 'Site público',
        hits: [],
        companyWhatsapp: waFromUrl.phone,
        companyWhatsappUrl: waFromUrl.url,
        error: e?.message || 'Site indisponível no navegador (CORS/rede).',
      }
    } finally {
      clearTimeout(timer)
    }
  },
}
