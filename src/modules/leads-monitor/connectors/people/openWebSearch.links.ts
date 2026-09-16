/**
 * Links públicos de consulta manual (sem API de funcionários).
 */
import type { PeopleSource, PeopleSourceResult } from '../../services/peopleSearch/types'

export const openWebSearchLinksSource: PeopleSource = {
  id: 'open_web_links',
  label: 'Links públicos',
  async search(ctx): Promise<PeopleSourceResult> {
    const nome = String(ctx.opportunity.nome || ctx.opportunity.empresaNome || '').trim()
    const cidade = String(ctx.opportunity.cidade || '').trim()
    const q = [nome, cidade].filter(Boolean).join(' ')
    if (!q) {
      return {
        sourceId: 'open_web_links',
        label: 'Links públicos',
        hits: [],
        skipped: true,
        error: 'Nome da empresa ausente para montar buscas públicas.',
      }
    }
    const enc = encodeURIComponent(q)
    return {
      sourceId: 'open_web_links',
      label: 'Links públicos',
      hits: [],
      manuais: [
        {
          platform: 'linkedin',
          label: 'Buscar pessoas no LinkedIn (consulta manual)',
          url: `https://www.linkedin.com/search/results/people/?keywords=${enc}`,
        },
        {
          platform: 'instagram',
          label: 'Buscar no Instagram (consulta manual)',
          url: `https://www.instagram.com/explore/search/keyword/?q=${enc}`,
        },
        {
          platform: 'facebook',
          label: 'Buscar no Facebook (consulta manual)',
          url: `https://www.facebook.com/search/top/?q=${enc}`,
        },
      ],
    }
  },
}
