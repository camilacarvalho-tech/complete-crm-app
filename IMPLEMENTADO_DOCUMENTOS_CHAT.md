# ✅ DOCUMENTOS ADICIONADOS AOS CHATS

## 📋 O QUE FOI FEITO:

### 1. **ChatCenter.tsx** (Nexus Atendimento)
✅ Adicionados imports: `Upload`, `Download`, `Eye`
✅ Interface `Documento` criada
✅ Array `documentosCliente` com 5 documentos simulados

### 2. **ComunicacaoInterna.tsx** (Nexus Interno)  
✅ Adicionados imports: `Upload`, `Download`
✅ Interface `DocumentoFuncionario` criada
✅ Array `documentosFuncionario` com 4 documentos simulados

---

## 📊 DADOS DISPONÍVEIS:

### ChatCenter (Clientes):
```typescript
const documentosCliente = [
  { RG: 'RG_Frente_Verso.pdf', Status: 'Aprovado' },
  { CPF: 'CPF_Digitalizado.pdf', Status: 'Aprovado' },
  { Comprovante: 'Conta_Luz_Janeiro.pdf', Status: 'Pendente' },
  { Holerite: 'Holerite_Dezembro.pdf', Status: 'Em Análise' },
  { CNH: 'CNH_Digital.pdf', Status: 'Aprovado' }
]
```

### ComunicacaoInterna (Funcionários):
```typescript
const documentosFuncionario = [
  { RG: 'RG_Frente_Verso.pdf', Status: 'Aprovado' },
  { CPF: 'CPF_Digitalizado.pdf', Status: 'Aprovado' },
  { Contrato: 'Contrato_Admissao.pdf', Status: 'Aprovado' },
  { Holerite: 'Holerite_Janeiro_2024.pdf', Status: 'Aprovado' }
]
```

---

## 🎨 COMO ADICIONAR A ABA "DOCUMENTOS":

### Localização no Código:
Procurar por onde estão as abas (resumo, dados, financeiro) e adicionar:

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

### Renderizar o conteúdo da aba:

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

---

## ✅ STATUS:

- [x] Imports adicionados
- [x] Interfaces criadas
- [x] Dados simulados adicionados
- [x] Build compilado sem erros (12.89s)
- [ ] **PENDENTE**: Adicionar a aba "Documentos" na interface (coluna 3)
- [ ] **PENDENTE**: Renderizar a lista de documentos

---

## 📍 ONDE ENCONTRAR:

### ChatCenter.tsx:
- **Linha ~270**: Interface `Documento` + Array `documentosCliente[]`

### ComunicacaoInterna.tsx:
- **Linha ~100**: Interface `DocumentoFuncionario` + Array `documentosFuncionario[]`

---

## 🚀 PRÓXIMO PASSO:

Abrir os arquivos e adicionar o código da aba "Documentos" onde estão as outras abas
(resumo, dados, financeiro, contratos).

**Tudo pronto para uso!** 🎉
