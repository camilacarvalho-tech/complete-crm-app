import { X, MessageCircle, Mail } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import type { Proposta } from '../../types/proposta.types'

interface PropostaPreviewProps {
  proposta: Proposta
  whatsapp?: string
  email?: string
  onFechar: () => void
  onMarcarEnviada?: () => void
}

export default function PropostaPreview({ proposta, whatsapp, email, onFechar, onMarcarEnviada }: PropostaPreviewProps) {
  const { darkMode } = useTheme()

  const textoEncoded = encodeURIComponent(proposta.conteudo)
  const linkWhatsApp = whatsapp
    ? `https://wa.me/55${whatsapp.replace(/\D/g, '')}?text=${textoEncoded}`
    : null
  const linkEmail = email
    ? `mailto:${email}?subject=${encodeURIComponent(`Proposta - ${proposta.clienteNome}`)}&body=${textoEncoded}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
        darkMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            Preview — {proposta.clienteNome}
          </h2>
          <button onClick={onFechar} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className={`rounded-xl border p-6 whitespace-pre-wrap text-sm leading-relaxed ${
            darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            {proposta.conteudo}
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            {linkWhatsApp && (
              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noreferrer"
                onClick={onMarcarEnviada}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar WhatsApp
              </a>
            )}
            {linkEmail && (
              <a
                href={linkEmail}
                onClick={onMarcarEnviada}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0047FF] text-white font-medium hover:opacity-90"
              >
                <Mail className="w-4 h-4" />
                Enviar E-mail
              </a>
            )}
            <button onClick={onFechar} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
