/**
 * ONBOARDING DE EMPRESA - CREDFLOW PLATFORM 2.0
 * Fluxo de cadastro em 3 passos:
 * 1. Escolha do Nicho (6 opções)
 * 2. Seleção de Módulos (checkboxes)
 * 3. Dados da Empresa
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from '../firebase'
import {
  NichoEmpresa,
  StatusEmpresa,
  PerfilUsuario,
  Empresa,
  Usuario
} from '../types/database.types'
import {
  Building2,
  Stethoscope,
  Smile,
  Brain,
  Apple,
  Dumbbell,
  CheckCircle2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react'

// ============================================
// TIPOS
// ============================================

interface NichoOption {
  value: NichoEmpresa
  label: string
  icon: React.ReactNode
  description: string
  color: string
}

interface ModuloOption {
  id: string
  nome: string
  descricao: string
  obrigatorio: boolean
}

interface OnboardingFormData {
  // Passo 1: Nicho
  nicho: NichoEmpresa | null
  
  // Passo 2: Módulos
  modulosSelecionados: string[]
  
  // Passo 3: Dados da Empresa
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  cpf: string
  responsavel: string
  telefone: string
  email: string
  senha: string
  confirmarSenha: string
  
  // Endereço
  cep: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

// ============================================
// OPÇÕES DE NICHO
// ============================================

const NICHOS: NichoOption[] = [
  {
    value: NichoEmpresa.CORRESPONDENTE_BANCARIO,
    label: 'Correspondente Bancário',
    icon: <Building2 size={32} />,
    description: 'INSS, FGTS, CLT, SIAPE, Refinanciamento',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    value: NichoEmpresa.CLINICA_MEDICA,
    label: 'Clínica Médica',
    icon: <Stethoscope size={32} />,
    description: 'Prontuário, Agenda, Convênios, Exames',
    color: 'from-green-500 to-emerald-500'
  },
  {
    value: NichoEmpresa.ODONTOLOGIA,
    label: 'Odontologia',
    icon: <Smile size={32} />,
    description: 'Odontograma, Tratamentos, Radiografias',
    color: 'from-purple-500 to-pink-500'
  },
  {
    value: NichoEmpresa.PSICOLOGIA,
    label: 'Psicologia',
    icon: <Brain size={32} />,
    description: 'Sessões, Prontuário Psicológico, Recibos',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    value: NichoEmpresa.NUTRICAO,
    label: 'Nutrição',
    icon: <Apple size={32} />,
    description: 'Avaliação, Plano Alimentar, Evolução',
    color: 'from-orange-500 to-red-500'
  },
  {
    value: NichoEmpresa.ACADEMIA,
    label: 'Academia',
    icon: <Dumbbell size={32} />,
    description: 'Treinos, Avaliações Físicas, Personal',
    color: 'from-red-500 to-pink-500'
  }
]

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const Onboarding: React.FC = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modulosDisponiveis, setModulosDisponiveis] = useState<ModuloOption[]>([])

  const [formData, setFormData] = useState<OnboardingFormData>({
    nicho: null,
    modulosSelecionados: [],
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    cpf: '',
    responsavel: '',
    telefone: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: ''
  })

  // Carregar módulos disponíveis quando o nicho for selecionado
  useEffect(() => {
    if (formData.nicho) {
      loadModulos()
    }
  }, [formData.nicho])

  const loadModulos = async () => {
    try {
      // Aqui carregaria do Firestore, mas como ainda não populamos, vamos usar mock
      const modulosMock: ModuloOption[] = [
        { id: '1', nome: 'CRM / Clientes', descricao: 'Gestão de leads e clientes', obrigatorio: true },
        { id: '2', nome: 'Pipeline', descricao: 'Funil de vendas Kanban', obrigatorio: true },
        { id: '3', nome: 'Chat Center', descricao: 'Central omnichannel', obrigatorio: true },
        { id: '4', nome: 'Campanhas', descricao: 'Marketing digital', obrigatorio: true },
        { id: '5', nome: 'SMS', descricao: 'Disparos de SMS', obrigatorio: true },
        { id: '6', nome: 'Financeiro', descricao: 'Fluxo de caixa', obrigatorio: true },
        { id: '7', nome: 'Relatórios', descricao: 'BI e Analytics', obrigatorio: true },
        { id: '8', nome: 'Agenda', descricao: 'Agendamento de consultas', obrigatorio: false },
        { id: '9', nome: 'Estoque', descricao: 'Controle de materiais', obrigatorio: false }
      ]

      // Pre-selecionar módulos obrigatórios
      const obrigatorios = modulosMock.filter(m => m.obrigatorio).map(m => m.id)
      setFormData(prev => ({ ...prev, modulosSelecionados: obrigatorios }))
      setModulosDisponiveis(modulosMock)
    } catch (err) {
      console.error('Erro ao carregar módulos:', err)
    }
  }

  // Buscar CEP
  const buscarCEP = async (cep: string) => {
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
        const data = await response.json()
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            estado: data.uf
          }))
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err)
      }
    }
  }

  // Finalizar cadastro
  const handleSubmit = async () => {
    setError('')
    
    // Validações
    if (!formData.nicho) {
      setError('Selecione um nicho')
      return
    }

    if (formData.modulosSelecionados.length === 0) {
      setError('Selecione pelo menos um módulo')
      return
    }

    if (!formData.nomeFantasia || !formData.email || !formData.senha) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    try {
      // 1. Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.senha
      )

      // 2. Criar empresa no Firestore
      const empresaData: Omit<Empresa, 'id'> = {
        razaoSocial: formData.razaoSocial || formData.nomeFantasia,
        nomeFantasia: formData.nomeFantasia,
        cnpj: formData.cnpj,
        cpf: formData.cpf,
        responsavel: formData.responsavel,
        telefone: formData.telefone,
        email: formData.email,
        nicho: formData.nicho,
        planoId: 'basico', // Definir plano padrão
        status: StatusEmpresa.TRIAL,
        dataInicio: new Date(),
        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        valorPlano: 0,
        qtdFuncionariosInclusos: 5,
        valorFuncionarioExtra: 0,
        cep: formData.cep,
        endereco: formData.endereco,
        numero: formData.numero,
        complemento: formData.complemento,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
        criadoEm: new Date(),
        atualizadoEm: new Date()
      }

      const empresaRef = await addDoc(collection(db, 'empresas'), empresaData)

      // 3. Criar usuário Empresário no Firestore
      const usuarioData: Omit<Usuario, 'id'> = {
        empresaId: empresaRef.id,
        nome: formData.responsavel,
        email: formData.email,
        telefone: formData.telefone,
        perfil: PerfilUsuario.EMPRESARIO,
        verFilaGeral: true,
        verFinanceiroEquipe: true,
        verRelatoriosEmpresa: true,
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date()
      }

      await addDoc(collection(db, 'usuarios'), {
        ...usuarioData,
        id: userCredential.user.uid
      })

      // 4. Criar empresa_modulos (ativar módulos selecionados)
      for (const moduloId of formData.modulosSelecionados) {
        await addDoc(collection(db, 'empresa_modulos'), {
          empresaId: empresaRef.id,
          moduloId,
          ativo: true,
          criadoEm: new Date()
        })
      }

      console.log('✅ Empresa criada com sucesso!')
      
      // Redirecionar para o dashboard
      navigate('/dashboard')
    } catch (err: any) {
      console.error('❌ Erro ao criar empresa:', err)
      setError(err.message || 'Erro ao criar empresa. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep === 1 && !formData.nicho) {
      setError('Selecione um nicho para continuar')
      return
    }
    if (currentStep === 2 && formData.modulosSelecionados.length === 0) {
      setError('Selecione pelo menos um módulo')
      return
    }
    setError('')
    setCurrentStep(prev => prev + 1)
  }

  const prevStep = () => {
    setError('')
    setCurrentStep(prev => prev - 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Bem-vindo ao <span className="text-orange-500">CredFlow Platform 2.0</span>
          </h1>
          <p className="text-slate-400">
            Configure sua empresa em {currentStep === 1 ? '3 passos simples' : `${3 - currentStep + 1} ${currentStep === 3 ? 'último passo' : 'passos restantes'}`}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step <= currentStep
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {step < currentStep ? <CheckCircle2 size={20} /> : step}
              </div>
              {step < 3 && (
                <div
                  className={`w-20 h-1 mx-2 ${
                    step < currentStep ? 'bg-orange-500' : 'bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-center gap-8 mb-8">
          <span className={`text-sm ${currentStep === 1 ? 'text-orange-500 font-semibold' : 'text-slate-500'}`}>
            1. Escolha o Nicho
          </span>
          <span className={`text-sm ${currentStep === 2 ? 'text-orange-500 font-semibold' : 'text-slate-500'}`}>
            2. Selecione Módulos
          </span>
          <span className={`text-sm ${currentStep === 3 ? 'text-orange-500 font-semibold' : 'text-slate-500'}`}>
            3. Dados da Empresa
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Content Card */}
        <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">

          {/* PASSO 1: Escolha do Nicho */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Qual é o seu segmento?
              </h2>
              <p className="text-slate-400 mb-6">
                Escolha o nicho que melhor representa seu negócio
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {NICHOS.map((nicho) => (
                  <button
                    key={nicho.value}
                    onClick={() => setFormData({ ...formData, nicho: nicho.value })}
                    className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                      formData.nicho === nicho.value
                        ? `border-orange-500 bg-gradient-to-br ${nicho.color} shadow-lg`
                        : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className={`${formData.nicho === nicho.value ? 'text-white' : 'text-slate-400'}`}>
                        {nicho.icon}
                      </div>
                      <h3 className={`font-semibold ${formData.nicho === nicho.value ? 'text-white' : 'text-slate-200'}`}>
                        {nicho.label}
                      </h3>
                      <p className={`text-xs ${formData.nicho === nicho.value ? 'text-white/80' : 'text-slate-400'}`}>
                        {nicho.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 2: Seleção de Módulos */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Quais módulos você deseja?
              </h2>
              <p className="text-slate-400 mb-6">
                Os módulos obrigatórios já estão selecionados. Você pode adicionar mais conforme sua necessidade.
              </p>

              <div className="space-y-3">
                {modulosDisponiveis.map((modulo) => (
                  <label
                    key={modulo.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.modulosSelecionados.includes(modulo.id)
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                    } ${modulo.obrigatorio ? 'opacity-75' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.modulosSelecionados.includes(modulo.id)}
                      disabled={modulo.obrigatorio}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            modulosSelecionados: [...formData.modulosSelecionados, modulo.id]
                          })
                        } else {
                          setFormData({
                            ...formData,
                            modulosSelecionados: formData.modulosSelecionados.filter(id => id !== modulo.id)
                          })
                        }
                      }}
                      className="mt-1 w-5 h-5 rounded border-slate-500 text-orange-500 focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{modulo.nome}</h3>
                        {modulo.obrigatorio && (
                          <span className="text-xs px-2 py-0.5 bg-orange-500 text-white rounded-full">
                            Obrigatório
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{modulo.descricao}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 3: Dados da Empresa */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Dados da Empresa
              </h2>
              <p className="text-slate-400 mb-6">
                Preencha as informações da sua empresa
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome Fantasia */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    value={formData.nomeFantasia}
                    onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Como sua empresa é conhecida"
                  />
                </div>

                {/* Razão Social */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={formData.razaoSocial}
                    onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Nome jurídico da empresa"
                  />
                </div>

                {/* CNPJ/CPF */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    CPF (se MEI/Autônomo)
                  </label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="000.000.000-00"
                  />
                </div>

                {/* Responsável */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Responsável *
                  </label>
                  <input
                    type="text"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Nome completo"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="seuemail@empresa.com"
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Senha *
                  </label>
                  <input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                {/* Confirmar Senha */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmarSenha}
                    onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Repita a senha"
                  />
                </div>

                {/* CEP */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => {
                      const cep = e.target.value.replace(/\D/g, '')
                      setFormData({ ...formData, cep })
                      if (cep.length === 8) buscarCEP(cep)
                    }}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="00000-000"
                    maxLength={8}
                  />
                </div>

                {/* Endereço */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Rua, Avenida..."
                  />
                </div>

                {/* Número e Complemento */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Sala, Andar..."
                  />
                </div>

                {/* Bairro, Cidade, Estado */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Bairro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Cidade"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                currentStep === 1
                  ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-500'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              <ArrowLeft size={20} />
              Voltar
            </button>

            {currentStep < 3 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all"
              >
                Próximo
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando...' : 'Finalizar Cadastro'}
                <CheckCircle2 size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Onboarding
