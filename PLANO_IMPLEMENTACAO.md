# 📋 PLANO DE IMPLEMENTAÇÃO - NEXUS CRM
**Data:** Para amanhã
**Status:** Planejamento completo

---

## 🎯 VISÃO GERAL

Sistema completo de CRM + ERP integrado com foco em tempo real e automação inteligente.

---

## 📊 1. DASHBOARD (Empresário - Tempo Real)

### **Objetivo:** Tela executiva com KPIs em tempo real

### **Implementações:**
- ✅ **KPIs em Tempo Real:**
  - Receita do dia/mês/ano
  - Total de clientes ativos
  - Leads em prospecção
  - Taxa de conversão
  - Ticket médio
  - Faturamento previsto vs realizado

- ✅ **Funis de Vendas Visuais:**
  - Funil de conversão (Leads → Clientes)
  - Funil de pipeline por etapa
  - Funil de campanhas (Enviados → Abertos → Respondidos → Convertidos)
  - Taxa de conversão em cada etapa

- ✅ **Gráficos em Tempo Real:**
  - Faturamento diário (linha)
  - Clientes por nicho (pizza)
  - Performance de atendentes (barras)
  - Leads por fonte (barras horizontais)
  - Evolução mensal (área)

- ✅ **Alertas Importantes:**
  - Contas a vencer hoje
  - Clientes sem contato há X dias
  - Metas não atingidas
  - Problemas no financeiro

---

## 🔄 2. PIPELINE (Funcionários)

### **Objetivo:** Kanban visual para gestão de leads/clientes

### **Implementações:**
- ✅ **Visão por Atendente:**
  - Cada funcionário vê SEUS clientes
  - Empresário vê TODOS os clientes de todos atendentes

- ✅ **Colunas Personalizáveis:**
  - Novo Lead
  - Primeiro Contato
  - Proposta Enviada
  - Negociação
  - Ganho
  - Perdido

- ✅ **Cards dos Clientes:**
  - Nome + CPF
  - Telefone
  - Status (Quente/Frio/Morno)
  - Última interação
  - Valor da proposta
  - Atendente responsável
  - Arrastar e soltar entre colunas

- ✅ **Filtros:**
  - Por atendente
  - Por nicho
  - Por status
  - Por data
  - Por valor

---

## 📝 3. ANOTAÇÕES E RETORNOS

### **Objetivo:** Gestão de follow-up e lembretes

### **Implementações:**
- ✅ **Anotações Rápidas:**
  - Criar anotação em qualquer cliente
  - Tags coloridas (Urgente, Importante, Normal)
  - Anexar arquivos
  - Mencionar outros usuários (@nome)

- ✅ **Retornos Agendados:**
  - Agendar ligação de retorno
  - Data + Hora + Motivo
  - Notificação push quando chegar a hora
  - Marcar como "Retorno Feito"

- ✅ **Histórico Completo:**
  - Ver todas anotações de um cliente
  - Filtrar por data
  - Ver quem criou cada anotação
  - Editar/Excluir (com permissão)

- ✅ **Permissões:**
  - Empresário: vê tudo de todos
  - Funcionário: vê suas próprias + clientes dele

---

## 💬 4. CHAT CENTER (Sincronizado com Clientes)

### **Objetivo:** Gestão completa de conversas WhatsApp integrada

### **Implementações:**

### **4.1. Lista de Conversas (Esquerda)**
- ✅ Nome do cliente
- ✅ Última mensagem (preview)
- ✅ Horário da última mensagem
- ✅ **Status:**
  - 🟢 Não lida (em negrito)
  - ⚪ Lida
  - ⏰ Aguardando resposta
  - ✅ Finalizada

- ✅ **Indicadores Visuais:**
  - Badge com número de mensagens não lidas
  - Ícone de atendente responsável
  - Prioridade (⭐ VIP, 🔥 Urgente)

### **4.2. Fila de Atendimento**
- ✅ Cliente entra na fila automaticamente
- ✅ Atendente clica em "Pegar Cliente" da fila
- ✅ Cliente fica atribuído ao atendente
- ✅ Empresário vê qual atendente pegou qual cliente
- ✅ Transferir cliente entre atendentes

### **4.3. Área de Conversa (Centro)**
- ✅ **Mensagens com:**
  - Data e hora (formatado: "Hoje 14:23" ou "Ontem 09:15")
  - Status de envio (Enviado ✓, Entregue ✓✓, Lido ✓✓ azul)
  - Separador visual por dia
  - Mensagens do cliente (esquerda, cinza)
  - Mensagens do atendente (direita, verde)

- ✅ **Edição de Mensagens:**
  - Botão de editar (✏️) em cada mensagem enviada
  - Modal para editar texto
  - Salvar histórico de edições
  - Mostrar "Editado às 15:30" abaixo da mensagem

- ✅ **Campo de Texto:**
  - Textarea expansível
  - Botão de enviar (Enter para enviar, Shift+Enter para quebra de linha)
  - Emoji picker
  - Anexar arquivos (imagens, PDFs, áudios)
  - Mensagens rápidas (templates)

### **4.4. Painel Lateral Direito (Info do Cliente)**
- ✅ **Dados do Cliente (sincronizado com Clientes):**
  - Nome completo
  - CPF
  - Telefone
  - Email
  - Cidade/Estado
  - **Botão "Editar Cliente"** → Abre modal com formulário completo

- ✅ **Status do Atendimento:**
  - Atendente responsável
  - Data/hora do primeiro contato
  - Tempo total de conversa
  - Última interação

- ✅ **Ações Rápidas:**
  - ✅ Marcar como Lida
  - ❌ Marcar como Não Lida
  - ⏰ Agendar Retorno
  - 📝 Adicionar Anotação
  - 🔄 Transferir Atendente
  - ✓ Finalizar Atendimento

### **4.5. Sincronização com Clientes**
- ✅ Quando editar cliente no Chat → atualiza na aba Clientes
- ✅ Quando editar cliente na aba Clientes → atualiza no Chat
- ✅ Histórico de conversas salvo no perfil do cliente
- ✅ Ver conversa completa em "Clientes" → "Ver Chat"

---

## 📣 5. CAMPANHAS (Melhorias)

### **Objetivo:** Facilitar criação de mensagens com IA

### **Implementações:**
- ✅ **Janela IA Integrada nos Modais:**
  - Quando clicar "Configurar Mensagem WhatsApp/SMS/Email"
  - Abrir janela MAIOR com Chat IA do lado esquerdo
  - Campo de texto do lado direito
  - IA sugere mensagens baseadas em:
    - Nicho
    - Produto
    - Tipo de campanha (oferta, confirmação, cobrança)
    - Tom (formal, informal, urgente)

- ✅ **Templates Prontos:**
  - Biblioteca de templates salvos
  - Favoritar templates
  - Duplicar e editar

- ✅ **Preview em Tempo Real:**
  - Ver como a mensagem vai ficar no WhatsApp
  - Substituir variáveis: {{nome}}, {{cpf}}, {{margem}}

---

## 🤖 6. IA PROSPECÇÃO (Configuração Avançada)

### **Objetivo:** Controle total do robô de prospecção

### **Implementações:**

### **6.1. Modal de Configuração ao Salvar**
Quando clicar em "Salvar Configurações", abre modal:

```
┌─────────────────────────────────────────────────┐
│  🤖 Configurar Robô de Prospecção               │
│                                                 │
│  📋 Nicho: [Correspondente Bancário ▼]          │
│                                                 │
│  📦 Produtos/Serviços para Buscar:              │
│  ☑️ INSS                                        │
│  ☑️ FGTS                                        │
│  ☐ CLT                                          │
│  ☑️ Siape                                       │
│                                                 │
│  🎯 Quantos clientes buscar?                    │
│  [500] clientes por dia                         │
│                                                 │
│  🔥 Prioridade:                                 │
│  ⚪ Todos os leads                              │
│  🔘 Apenas leads QUENTES (margem > R$ 1.000)    │
│                                                 │
│  📍 Região (opcional):                          │
│  [ ] Filtrar por cidade/estado                  │
│                                                 │
│  [Cancelar]  [💾 SALVAR E INICIAR ROBÔ]         │
└─────────────────────────────────────────────────┘
```

### **6.2. Tráfego Pago (Nova Seção)**
- ✅ **Aba "Tráfego Pago"** dentro de IA Prospecção
- ✅ **Métricas:**
  - Investimento total (R$)
  - Custo por lead (CPL)
  - Custo por aquisição (CPA)
  - Taxa de conversão (%)
  - ROI (Retorno sobre Investimento)
  - Leads gerados
  - Clientes convertidos

- ✅ **Campanhas de Tráfego:**
  - Google Ads
  - Facebook Ads
  - Instagram Ads
  - TikTok Ads
  - LinkedIn Ads

- ✅ **Tabela de Campanhas:**
  - Nome da campanha
  - Plataforma
  - Investimento
  - Leads gerados
  - CPL
  - Status (Ativa/Pausada)

---

## ☎️ 7. VOIP/DISCADORA (Melhorias)

### **Objetivo:** Mensagens personalizáveis e templates inteligentes

### **Implementações:**

### **7.1. Editor de Mensagens**
- ✅ Botão "✏️ Personalizar Mensagem"
- ✅ Modal para editar:
  - Texto da mensagem
  - Variáveis disponíveis: {{nome}}, {{empresa}}, {{data}}, {{hora}}, {{produto}}, {{margem}}
  - Preview em tempo real
  - Salvar como template

### **7.2. Templates por Nicho**
- ✅ **CORRESPONDENTE - Ofertas:**
  - Crédito consignado quente
  - Oferta especial
  - Taxa reduzida
  - Margem alta disponível

- ✅ **SAÚDE - Confirmações:**
  - Confirmar consulta amanhã
  - Confirmar consulta hoje
  - Lembrete 1 hora antes
  - Reagendamento disponível

- ✅ **ACADEMIA - Renovação:**
  - Plano vencendo em 7 dias
  - Plano vencendo hoje
  - Oferta de renovação
  - Nova modalidade disponível

### **7.3. Configuração das Opções (1, 2, 3)**
- ✅ Editar o que cada tecla faz
- ✅ Configurar ação após apertar:
  - Tecla 1 → Transferir para fila de atendimento
  - Tecla 2 → Enviar WhatsApp automático
  - Tecla 3 → Remover da lista + salvar como "Não interessado"

---

## 📈 8. MARKETING ROI (Completo)

### **Objetivo:** Visão 360° do marketing

### **Implementações:**

### **8.1. Dashboard de Marketing**
- ✅ **Investimento Total:**
  - Tráfego Pago
  - Campanhas WhatsApp/SMS
  - VOIP/Discadora
  - Outras mídias

- ✅ **Retorno (Receita):**
  - Vendas geradas por campanhas
  - Ticket médio
  - LTV (Lifetime Value) por cliente

- ✅ **ROI Calculado:**
  - ROI = (Receita - Investimento) / Investimento × 100
  - Gráfico de evolução mensal
  - Comparativo mês a mês

### **8.2. Performance por Canal**
- ✅ Tabela:
  - Canal (Google Ads, WhatsApp, SMS, VOIP)
  - Investimento
  - Leads gerados
  - Conversões
  - ROI %
  - Melhor/Pior desempenho (destaque visual)

### **8.3. Custo por Lead (CPL) e CPA**
- ✅ CPL médio geral
- ✅ CPL por canal
- ✅ CPA (Custo por Aquisição) médio
- ✅ Alertas quando CPL ultrapassar meta

---

## ❌ 9. REMOVER ABA SMS

- ✅ Remover do menu lateral
- ✅ Remover rota do App.tsx
- ✅ Manter funcionalidade de SMS dentro de **Campanhas**

---

## 💰 10. FINANCEIRO (Reestruturação)

### **Objetivo:** Gestão financeira operacional

### **Implementações:**
- ✅ **Fluxo de Caixa Simplificado:**
  - Entradas do dia/mês
  - Saídas do dia/mês
  - Saldo atual
  - Gráfico simples de entradas vs saídas

- ✅ **Pagamento de Funcionários:**
  - Lista de funcionários
  - Salário base + comissões
  - Pagamentos realizados/pendentes
  - Histórico de pagamentos

- ✅ **Contas a Pagar/Receber (Simplificado):**
  - Lista de contas
  - Filtros por status (Pago, Pendente, Atrasado)
  - Marcar como pago
  - Alertas de vencimento

**OBS:** Financeiro completo fica no **ERP** (próximo módulo)

---

## 🏢 11. ERP (NOVO MÓDULO COMPLETO)

### **Objetivo:** Sistema de gestão empresarial completo

### **Estrutura:**

```
📊 ERP
├─ 📊 Dashboard ERP (Visão Geral)
├─ 💰 Financeiro Completo
│  ├─ Fluxo de Caixa Detalhado
│  ├─ Contas a Pagar
│  ├─ Contas a Receber
│  ├─ Centro de Custos
│  ├─ Categorias Financeiras
│  ├─ Conciliação Bancária
│  └─ Extrato Financeiro
├─ 🧾 Faturamento
│  ├─ Cobranças
│  ├─ PIX
│  ├─ Boletos
│  ├─ Cartão de Crédito
│  ├─ Parcelamentos
│  └─ Assinaturas Recorrentes
├─ 👥 Clientes (Visão ERP)
│  ├─ Cadastro Completo
│  ├─ Histórico Financeiro
│  ├─ Documentos
│  └─ Contratos
├─ 🚚 Fornecedores
│  ├─ Cadastro
│  ├─ Pagamentos
│  └─ Histórico
├─ 📦 Estoque
│  ├─ Produtos
│  ├─ Categorias
│  ├─ Movimentações
│  ├─ Inventário
│  └─ Entradas e Saídas
├─ 🛒 Compras
│  ├─ Pedidos
│  ├─ Cotações
│  ├─ Aprovações
│  └─ Recebimentos
├─ 💼 Vendas
│  ├─ Pedidos
│  ├─ Orçamentos
│  ├─ Comissões
│  ├─ Metas
│  └─ Cancelamentos
├─ 📄 Contratos
│  ├─ Assinaturas
│  ├─ PDFs
│  ├─ Validade
│  ├─ Renovação
│  └─ Alertas
├─ 👨‍💼 RH (Recursos Humanos)
│  ├─ Funcionários
│  ├─ Ponto Eletrônico
│  ├─ Salários
│  ├─ Férias
│  └─ Comissões
├─ 📅 Agenda Corporativa
│  ├─ Compromissos
│  ├─ Reuniões
│  ├─ Tarefas
│  └─ Calendário
├─ 📁 Documentos
│  ├─ Upload de Arquivos
│  ├─ PDF, Word, Excel
│  └─ Imagens
├─ 📈 Relatórios ERP
│  ├─ Relatório Financeiro
│  ├─ Relatório de Vendas
│  ├─ Relatório de Clientes
│  ├─ Relatório de Estoque
│  ├─ Fluxo de Caixa
│  └─ KPIs Gerenciais
└─ ⚙️ Configurações ERP
   ├─ Dados da Empresa
   ├─ Filiais
   ├─ Usuários e Permissões
   ├─ Integrações (WhatsApp, SMS, APIs)
   └─ Backup Automático
```

---

## 🎯 PRIORIDADES DE IMPLEMENTAÇÃO

### **Fase 1: CRM (Amanhã - Manhã)**
1. Dashboard tempo real com funis
2. Pipeline com visão por atendente
3. Chat Center completo + sincronização Clientes
4. Anotações e Retornos

### **Fase 2: Marketing/IA (Amanhã - Tarde)**
5. Campanhas com janela IA integrada
6. IA Prospecção com modal de configuração
7. VOIP/Discadora com templates editáveis
8. Marketing ROI completo
9. Remover aba SMS

### **Fase 3: Financeiro/ERP (Depois de Amanhã)**
10. Financeiro reestruturado
11. ERP - Dashboard
12. ERP - Financeiro Completo
13. ERP - Faturamento
14. ERP - Demais módulos

---

## 📝 OBSERVAÇÕES TÉCNICAS

### **Tecnologias:**
- React + TypeScript
- Tailwind CSS
- Lucide Icons
- Firebase (Firestore, Auth, Storage)
- Context API para estados globais
- React Router para navegação

### **Padrões:**
- Componentização máxima
- Dark mode nativo
- Responsivo (mobile-first)
- Tempo real (Firestore onSnapshot)
- Permissões por perfil (Master, Empresário, Funcionário)

### **Performance:**
- Lazy loading de módulos
- Pagination em listas grandes
- Cache de dados frequentes
- Otimização de queries Firestore

---

## ✅ CHECKLIST FINAL

- [ ] Dashboard com KPIs tempo real + funis
- [ ] Pipeline com cards arrastáveis por atendente
- [ ] Chat Center sincronizado com Clientes
- [ ] Anotações e Retornos completos
- [ ] Campanhas com janela IA grande
- [ ] IA Prospecção com modal de configuração
- [ ] Tráfego Pago em IA Prospecção
- [ ] VOIP/Discadora com templates editáveis
- [ ] Marketing ROI completo
- [ ] SMS removido (funcionalidade em Campanhas)
- [ ] Financeiro reestruturado
- [ ] ERP completo estruturado

---

**TUDO PLANEJADO E ORGANIZADO! VAMOS COMEÇAR AMANHÃ! 🚀**
