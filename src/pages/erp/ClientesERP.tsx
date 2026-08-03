import React, { useState } from 'react'
import { Search, Plus, Edit2, Eye, UserPlus, Phone, Mail } from 'lucide-react'

interface Cliente {
  id: string
  nome: string
  tipo: 'PF' | 'PJ'
  cpfCnpj: string
  telefone: string
  email: string
  cidade: string
  situacao: 'Ativo' | 'Inativo'
  saldoDevedor: number
}

export default function ClientesERP() {
  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('todos')

  const clientes: Cliente[] = [
    { id: '1', nome: 'João Silva', tipo: 'PF', cpfCnpj: '123.456.789-00', telefone: '(31) 99999-1234', email: 'joao@email.com', cidade: 'Belo Horizonte', situacao: 'Ativo', saldoDevedor: 0 },
    { id: '2', nome: 'Maria Santos', tipo: 'PF', cpfCnpj: '987.654.321-00', telefone: '(31) 98888-5678', email: 'maria@email.com', cidade: 'Contagem', situacao: 'Ativo', saldoDevedor: 500 },
    { id: '3', nome: 'Empresa XYZ Ltda', tipo: 'PJ', cpfCnpj: '12.345.678/0001-90', telefone: '(31) 3333-4444', email: 'contato@xyz.com', cidade: 'Betim', situacao: 'Ativo', saldoDevedor: 1200 },
    { id: '4', nome: 'Pedro Costa', tipo: 'PF', cpfCnpj: '555.444.333-22', telefone: '(31) 97777-8888', email: 'pedro@email.com', cidade: 'Nova Lima', situacao: 'Inativo', saldoDevedor: 0 },
  ]

  const clientesFiltrados = clientes.filter(c => {
    const matchBusca = c.nome.toLowerCase().includes(busca.toLowerCase()) || c.cpfCnpj.includes(busca)
    const matchSituacao = filtroSituacao === 'todos' || c.situacao === filtroSituacao
    return matchBusca && matchSituacao
  })

  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          👥 Clientes ERP
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Cadastro completo de clientes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Clientes</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{clientes.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Clientes Ativos</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{clientes.filter(c => c.situacao === 'Ativo').length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Com Saldo Devedor</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{clientes.filter(c => c.saldoDevedor > 0).length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Devedor</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatarMoeda(clientes.reduce((sum, c) => sum + c.saldoDevedor, 0))}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Buscar Cliente
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome ou CPF/CNPJ..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Situação</label>
            <select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white">
              <option value="todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Plus className="w-4 h-4" />
              Novo Cliente
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">CPF/CNPJ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Contato</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cidade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Saldo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{cliente.nome}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{cliente.email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {cliente.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{cliente.cpfCnpj}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <Phone className="w-3 h-3" />
                      {cliente.telefone}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{cliente.cidade}</td>
                  <td className="px-4 py-4">
                    <span className={`text-sm font-bold ${cliente.saldoDevedor > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {formatarMoeda(cliente.saldoDevedor)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      cliente.situacao === 'Ativo' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700'
                    }`}>
                      {cliente.situacao}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="Ver detalhes">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
