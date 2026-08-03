# Implementação: Aba de Documentos do Cliente no Chat Center

## O que precisa ser feito:

Adicionar na COLUNA 3 (painel do cliente) do ChatCenter uma nova aba "Documentos" que mostra:

1. **Dados completos do cliente** (Nome completo, CPF, RG, CNH, etc.)
2. **Aba "Documentos"** com lista de documentos do cliente
3. **Botão para fazer upload** de novos documentos
4. **Lista de documentos** com:
   - Nome do documento
   - Tipo (RG, CPF, Comprovante Residência, etc.)
   - Data de envio
   - Status (Aprovado, Pendente, Rejeitado)
   - Botões: Visualizar e Baixar

## Dados Simulados de Documentos:

```typescript
interface Documento {
  id: string
  tipo: 'RG' | 'CPF' | 'CNH' | 'Comprovante Residência' | 'Holerite' | 'IR' | 'Outros'
  nome: string
  dataEnvio: string
  status: 'Aprovado' | 'Pendente' | 'Rejeitado' | 'Em Análise'
  tamanho: string
  url: string
}

const documentosCliente: Documento[] = [
  {
    id: '1',
    tipo: 'RG',
    nome: 'RG_Frente_Verso.pdf',
    dataEnvio: '2024-01-10',
    status: 'Aprovado',
    tamanho: '1.2 MB',
    url: '#'
  },
  {
    id: '2',
    tipo: 'CPF',
    nome: 'CPF_Digitalizado.pdf',
    dataEnvio: '2024-01-10',
    status: 'Aprovado',
    tamanho: '850 KB',
    url: '#'
  },
  {
    id: '3',
    tipo: 'Comprovante Residência',
    nome: 'Conta_Luz_Janeiro.pdf',
    dataEnvio: '2024-01-12',
    status: 'Pendente',
    tamanho: '650 KB',
    url: '#'
  },
  {
    id: '4',
    tipo: 'Holerite',
    nome: 'Holerite_Dezembro_2023.pdf',
    dataEnvio: '2024-01-15',
    status: 'Em Análise',
    tamanho: '420 KB',
    url: '#'
  }
]
```

## Código para adicionar na aba "Documentos":

```tsx
{abaClienteAtiva === 'documentos' && (
  <div className="p-4 space-y-4">
    {/* Header com botão upload */}
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold text-white">Documentos</h3>
      <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
        <Upload className="w-4 h-4" />
        Upload
      </button>
    </div>

    {/* Lista de Documentos */}
    <div className="space-y-3">
      {documentosCliente.map(doc => (
        <div key={doc.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-green-500/30 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex gap-3 flex-1">
              <div className="bg-green-500/10 p-3 rounded-lg">
                <FileText className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium text-sm">{doc.nome}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">{doc.tipo}</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">{doc.tamanho}</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">
                    {new Date(doc.dataEnvio).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    doc.status === 'Aprovado' ? 'bg-green-500/10 text-green-400' :
                    doc.status === 'Pendente' ? 'bg-yellow-500/10 text-yellow-400' :
                    doc.status === 'Rejeitado' ? 'bg-red-500/10 text-red-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors" title="Visualizar">
                <Eye className="w-4 h-4" />
              </button>
              <button className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors" title="Baixar">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Mensagem se não houver documentos */}
    {documentosCliente.length === 0 && (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <p className="text-slate-400 text-sm">Nenhum documento enviado</p>
      </div>
    )}
  </div>
)}
```

## Imports necessários (adicionar no topo):

```typescript
import { Upload, Download, Eye } from 'lucide-react'
```

## Adicionar o botão "Documentos" nas abas:

```tsx
<button
  onClick={() => setAbaClienteAtiva('documentos')}
  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
    abaClienteAtiva === 'documentos'
      ? 'bg-green-600 text-white'
      : 'text-slate-400 hover:text-white hover:bg-slate-700'
  }`}
>
  <FileText className="w-4 h-4" />
  Documentos
</button>
```

## Localização no arquivo:

Procurar por onde está renderizando as abas do cliente (resumo, dados, financeiro) e adicionar a nova aba "documentos".
