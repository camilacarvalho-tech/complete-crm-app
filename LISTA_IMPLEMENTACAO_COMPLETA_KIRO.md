# 📋 LISTA COMPLETA DE IMPLEMENTAÇÕES - NEXUS CRM CLEAN

**Data:** 17/07/2026  
**Solicitante:** Camila  
**Objetivo:** Transformar o Nexus CRM Clean em um ERP SaaS profissional completo

---

## ✅ STATUS ATUAL

### JÁ IMPLEMENTADO:
- ✅ Estrutura base do projeto
- ✅ Firebase configurado
- ✅ Dashboard principal
- ✅ Pipeline de vendas
- ✅ Chat interno (comunicação entre funcionários)
- ✅ Remarketing (5 campanhas automáticas)
- ✅ Estrutura de todas as páginas ERP

---

## 🔧 IMPLEMENTAÇÕES NECESSÁRIAS

### 1. ❌ REMARKETING
**Status:** Precisa correção  
**Problema:** Aba está vazia  
**O que fazer:**
- [ ] Implementar tela completa de Remarketing
- [ ] Listagem de campanhas automáticas
- [ ] Filtros por status, data, cliente
- [ ] Botões: Ativar, Pausar, Editar, Excluir
- [ ] Modal para criar nova campanha
- [ ] Estatísticas: Enviadas, Abertas, Cliques, Conversões

**Arquivo:** `src/app/components/remarketing/Remarketing.tsx`

---

### 2. ❌ NEXUS ATENDIMENTO
**Status:** Precisa implementação  
**Problema:** Ao clicar na conversa, não abre formulário do cliente  
**O que fazer:**
- [ ] Ao clicar em mensagem/conversa, abrir formulário completo do cliente
- [ ] Exibir dados:
  - Nome
  - CPF
  - Telefone
  - Empresa
  - Histórico de interações
  - Observações
  - Funil (posição no pipeline)
  - Responsável
  - Modalidade
  - Status
- [ ] Botões: Editar, Salvar, Anexar Documentos

**Arquivo:** `src/app/components/atendimento/ChatWhatsApp.tsx`

---

### 3. ❌ FLUXO DE CAIXA
**Status:** Botões não funcionam  
**Problema:** Exportar, Imprimir, PDF, CSV não funcionam  
**O que fazer:**
- [ ] **Exportar Excel:**
  - Instalar: `npm install xlsx`
  - Criar função `exportarParaExcel()`
  - Baixar arquivo .xlsx com dados do fluxo
- [ ] **Imprimir:**
  - Criar função `window.print()`
  - Formatar impressão
- [ ] **Exportar PDF:**
  - Instalar: `npm install jspdf jspdf-autotable`
  - Gerar PDF com dados formatados
- [ ] **Exportar CSV:**
  - Criar função para gerar CSV
  - Download automático

**Arquivo:** `src/app/components/erp/FluxoCaixaERP.tsx`

---

### 4. ❌ RECEBIMENTOS
**Status:** Formulário incompleto  
**Problema:** Ao clicar em "Novo", não tem formulário  
**O que fazer:**
- [ ] Criar modal "Novo Recebimento"
- [ ] Campos:
  - Cliente (dropdown)
  - Categoria (dropdown: Venda, Serviço, Outros)
  - Descrição (textarea)
  - Valor (R$)
  - Data de recebimento (date picker)
  - Forma de pagamento (dropdown: Dinheiro, Cartão, PIX, Boleto, Transferência)
  - Conta bancária (dropdown)
  - Status (dropdown: Pendente, Recebido, Cancelado)
  - Observações (textarea)
  - Anexos (upload de comprovante)
- [ ] Botão SALVAR → adiciona no Firestore
- [ ] Botões em cada item: Editar, Exportar, Enviar, Copiar, Excluir, Cancelar

**Arquivo:** `src/app/components/erp/RecebimentosERP.tsx`

---

### 5. ❌ FORMAS DE PAGAMENTO
**Status:** Ações incompletas  
**Problema:** Ao clicar em forma de pagamento, não tem ações  
**O que fazer:**
- [ ] Ao clicar em qualquer forma, mostrar ações:
  - Editar
  - Exportar (Excel/PDF)
  - Enviar (Email/WhatsApp)
  - Copiar
  - Excluir
  - Cancelar
- [ ] Modal de confirmação para exclusão
- [ ] Modal de edição com campos editáveis

**Arquivo:** `src/app/components/erp/RecebimentosERP.tsx` (seção Formas de Pagamento)

---

### 6. ❌ CONTAS A PAGAR
**Status:** Formulário incompleto  
**Problema:** Ao clicar em "Novo", não tem formulário  
**O que fazer:**
- [ ] Criar modal "Nova Conta a Pagar"
- [ ] Campos:
  - Fornecedor (dropdown ou busca)
  - Categoria (dropdown: Aluguel, Salários, Fornecedores, Impostos, Outros)
  - Valor (R$)
  - Vencimento (date picker)
  - Data de Pagamento (date picker, opcional)
  - Forma de pagamento (dropdown)
  - Centro de custo (dropdown)
  - Observações (textarea)
  - Status (dropdown: Pendente, Pago, Vencido, Cancelado)
- [ ] Botão SALVAR → adiciona no Firestore
- [ ] Alertas para contas vencidas (cor vermelha)
- [ ] Botões: Editar, Pagar, Excluir

**Arquivo:** `src/app/components/erp/ContasPagarERP.tsx`

---

### 7. ❌ DRE (Demonstrativo de Resultado do Exercício)
**Status:** Precisa melhorar totalmente  
**Problema:** Não tem ano completo, cálculos automáticos, edição manual  
**O que fazer:**
- [ ] **Seleção de Ano:**
  - Dropdown: 2020 até 2050
- [ ] **Grid de Meses:**
  - Colunas: Janeiro até Dezembro
  - Linhas: Receitas, Despesas, Lucro Bruto, Lucro Líquido
- [ ] **Cálculos Automáticos:**
  - Lucro Bruto = Receitas - Despesas
  - Lucro Líquido = Lucro Bruto - Impostos
  - Percentuais automáticos
- [ ] **Edição Manual:**
  - Células editáveis (clicar para editar)
  - Salvar alterações no Firestore
- [ ] **Totalizador:**
  - Total do ano (soma dos 12 meses)
- [ ] **Resultado Automático:**
  - Verde se lucro, Vermelho se prejuízo

**Arquivo:** `src/app/components/erp/DREЕРP.tsx`

---

### 8. ❌ FATURAMENTO
**Status:** Funções incompletas  
**Problema:** Botões Novo, Imprimir, Exportar PDF não funcionam  
**O que fazer:**
- [ ] **Modal "Nova Nota Fiscal":**
  - Cliente
  - Produtos/Serviços
  - Valores
  - Impostos
  - Total
- [ ] **Gerar PDF:**
  - Layout de nota fiscal
  - Dados da empresa
  - Dados do cliente
  - Itens
  - Total
- [ ] **Imprimir:**
  - Função `window.print()`
- [ ] **Exportar PDF:**
  - Download automático

**Arquivo:** `src/app/components/erp/FaturamentoERP.tsx`

---

### 9. ❌ FORNECEDORES
**Status:** Formulário com erros  
**Problema:** Campos numéricos não aceitam pontos e vírgulas, máscaras erradas  
**O que fazer:**
- [ ] **Revisar formulário completo:**
  - Nome/Razão Social
  - CNPJ (máscara: 00.000.000/0000-00)
  - Telefone (máscara: (00) 0000-0000 ou (00) 00000-0000)
  - Email
  - CEP (máscara: 00000-000)
  - Endereço completo
  - Contato
  - Observações
- [ ] **Corrigir máscaras:**
  - Aceitar pontos E vírgulas em valores monetários
  - Formatar automaticamente: 1.000,00 ou 1000.00
- [ ] **Funções:**
  - Novo fornecedor
  - Editar
  - Salvar
  - Excluir
  - Pesquisa

**Arquivo:** `src/app/components/erp/FornecedoresERP.tsx`

---

### 10. ❌ ESTOQUE
**Status:** Não implementado  
**Problema:** Não tem formulário  
**O que fazer:**
- [ ] Criar formulário completo:
  - Produto (nome)
  - Código (SKU)
  - Categoria (dropdown)
  - Quantidade (número)
  - Unidade (dropdown: Un, Kg, L, M, Caixa)
  - Estoque mínimo (número)
  - Valor de compra (R$)
  - Valor de venda (R$)
  - Fornecedor (dropdown)
  - Localização (texto)
  - Observações (textarea)
- [ ] Alertas para estoque baixo (vermelho quando abaixo do mínimo)
- [ ] Funções: Adicionar, Editar, Excluir, Pesquisar

**Arquivo:** `src/app/components/erp/EstoqueERP.tsx`

---

### 11. ❌ COMPRAS
**Status:** Não implementado  
**Problema:** Ao clicar em "Nova Compra", não tem formulário  
**O que fazer:**
- [ ] Criar modal "Nova Compra":
  - Fornecedor (dropdown/busca)
  - Data da compra (date picker)
  - **Produtos (tabela):**
    - Produto (busca)
    - Quantidade
    - Valor unitário
    - Total (calculado)
  - Subtotal (soma dos produtos)
  - Desconto (%)
  - Frete (R$)
  - Total Geral (calculado)
  - Forma de pagamento
  - Parcelas (se aplicável)
  - Observações
- [ ] Botão SALVAR → adiciona no Firestore
- [ ] Atualizar estoque automaticamente

**Arquivo:** `src/app/components/erp/ComprasERP.tsx`

---

### 12. ❌ VENDAS
**Status:** Não implementado  
**Problema:** Não tem registro de venda  
**O que fazer:**
- [ ] Criar formulário "Nova Venda":
  - Cliente (dropdown/busca)
  - Data da venda (date picker)
  - **Produtos (tabela):**
    - Produto (busca)
    - Quantidade
    - Valor unitário
    - Desconto (%)
    - Total (calculado)
  - Subtotal
  - Desconto geral (%)
  - Total Geral
  - Forma de pagamento
  - Parcelas
  - Vendedor (dropdown)
  - Status (Pendente, Pago, Cancelado)
  - Observações
- [ ] Botão SALVAR → adiciona no Firestore
- [ ] Baixar estoque automaticamente
- [ ] Gerar entrada no Fluxo de Caixa

**Arquivo:** `src/app/components/erp/VendasERP.tsx`

---

### 13. ❌ CONTRATOS DE EMPRESAS
**Status:** Não implementado  
**Problema:** Ao clicar em "Novo Contrato", não tem formulário  
**O que fazer:**
- [ ] Criar modal "Novo Contrato":
  - Empresa/Cliente (dropdown)
  - Plano (dropdown: Básico, Profissional, Empresarial, Master)
  - Valor mensal (R$)
  - Data início (date picker)
  - Data término (date picker)
  - Renovação automática (checkbox)
  - Status (Ativo, Inativo, Pendente, Cancelado)
  - Arquivo PDF (upload do contrato)
  - Observações (textarea)
- [ ] Botão SALVAR → adiciona no Firestore
- [ ] Alertas para contratos vencendo (30, 15, 7 dias antes)

**Arquivo:** `src/app/components/erp/ContratosERP.tsx`

---

### 14. ❌ RH (Recursos Humanos)
**Status:** Não implementado  
**Problema:** Não tem formulário  
**O que fazer:**
- [ ] Criar formulário "Novo Funcionário":
  - Nome completo
  - CPF (máscara: 000.000.000-00)
  - RG
  - Data de nascimento (date picker)
  - Telefone (máscara)
  - Email
  - Cargo (dropdown)
  - Departamento (dropdown)
  - Salário (R$)
  - Data de admissão (date picker)
  - Situação (Ativo, Férias, Afastado, Demitido)
  - Benefícios (checkbox múltiplo: Vale transporte, Vale refeição, Plano de saúde)
  - Observações (textarea)
- [ ] Botão SALVAR → adiciona no Firestore
- [ ] Cálculos automáticos: 13º, férias, FGTS

**Arquivo:** `src/app/components/erp/RHERP.tsx`

---

### 15. ❌ DOCUMENTOS
**Status:** Não implementado  
**Problema:** Não existe módulo de documentos  
**O que fazer:**
- [ ] Criar módulo para armazenamento de documentos:
  - Upload de arquivos (múltiplos)
  - Tipos de documentos:
    - RG
    - CPF
    - CNH
    - Carteira de Trabalho
    - Contrato
    - Holerites
    - Certificados
    - Comprovante de Residência
    - Exames Admissionais
    - Outros
  - Associar ao funcionário
  - Download de documentos
  - Visualização de PDFs/imagens
  - Histórico de uploads
- [ ] Upload para Firebase Storage
- [ ] Referência no Firestore

**Arquivo:** Criar `src/app/components/erp/DocumentosERP.tsx`

---

### 16. ❌ PATRIMÔNIO → SUBSTITUIR
**Status:** Não relevante  
**Problema:** Módulo não é útil  
**O que fazer:**
- [ ] **REMOVER** o módulo Patrimônio
- [ ] **CRIAR** um módulo melhor no lugar:

**Opção 1: Central de Relatórios Gerenciais**
- Dashboard com indicadores
- Gráficos de vendas
- Performance de vendedores
- Produtos mais vendidos
- Lucro por período

**Opção 2: Business Intelligence (BI)**
- Dashboards interativos
- Comparativos mês a mês
- Previsões
- Metas vs Realizado

**Arquivo:** Remover `PatrimonioERP.tsx` e criar novo componente

---

### 17. ❌ AUDITORIA → SUBSTITUIR
**Status:** Não moderno  
**Problema:** Nome não adequado  
**O que fazer:**
- [ ] **SUBSTITUIR** Auditoria por **"Logs e Monitoramento"**
- [ ] Registrar todas as ações do sistema:
  - Login/Logout (usuário, data, hora, IP)
  - Criação de registros (o quê, quem, quando)
  - Edição de registros (o quê mudou, quem, quando)
  - Exclusão de registros (o quê, quem, quando)
  - Exportações (tipo, quem, quando)
- [ ] Exibir em tabela:
  - Usuário
  - Data/Hora
  - Ação realizada
  - Detalhes (JSON das alterações)
  - IP
  - Dispositivo
- [ ] Filtros: Por usuário, por ação, por data
- [ ] Histórico completo mantido

**Arquivo:** Renomear/recriar `AuditoriaERP.tsx` para `LogsERP.tsx`

---

### 18. ❌ CONFIGURAÇÕES
**Status:** Incompleto  
**Problema:** Não tem guia de uso do sistema  
**O que fazer:**
- [ ] Criar **Central de Configuração do Sistema**:

**Seções:**

1. **Configurações Gerais:**
   - Nome da empresa
   - Logo (upload)
   - CNPJ
   - Endereço
   - Telefones
   - Email

2. **Guia de Uso (Passo a Passo):**
   - Dashboard (como usar)
   - CRM (como cadastrar clientes)
   - Atendimento (como responder mensagens)
   - Financeiro (como lançar receitas/despesas)
   - Estoque (como controlar produtos)
   - Compras (como registrar)
   - Vendas (como registrar)
   - RH (como cadastrar funcionários)
   - Empresas (como gerenciar contratos)
   - Usuários (como adicionar)
   - Permissões (como configurar)
   - Backup (como fazer)
   - API (como integrar)
   - WhatsApp (como conectar)
   - IA (como usar)

3. **Configurações Avançadas:**
   - Backup automático
   - Integrações (API keys)
   - WhatsApp API
   - IA (OpenAI API key)
   - Notificações

**Arquivo:** `src/app/components/erp/ConfiguracoesERP.tsx`

---

## 🔍 REVISÃO GERAL

**Objetivo:** Garantir que TUDO funcione perfeitamente

- [ ] **Revisar TODOS os formulários:**
  - Corrigir formulários que mostram "será implementado"
  - Garantir que todos os botões funcionem
  - Padronizar todos os formulários (mesmo estilo visual)

- [ ] **Corrigir máscaras e validações:**
  - CPF: 000.000.000-00
  - CNPJ: 00.000.000/0000-00
  - Telefone: (00) 00000-0000
  - CEP: 00000-000
  - Data: DD/MM/AAAA
  - Valores monetários: R$ 1.000,00

- [ ] **Revisar ortografia:**
  - Acentuação
  - Pontos e vírgulas
  - Concordância
  - Espaçamentos

- [ ] **Padronizar layout:**
  - Espaçamentos consistentes
  - Cores padronizadas
  - Botões com mesmo estilo
  - Ícones consistentes
  - Responsividade (funcionar em celular, tablet, desktop)

- [ ] **Garantir funcionalidades:**
  - Todos os cadastros salvam corretamente no Firestore
  - Editar funciona
  - Excluir funciona (com confirmação)
  - Pesquisar funciona
  - Imprimir funciona
  - Exportar (Excel/PDF) funciona
  - Filtros funcionam

---

## 🎯 OBJETIVO FINAL

**Deixar a pasta "Nexus CRM Clean" com:**
- ✅ Aparência de ERP SaaS profissional
- ✅ Funcionamento completo de TODOS os módulos
- ✅ Pronto para demonstrações
- ✅ Pronto para testes
- ✅ Pronto para evolução para produção

---

## 📊 PRIORIZAÇÃO

### 🔴 **ALTA PRIORIDADE (fazer primeiro):**
1. Recebimentos
2. Contas a Pagar
3. DRE
4. Fluxo de Caixa (exportações)
5. Nexus Atendimento (formulário cliente)

### 🟡 **MÉDIA PRIORIDADE:**
6. Fornecedores (corrigir máscaras)
7. Estoque
8. Compras
9. Vendas
10. Faturamento

### 🟢 **BAIXA PRIORIDADE (fazer por último):**
11. Contratos
12. RH
13. Documentos
14. Substituir Patrimônio
15. Substituir Auditoria
16. Configurações (guia)
17. Remarketing (correção)
18. Revisão geral

---

**KIRO vai implementar tudo isso! 🚀💚**

**Última atualização:** 17/07/2026 15:50
