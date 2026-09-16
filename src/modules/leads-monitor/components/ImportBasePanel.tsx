import { useMemo, useState } from 'react'
import { CSV_TARGET_FIELDS, type CsvTargetField } from '../types/processRun'
import { applyMapping, parseCsvTable, previewStats, suggestMapping } from '../pipeline/csvImportMap'

export function ImportBasePanel(props: {
  busy?: boolean
  onStart: (payload: {
    nome: string
    arquivoNome: string
    mapping: Record<string, CsvTargetField | ''>
    rows: Record<string, string>[]
  }) => Promise<void>
}) {
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, CsvTargetField | ''>>({})
  const [nome, setNome] = useState('')
  const [notice, setNotice] = useState('')

  const stats = useMemo(() => previewStats(rows, mapping), [rows, mapping])

  const onFile = async (file: File) => {
    setFileName(file.name)
    setNome(file.name.replace(/\.[^.]+$/, ''))
    if (/\.xlsx?$/i.test(file.name) && !/\.csv$/i.test(file.name)) {
      setNotice('XLSX nativo será suportado em seguida. Exporte CSV por enquanto (UTF-8, ; ou ,).')
    } else {
      setNotice('')
    }
    const text = await file.text()
    const table = parseCsvTable(text)
    setHeaders(table.headers)
    setRows(table.rows)
    setMapping(suggestMapping(table.headers))
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Importar base</h2>
        <p className="text-sm text-slate-500">CSV com pessoas e/ou empresas. Mapeie as colunas antes de processar.</p>
      </div>
      <input
        type="file"
        accept=".csv,text/csv,.txt,.xlsx,.xls"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onFile(f)
        }}
      />
      {notice && <p className="text-xs text-amber-700">{notice}</p>}
      {headers.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div>Linhas: <b>{stats.total}</b></div>
            <div>Colunas: <b>{stats.colunas}</b></div>
            <div>Reconhecidas: <b>{stats.reconhecidas}</b></div>
            <div>Não reconhecidas: <b>{stats.naoReconhecidas}</b></div>
            <div>Duplicados na prévia: <b>{stats.duplicados}</b></div>
            <div>Incompletos: <b>{stats.incompletos}</b></div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left p-2">Coluna do arquivo</th>
                  <th className="text-left p-2">Campo do Monitor</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h) => (
                  <tr key={h} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="p-2">{h}</td>
                    <td className="p-2">
                      <select
                        value={mapping[h] || ''}
                        onChange={(e) => setMapping({ ...mapping, [h]: e.target.value as CsvTargetField | '' })}
                        className="rounded-lg bg-slate-100 dark:bg-slate-700 px-2 py-1"
                      >
                        <option value="">— ignorar —</option>
                        {CSV_TARGET_FIELDS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto max-h-48">
            <table className="min-w-full text-[11px]">
              <thead>
                <tr>
                  {headers.slice(0, 8).map((h) => (
                    <th key={h} className="text-left p-1">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                    {headers.slice(0, 8).map((h) => (
                      <td key={h} className="p-1 truncate max-w-[140px]">{r[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome da base"
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm w-full max-w-md"
          />
          <button
            type="button"
            disabled={props.busy || !rows.length}
            onClick={() =>
              props.onStart({
                nome: nome || fileName || 'Importação',
                arquivoNome: fileName,
                mapping,
                rows: rows.map((r) => applyMapping(r, mapping)),
              })
            }
            className="px-4 py-2.5 bg-nexus-orange text-white rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            Iniciar processamento
          </button>
        </>
      )}
    </div>
  )
}
