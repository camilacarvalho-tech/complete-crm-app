import { MessageSquare, Send, Mail, Phone } from 'lucide-react'

interface ModalEnvioRapidoProps {
  show: boolean
  onClose: () => void
  nicho: string
  leadsCount: number
  onEnviar: (config: {
    canais: { whatsapp: boolean; sms: boolean; email: boolean; voip: boolean }
    tipo: 'agora' | 'agendar'
    dataAgendamento?: string
    horaAgendamento?: string
  }) => void
}

export default function ModalEnvioRapido({
  show,
  onClose,
  nicho,
  leadsCount,
  onEnviar
}: ModalEnvioRapidoProps) {
  const [canais, setCanais] = useState({
    whatsapp: true,
    sms: true,
    email: false,
    voip: false
  })
  const [tipoEnvio, setTipoEnvio] = useState<'agora' | 'agendar'>('agora')
  const [dataAgendamento, setDataAgendamento] = useState('')
  const [horaAgendamento, setHoraAgendamento] = useState('09:00')

  if (!show) return null

  const handleEnviar = () => {
    onEnviar({
      canais,
      tipo: tipoEnvio,
      dataAgendamento: tipoEnvio === 'agendar' ? dataAgendamento : undefined,
      horaAgendamento: tipoEnvio === 'agendar' ? horaAgendamento : undefined
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                🚀 Enviar Leads de {nicho}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Configure os canais e agende o envio
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Info de Leads */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {leadsCount}
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-lg">
                  {leadsCount} leads selecionados
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Prontos para receber suas mensagens
                </div>
              </div>
            </div>
          </div>

          {/* Seleção de Canais */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              📱 Escolha os canais de envio:
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* WhatsApp */}
              <button
                onClick={() => setCanais(prev => ({ ...prev, whatsapp: !prev.whatsapp }))}
                className={`p-4 rounded-lg border-2 transition-all ${
                  canais.whatsapp
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-green-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    canais.whatsapp ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 dark:text-white">WhatsApp</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Mensagem instantânea</div>
                  </div>
                  {canais.whatsapp && (
                    <div className="ml-auto text-green-600 dark:text-green-400">✓</div>
                  )}
                </div>
              </button>

              {/* SMS */}
              <button
                onClick={() => setCanais(prev => ({ ...prev, sms: !prev.sms }))}
                className={`p-4 rounded-lg border-2 transition-all ${
                  canais.sms
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    canais.sms ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <Send className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 dark:text-white">SMS</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Mensagem de texto</div>
                  </div>
                  {canais.sms && (
                    <div className="ml-auto text-blue-600 dark:text-blue-400">✓</div>
                  )}
                </div>
              </button>

              {/* E-mail */}
              <button
                onClick={() => setCanais(prev => ({ ...prev, email: !prev.email }))}
                className={`p-4 rounded-lg border-2 transition-all ${
                  canais.email
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-purple-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    canais.email ? 'bg-purple-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 dark:text-white">E-mail</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Marketing por e-mail</div>
                  </div>
                  {canais.email && (
                    <div className="ml-auto text-purple-600 dark:text-purple-400">✓</div>
                  )}
                </div>
              </button>

              {/* VOIP/Discadora */}
              <button
                onClick={() => setCanais(prev => ({ ...prev, voip: !prev.voip }))}
                className={`p-4 rounded-lg border-2 transition-all ${
                  canais.voip
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-orange-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    canais.voip ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      VOIP/Discadora
                      <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">NOVO</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Ligação automática + URA</div>
                  </div>
                  {canais.voip && (
                    <div className="ml-auto text-orange-600 dark:text-orange-400">✓</div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Quando Enviar */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              ⏰ Quando enviar?
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => setTipoEnvio('agora')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  tipoEnvio === 'agora'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-green-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    tipoEnvio === 'agora' ? 'border-green-500' : 'border-slate-300'
                  }`}>
                    {tipoEnvio === 'agora' && <div className="w-3 h-3 rounded-full bg-green-500"></div>}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">Enviar Agora Mesmo</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Disparar imediatamente após configurar as mensagens
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setTipoEnvio('agendar')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  tipoEnvio === 'agendar'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    tipoEnvio === 'agendar' ? 'border-blue-500' : 'border-slate-300'
                  }`}>
                    {tipoEnvio === 'agendar' && <div className="w-3 h-3 rounded-full bg-blue-500"></div>}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 dark:text-white">Agendar para Depois</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Escolher data e horário específico
                    </div>
                  </div>
                </div>

                {tipoEnvio === 'agendar' && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Data
                      </label>
                      <input
                        type="date"
                        value={dataAgendamento}
                        onChange={(e) => setDataAgendamento(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Horário
                      </label>
                      <input
                        type="time"
                        value={horaAgendamento}
                        onChange={(e) => setHoraAgendamento(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleEnviar}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all font-bold"
            >
              ✅ ENVIAR CAMPANHA
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Adicionar import do useState no topo
import { useState } from 'react'
