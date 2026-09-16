import { useMemo } from 'react'
import { formatMonitorDateTime } from '../utils/datetime'
import type { FontePesquisa } from '../types'
import { lgpdText } from '../catalog/lgpdGovernanca'

const FONTES_CATALOGO = [
  {
    fonte: 'OpenStreetMap / Overpass',
    tipo: 'Dados empresariais',
    finalidade: 'Prospecção empresarial',
    status: 'Disponível',
    origem: 'OSM',
    observacao: 'Dados geográficos abertos. Autorização de uso comercial depende da operação e da licença da fonte.',
  },
  {
    fonte: 'IBGE',
    tipo: 'Dados territoriais',
    finalidade: 'Cobertura geográfica (UF/municípios)',
    status: 'Disponível',
    origem: 'IBGE',
    observacao: 'Lista de municípios. Não é cadastro de pessoas.',
  },
  {
    fonte: 'BrasilAPI',
    tipo: 'Enriquecimento empresarial',
    finalidade: 'Validação/enriquecimento',
    status: 'Disponível',
    origem: 'BrasilAPI',
    observacao: 'Uso conforme disponibilidade da API e finalidade configurada.',
  },
  {
    fonte: 'Site público da empresa',
    tipo: 'Dados empresariais / profissionais públicos',
    finalidade: 'Enriquecimento empresarial',
    status: 'Quando informado',
    origem: 'Site público da empresa',
    observacao: 'Somente conteúdo publicamente acessível já obtido no fluxo. Sem scraping de redes sociais.',
  },
  {
    fonte: 'Base INSS importada',
    tipo: 'Dados pessoais autorizados',
    finalidade: 'Operação INSS',
    status: 'Somente se a operação importar base legitimamente autorizada',
    origem: 'CSV importado',
    observacao: 'Não há consulta massiva de CPF nem lista pública de beneficiários neste módulo.',
  },
] as const

export function FontesPesquisaGovernanca({
  fontes,
}: {
  fontes: FontePesquisa[]
}) {
  const extras = useMemo(
    () =>
      fontes.map((f) => ({
        fonte: f.nome || f.id,
        tipo: f.tipo || 'Não informado',
        finalidade: lgpdText((f as { finalidade?: string }).finalidade),
        status: f.status || 'Não informado',
        ultima: f.atualizadoEm || f.ultimaSyncEm,
        origem: lgpdText(f.connectorId || f.tipo),
        observacao: lgpdText(f.errosRecentes?.[0]?.mensagem),
      })),
    [fontes]
  )

  return (
    <div className="nexus-card p-4 space-y-3">
      <h2 className="text-lg font-semibold">Fontes de Pesquisa</h2>
      <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
        Status de autorização não é afirmado automaticamente. Onde não houver configuração verificada: Não informado.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left" style={{ color: 'var(--code-muted)' }}>
              <th className="p-2">Fonte</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Finalidade</th>
              <th className="p-2">Status</th>
              <th className="p-2">Última consulta</th>
              <th className="p-2">Origem</th>
              <th className="p-2">Observação</th>
            </tr>
          </thead>
          <tbody>
            {FONTES_CATALOGO.map((row) => (
              <tr key={row.fonte} style={{ borderTop: '1px solid var(--code-border)' }}>
                <td className="p-2">{row.fonte}</td>
                <td className="p-2">{row.tipo}</td>
                <td className="p-2">{row.finalidade}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2">Não informado</td>
                <td className="p-2">{row.origem}</td>
                <td className="p-2">{row.observacao}</td>
              </tr>
            ))}
            {extras.map((row) => (
              <tr key={row.fonte} style={{ borderTop: '1px solid var(--code-border)' }}>
                <td className="p-2">{row.fonte}</td>
                <td className="p-2">{String(row.tipo)}</td>
                <td className="p-2">{row.finalidade}</td>
                <td className="p-2">{String(row.status)}</td>
                <td className="p-2">{row.ultima ? formatMonitorDateTime(row.ultima) : 'Não informado'}</td>
                <td className="p-2">{row.origem}</td>
                <td className="p-2">{row.observacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
