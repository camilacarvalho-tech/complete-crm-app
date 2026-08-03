import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Loader2, User, Bot } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatNexusIAProps {
  nicho?: string
  produto?: string
  tipo: 'whatsapp' | 'sms' | 'email'
  onMensagemSelecionada?: (mensagem: string) => void
}

export default function ChatNexusIA({ nicho, produto, tipo, onMensagemSelecionada }: ChatNexusIAProps) {
  const [mensagens, setMensagens] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Olá! Sou o **Nexus IA**, seu assistente para criar mensagens persuasivas!\n\nVou te ajudar a criar ${tipo === 'whatsapp' ? 'mensagens de WhatsApp' : tipo === 'sms' ? 'SMS' : 'e-mails'} incríveis para seus clientes${nicho ? ` de **${nicho}**` : ''}${produto ? ` interessados em **${produto}**` : ''}.\n\n💡 **Como posso ajudar:**\n- Criar mensagens personalizadas\n- Sugerir abordagens persuasivas\n- Adaptar o tom de voz\n- Incluir CTAs (chamadas para ação)\n\n**Me diga:** O que você gostaria na mensagem?`,
      timestamp: new Date()
    }
  ])
  const [inputTexto, setInputTexto] = useState('')
  const [carregando, setCarregando] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [mensagens])

  const enviarMensagem = async () => {
    if (!inputTexto.trim() || carregando) return

    const novaMensagemUsuario: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputTexto,
      timestamp: new Date()
    }

    setMensagens(prev => [...prev, novaMensagemUsuario])
    setInputTexto('')
    setCarregando(true)

    // Simular resposta da IA (depois conectar com API real)
    setTimeout(() => {
      const respostaIA = gerarRespostaIA(inputTexto, tipo, nicho, produto)
      const novaMensagemIA: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: respostaIA,
        timestamp: new Date()
      }
      setMensagens(prev => [...prev, novaMensagemIA])
      setCarregando(false)
    }, 1500)
  }

  const gerarRespostaIA = (pergunta: string, tipoMensagem: string, nichoAtual?: string, produtoAtual?: string): string => {
    // Simulação de respostas inteligentes (depois substituir por API real do ChatGPT)
    const perguntaLower = pergunta.toLowerCase()

    if (perguntaLower.includes('exemplo') || perguntaLower.includes('modelo') || perguntaLower.includes('sugestão')) {
      if (tipoMensagem === 'whatsapp') {
        return `📱 **Aqui está um exemplo de mensagem para WhatsApp:**\n\n---\n\nOlá {{nome}}! 👋\n\nIdentifiquei uma oportunidade especial para você!\n\n✅ ${produtoAtual || 'Produto/Serviço'}\n💰 Condições exclusivas\n⏰ Atendimento personalizado\n\nQuer saber mais? Me chama aqui mesmo que te explico tudo! 😊\n\n---\n\n✨ **Dica:** Esta mensagem é amigável, direta e tem call-to-action!\n\n**Deseja usar esta mensagem?** Clique no botão abaixo ou peça ajustes!`
      } else if (tipoMensagem === 'sms') {
        return `📱 **Exemplo de SMS (max 160 caracteres):**\n\n---\n\n{{nome}}, temos condição especial em ${produtoAtual || 'nosso serviço'}! Responda SIM para saber mais. Até breve!\n\n---\n\n✨ **Observação:** SMS precisa ser curto, direto e com CTA claro!\n\n**Quer usar ou ajustar?**`
      } else {
        return `📧 **Exemplo de E-mail:**\n\n**Assunto:** {{nome}}, Oportunidade Especial Esperando Por Você! 🎯\n\n---\n\nOlá {{nome}},\n\nEspero que esteja bem! \n\nIdentifiquei que você tem o perfil perfeito para nossa ${produtoAtual || 'solução exclusiva'}.\n\n**Por que essa oportunidade é para você?**\n✅ Condições especiais\n✅ Atendimento personalizado\n✅ Resultados comprovados\n\n**Próximo passo:** Responda este e-mail ou clique no link abaixo para agendar uma conversa rápida.\n\n[AGENDAR AGORA]\n\nEstou à disposição!\n\nAtenciosamente,\n[Seu Nome]\n\n---\n\n✨ **Este e-mail tem:**\n- Personalização\n- Benefícios claros\n- Call-to-action\n\n**Deseja usar ou modificar?**`
      }
    }

    if (perguntaLower.includes('curto') || perguntaLower.includes('resumido') || perguntaLower.includes('breve')) {
      return `✂️ **Versão curta e objetiva:**\n\n---\n\n{{nome}}, identificamos uma oportunidade para você em ${produtoAtual || 'nosso serviço'}. Quer saber mais? Responda aqui! 😊\n\n---\n\n✨ **Mensagem direta ao ponto!**`
    }

    if (perguntaLower.includes('formal') || perguntaLower.includes('profissional')) {
      return `🎩 **Versão formal:**\n\n---\n\nPrezado(a) {{nome}},\n\nGostaria de apresentar uma oportunidade relacionada a ${produtoAtual || 'nossos serviços'} que pode ser do seu interesse.\n\nEstou à disposição para esclarecer dúvidas e fornecer mais informações.\n\nAguardo seu retorno.\n\nAtenciosamente,\n[Seu Nome]\n\n---\n\n✨ **Tom profissional e respeitoso!**`
    }

    if (perguntaLower.includes('urgência') || perguntaLower.includes('urgente') || perguntaLower.includes('rápido')) {
      return `⚡ **Mensagem com senso de urgência:**\n\n---\n\n{{nome}}, ATENÇÃO! ⚠️\n\nOportunidade limitada em ${produtoAtual || 'nosso serviço'}!\n\n⏰ Válido até [DATA]\n💎 Vagas limitadas\n🎯 Condições especiais\n\nNão perca! Responda AGORA! 🚀\n\n---\n\n✨ **Cria senso de urgência e escassez!**`
    }

    // Resposta padrão inteligente
    return `💡 Entendi! Vou criar algo personalizado para você.\n\nBaseado no que você pediu, que tal esta abordagem:\n\n---\n\n{{nome}}, ${pergunta.includes('?') ? 'temos a solução que você procura' : 'identificamos uma oportunidade exclusiva para você'}!\n\n${produtoAtual ? `✨ **${produtoAtual}**` : '✨ Solução personalizada'}\n\n${tipoMensagem === 'sms' ? 'Responda SIM para saber mais!' : 'Quer conhecer os detalhes? Me chama aqui!'}\n\n---\n\n✨ **Ajustei com base no seu pedido!**\n\n**Ficou bom ou quer que eu mude algo?**`
  }

  const usarMensagem = (mensagem: string) => {
    // Extrair apenas o conteúdo entre os separadores ---
    const match = mensagem.match(/---\n([\s\S]*?)\n---/)
    const conteudoLimpo = match ? match[1].trim() : mensagem
    
    if (onMensagemSelecionada) {
      onMensagemSelecionada(conteudoLimpo)
    }
  }

  return (
    <div className="flex flex-col h-[500px] bg-gradient-to-br from-purple-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 rounded-xl border-2 border-purple-200 dark:border-purple-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex items-center gap-3 shadow-lg">
        <div className="bg-white/20 rounded-full p-2">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">Chat Nexus IA</h3>
          <p className="text-xs opacity-90">Assistente Inteligente de Mensagens</p>
        </div>
        <div className="text-xs bg-white/20 px-3 py-1 rounded-full">
          {tipo === 'whatsapp' ? '📱 WhatsApp' : tipo === 'sms' ? '💬 SMS' : '📧 E-mail'}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensagens.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-purple-100 dark:border-purple-800'
              }`}
            >
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {msg.content.split('\n').map((line, idx) => {
                  // Detectar títulos com **
                  if (line.includes('**')) {
                    const parts = line.split('**')
                    return (
                      <p key={idx} className="mb-1">
                        {parts.map((part, i) =>
                          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                        )}
                      </p>
                    )
                  }
                  // Linha normal
                  return line ? <p key={idx} className="mb-1">{line}</p> : <br key={idx} />
                })}
              </div>
              
              {/* Botão "Usar esta mensagem" para mensagens da IA com conteúdo entre --- */}
              {msg.role === 'assistant' && msg.content.includes('---') && (
                <button
                  onClick={() => usarMensagem(msg.content)}
                  className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all text-sm font-medium shadow-md"
                >
                  ✅ Usar esta mensagem
                </button>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {carregando && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-md border border-purple-100 dark:border-purple-800">
              <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-slate-800 border-t-2 border-purple-200 dark:border-purple-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
            placeholder="Digite sua pergunta ou pedido..."
            className="flex-1 px-4 py-3 border-2 border-purple-200 dark:border-purple-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
            disabled={carregando}
          />
          <button
            onClick={enviarMensagem}
            disabled={!inputTexto.trim() || carregando}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {carregando ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
          💡 Dica: Peça exemplos, ajustes de tom, versões curtas/longas, etc.
        </p>
      </div>
    </div>
  )
}
