import React, { useState, useEffect } from 'react'
import { Download, TrendingUp, TrendingDown, DollarSign, Calendar, FileText, BarChart3, Filter } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ItemDRE {
  label: string
  valor: number
  destaque?: boolean
  subtotal?: boolean
}

interface DadosMensais {
  receitas: number
  despesas: number
  cmv: number
  impostos: number
}

export default function DREЕРP() {
  const [anoSelecionado, setAnoSelecionado] = useState(2026)
  const [mesSelecionado, setMesSelecionado] = useState<number | 'todos'>(7) // Julho ou todos os meses
  const [visualizacao, setVisualizacao] = useState<'mensal' | 'anual'>('mensal')
  
  // Anos disponíveis (2020-2050)
  const anos = Array.from({ length: 31 }, (_, i) => 2020 + i)
  const meses = [
    { numero: 1, nome: 'Janeiro' },
    { numero: 2, nome: 'Fevereiro' },
    { numero: 3, nome: 'Março' },
    { numero: 4, nome: 'Abril' },
    { numero: 5, nome: 'Maio' },
    { numero: 6, nome: 'Junho' },
    { numero: 7, nome: 'Julho' },
    { numero: 8, nome: 'Agosto' },
    { numero: 9, nome: 'Setembro' },
    { numero: 10, nome: 'Outubro' },
    { numero: 11, nome: 'Novembro' },
    { numero: 12, nome: 'Dezembro' }
  ]

  // Simular dados automáticos por mês (na versão final virá do Firestore)
  const gerarDadosMensais = (ano: number, mes: number): DadosMensais => {
    // Aqui você conectará com Recebimentos, Contas a Pagar, Vendas, etc
    const baseReceita = 40000 + (mes * 2000) + Math.random() * 10000
    const baseDespesa = 25000 + (mes * 1000) + Math.random() * 5000
    
    return {
      receitas: Math.round(baseReceita),
      despesas: Math.round(baseDespesa),
      cmv: Math.round(baseReceita * 0.35),
      impostos: Math.round(baseReceita * 0.15)
    }
  }

  // Calcular DRE do período selecionado
  const calcularDRE = () => {
    let receitaBrutaTotal = 0
    let cmvTotal = 0
    let despesasTotal = 0
    let impostosTotal = 0

    if (mesSelecionado === 'todos') {
      // Calcular ano inteiro
      for (let mes = 1; mes <= 12; mes++) {
        const dados = gerarDadosMensais(anoSelecionado, mes)
        receitaBrutaTotal += dados.receitas
        cmvTotal += dados.cmv
        despesasTotal += dados.despesas
        impostosTotal += dados.impostos
      }
    } else {
      // Calcular apenas o mês selecionado
      const dados = gerarDadosMensais(anoSelecionado, mesSelecionado)
      receitaBrutaTotal = dados.receitas
      cmvTotal = dados.cmv
      despesasTotal = dados.despesas
      impostosTotal = dados.impostos
    }

    // Cálculos DRE
    const descontos = Math.round(receitaBrutaTotal * 0.05)
    const devolucoes = Math.round(receitaBrutaTotal * 0.03)
    const receitaLiquida = receitaBrutaTotal - descontos - devolucoes
    
    const lucroBruto = receitaLiquida - cmvTotal
    
    const despesasOperacionais = Math.round(despesasTotal * 0.4)
    const despesasAdministrativas = Math.round(despesasTotal * 0.35)
    const despesasFinanceiras = Math.round(despesasTotal * 0.25)
    
    const lucroOperacional = lucroBruto - despesasOperacionais - despesasAdministrativas - despesasFinanceiras
    const lucroLiquido = lucroOperacional - impostosTotal
    
    const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0
    const margemOperacional = receitaLiquida > 0 ? (lucroOperacional / receitaLiquida) * 100 : 0
    const margemLiquida = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0

    return {
      receitaBruta: receitaBrutaTotal,
      descontos,
      devolucoes,
      receitaLiquida,
      cmv: cmvTotal,
      lucroBruto,
      despesasOperacionais,
      despesasAdministrativas,
      despesasFinanceiras,
      lucroOperacional,
      impostos: impostosTotal,
      lucroLiquido,
      margemBruta,
      margemOperacional,
      margemLiquida
    }
  }

  const dre = calcularDRE()

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(2)}%`
  }

  const exportarPDF = () => {
    window.print()
  }

  const exportarExcel = () => {
    const dadosExportar = [
      { 'Conta': 'Receita Bruta', 'Valor': dre.receitaBruta },
      { 'Conta': '(-) Descontos', 'Valor': -dre.descontos },
      { 'Conta': '(-) Devoluções', 'Valor': -dre.devolucoes },
      { 'Conta': '(=) Receita Líquida', 'Valor': dre.receitaLiquida },
      { 'Conta': '(-) CMV', 'Valor': -dre.cmv },
      { 'Conta': '(=) Lucro Bruto', 'Valor': dre.lucroBruto },
      { 'Conta': '(-) Despesas Operacionais', 'Valor': -dre.despesasOperacionais },
      { 'Conta': '(-) Despesas Administrativas', 'Valor': -dre.despesasAdministrativas },
      { 'Conta': '(-) Despesas Financeiras', 'Valor': -dre.despesasFinanceiras },
      { 'Conta': '(=) Lucro Operacional', 'Valor': dre.lucroOperacional },
      { 'Conta': '(-) Impostos', 'Valor': -dre.impostos },
      { 'Conta': '(=) LUCRO LÍQUIDO', 'Valor': dre.lucroLiquido }
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(dadosExportar)
    
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws, 'DRE')
    
    const nomeMes = mesSelecionado === 'todos' ? 'Anual' : meses.find(m => m.numero === mesSelecionado)?.nome
    XLSX.writeFile(wb, `DRE_${nomeMes}_${anoSelecionado}.xlsx`)
  }

  const getTituloPeriodo = () => {
    if (mesSelecionado === 'todos') {
      return `Ano Completo - ${anoSelecionado}`
    }
    const nomeMes = meses.find(m => m.numero === mesSelecionado)?.nome
    return `${nomeMes}/${anoSelecionado}`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📊 DRE - Demonstrativo de Resultado do Exercício
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Análise completa da performance financeira da empresa
        </p>
      </div>

      {/* Controles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                <Calendar className="w-4 h-4 inline mr-1" />
                Ano:
              </label>
              <select
                value={anoSelecionado}
                onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                {anos.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                <Filter className="w-4 h-4 inline mr-1" />
                Período:
              </label>
              <select
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="todos">Ano Completo</option>
                {meses.map(mes => (
                  <option key={mes.numero} value={mes.numero}>{mes.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportarPDF}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Imprimir PDF
            </button>
            <button
              onClick={exportarExcel}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal - DRE */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Demonstrativo do Resultado - {getTituloPeriodo()}
              </h2>
            </div>

            <div className="p-6 space-y-2">
              {/* Receita Bruta */}
              <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Receita Bruta
                </span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatarMoeda(dre.receitaBruta)}
                </span>
              </div>

              {/* Deduções */}
              <div className="flex justify-between items-center py-2 pl-6">
                <span className="text-gray-600 dark:text-gray-400">
                  (-) Descontos
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {formatarMoeda(dre.descontos)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 pl-6">
                <span className="text-gray-600 dark:text-gray-400">
                  (-) Devoluções
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {formatarMoeda(dre.devolucoes)}
                </span>
              </div>

              {/* Receita Líquida */}
              <div className="flex justify-between items-center py-3 border-y-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20">
                <span className="font-bold text-gray-900 dark:text-white">
                  (=) Receita Líquida
                </span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {formatarMoeda(dre.receitaLiquida)}
                </span>
              </div>

              {/* CMV */}
              <div className="flex justify-between items-center py-3 mt-3">
                <span className="text-gray-600 dark:text-gray-400">
                  (-) Custo das Mercadorias Vendidas (CMV)
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {formatarMoeda(dre.cmv)}
                </span>
              </div>

              {/* Lucro Bruto */}
              <div className="flex justify-between items-center py-3 border-y-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                <span className="font-bold text-gray-900 dark:text-white">
                  (=) Lucro Bruto
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {formatarMoeda(dre.lucroBruto)}
                </span>
              </div>

              {/* Despesas */}
              <div className="flex justify-between items-center py-2 pl-6 mt-3">
                <span className="text-gray-600 dark:text-gray-400">
                  (-) Despesas Operacionais
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {formatarMoeda(dre.despesasOperacionais)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 pl-6">
                <span className="text-gray-600 dark:text-gray-400">
                  (-) Despesas Administrativas
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {formatarMoeda(dre.despesasAdministrativas)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 pl-6">
                <span className="text-gray-600 dark:text-gray-400">
                  (-) Despesas Financeiras
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {formatarMoeda(dre.despesasFinanceiras)}
                </span>
              </div>

              {/* Lucro Operacional */}
              <div className="flex justify-between items-center py-3 border-y-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20">
                <span className="font-bold text-gray-900 dark:text-white">
                  (=) Lucro Operacional
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {formatarMoeda(dre.lucroOperacional)}
                </span>
              </div>

              {/* Impostos */}
              <div className="flex justify-between items-center py-3 mt-3">
                <span className="text-gray-600 dark:text-gray-400">
                  (-) Impostos
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {formatarMoeda(dre.impostos)}
                </span>
              </div>

              {/* Lucro Líquido */}
              <div className="flex justify-between items-center py-4 border-y-4 border-green-600 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 mt-2">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  (=) LUCRO LÍQUIDO
                </span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatarMoeda(dre.lucroLiquido)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Lateral - Indicadores */}
        <div className="space-y-6">
          {/* KPIs Principais */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              📈 Indicadores
            </h3>

            <div className="space-y-4">
              {/* Margem Bruta */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Margem Bruta
                  </span>
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatarPercentual(dre.margemBruta)}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(Math.abs(dre.margemBruta), 100)}%` }}
                  />
                </div>
              </div>

              {/* Margem Operacional */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Margem Operacional
                  </span>
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatarPercentual(dre.margemOperacional)}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${Math.min(Math.abs(dre.margemOperacional), 100)}%` }}
                  />
                </div>
              </div>

              {/* Margem Líquida */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Margem Líquida
                  </span>
                  <DollarSign className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatarPercentual(dre.margemLiquida)}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${Math.min(Math.abs(dre.margemLiquida), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              💡 Resumo Executivo
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${dre.lucroLiquido >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-gray-600 dark:text-gray-400">
                  {dre.lucroLiquido >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${dre.margemBruta >= 30 ? 'bg-green-500' : dre.margemBruta >= 15 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="text-gray-600 dark:text-gray-400">
                  {dre.margemBruta >= 30 ? 'Margem bruta saudável' : dre.margemBruta >= 15 ? 'Margem bruta moderada' : 'Margem bruta baixa'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${dre.lucroOperacional >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-gray-600 dark:text-gray-400">
                  {dre.lucroOperacional >= 0 ? 'Despesas controladas' : 'Despesas elevadas'}
                </span>
              </div>
            </div>

            <div className={`mt-6 p-4 rounded-lg border ${
              dre.lucroLiquido >= 0 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {dre.lucroLiquido >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div>
                  <div className={`font-semibold mb-1 ${
                    dre.lucroLiquido >= 0 
                      ? 'text-green-900 dark:text-green-100' 
                      : 'text-red-900 dark:text-red-100'
                  }`}>
                    {dre.lucroLiquido >= 0 ? 'Performance Positiva' : 'Resultado Negativo'}
                  </div>
                  <div className={`text-xs ${
                    dre.lucroLiquido >= 0 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {dre.lucroLiquido >= 0 ? 'A empresa apresentou lucro líquido de' : 'A empresa apresentou prejuízo de'} {formatarMoeda(Math.abs(dre.lucroLiquido))} 
                    com margem de {formatarPercentual(dre.margemLiquida)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
