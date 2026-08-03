# 🗄️ ARQUITETURA DE BANCO DE DADOS - CREDFLOW PLATFORM 2.0

## 📋 VISÃO GERAL

Sistema **Multi-Tenant** com isolamento de dados por `empresa_id`. Cada empresa (tenant) é completamente isolada, garantindo segurança e privacidade dos dados.

---

## 🏗️ ESTRUTURA DE COLEÇÕES

### 📊 CORE DO SISTEMA

#### 1️⃣ **empresas** (Tenants)
Cada empresa cliente da plataforma é um tenant isolado.

```typescript
{
  id: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  responsavel: string
  telefone: string
  email: string
  
  // Segmentação
  nicho: 'correspondente_bancario' | 'clinica_medica' | 'odontologia' | 'psicologia' | 'nutricao' | 'academia'
  planoId: string
  status: 'ativo' | 'inadimplente' | 'cancelado' | 'trial'
  
  // Datas
  dataInicio: Date
  dataVencimento: Date
  criadoEm: Date
  atualizadoEm: Date
  
  // Financeiro
  valorPlano: number
  qtdFuncionariosInclusos: number
  valorFuncionarioExtra: number
  
  // Configurações do robô
  nomeRobo?: string
  avatarRobo?: string
  promptRobo?: string
  canaisRoboAtivos?: string[]
}
```

#### 2️⃣ **usuarios**
Usuários vinculados às empresas (multi-tenant).

```typescript
{
  id: string  // UID do Firebase Auth
  empresaId: string  // 🔑 CHAVE DE ISOLAMENTO
  
  nome: string
  email: string
  telefone?: string
  avatar?: string
  
  // Perfil e Permissões (3 níveis)
  perfil: 'master' | 'empresario' | 'funcionario'
  verFilaGeral?: boolean
  verFinanceiroEquipe?: boolean
  verRelatoriosEmpresa?: boolean
  
  ativo: boolean
  criadoEm: Date
  atualizadoEm: Date
  ultimoAcesso?: Date
}
```

**REGRA DOS 3 NÍVEIS DE VISIBILIDADE:**

| Nível | Quem é | O que vê |
|-------|--------|----------|
| **Master** | CEO/Dona da plataforma (você) | **TUDO** de todas as empresas |
| **Empresário** | Dono da empresa cliente | **TUDO** da própria empresa |
| **Funcionário** | Atendente/colaborador | Apenas **seus registros** (ou fila geral se liberado) |

#### 3️⃣ **modulos**
Módulos disponíveis na plataforma.

```typescript
{
  id: string
  nome: string  // Ex: "CRM", "Financeiro", "Chat Center", "Prontuário"
  descricao: string
  icone: string
  nichos: string[]  // Quais nichos podem usar
  obrigatorio: boolean  // Se é CORE (sempre ativo)
}
```

#### 4️⃣ **empresa_modulos** (Relação N:N)
Quais módulos estão ativos para cada empresa.

```typescript
{
  id: string
  empresaId: string
  moduloId: string
  ativo: boolean
  criadoEm: Date
}
```

---

### 👥 CRM

#### 5️⃣ **clientes**
Leads e clientes do CRM (isolados por empresa).

```typescript
{
  id: string
  empresaId: string  // 🔑 ISOLAMENTO
  
  // Dados pessoais
  nome: string
  cpf?: string
  rg?: string
  dataNascimento?: Date
  telefone: string
  email?: string
  
  // Endereço
  cep?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  
  // Dados bancários
  banco?: string
  agencia?: string
  conta?: string
  tipoConta?: string
  pix?: string
  
  // Status e funil
  status: 'lead' | 'em_atendimento' | 'doc_recebida' | 'analise_bancaria' | 'aprovado' | 'pago' | 'sem_contato' | 'remarketing' | 'recusado'
  modalidade?: string
  origem: 'whatsapp' | 'sms' | 'instagram' | 'facebook' | 'google' | 'landing_page' | 'indicacao' | 'organico'
  campanhaId?: string
  
  // Atendimento
  atendenteId?: string  // 🔑 FILTRO FUNCIONÁRIO
  criadoPor: string
  
  // Campos extras por nicho (JSON flexível)
  camposExtras?: any
  
  criadoEm: Date
  atualizadoEm: Date
  dataUltimaInteracao?: Date
  diasSemContato?: number
}
```

---

### 💬 CHAT CENTER

#### 6️⃣ **conversas**
Conversas omnichannel (isoladas por empresa).

```typescript
{
  id: string
  empresaId: string  // 🔑 ISOLAMENTO
  clienteId: string
  
  canal: 'whatsapp' | 'sms' | 'instagram' | 'facebook' | 'email' | 'site'
  status: 'aberta' | 'em_atendimento' | 'aguardando_cliente' | 'resolvida'
  atendenteId?: string
  
  criadoEm: Date
  atualizadoEm: Date
  resolvida?: boolean
  dataResolucao?: Date
}
```

#### 7️⃣ **mensagens**
Mensagens dentro de conversas.

```typescript
{
  id: string
  conversaId: string
  
  remetente: 'cliente' | 'atendente' | 'robo'
  remetenteId?: string
  nomeRemetente: string  // Ex: "Robô Leticia" ou "Atendente João"
  
  conteudo: string
  tipo: 'texto' | 'audio' | 'imagem' | 'documento' | 'link'
  anexoUrl?: string
  
  lida: boolean
  criadoEm: Date
}
```

---

### 📢 CAMPANHAS

#### 8️⃣ **campanhas**
Campanhas de marketing (isoladas por empresa).

```typescript
{
  id: string
  empresaId: string  // 🔑 ISOLAMENTO
  
  nome: string
  produtoId?: string
  origem: 'facebook' | 'instagram' | 'google' | 'sms' | 'whatsapp' | 'landing_page'
  objetivo: string
  
  // Financeiro
  valorInvestido: number
  leadsGerados: number
  cpl?: number
  cpc?: number
  ctr?: number
  conversao?: number
  roi?: number
  
  status: 'ativa' | 'pausada' | 'encerrada'
  dataInicio: Date
  dataFim?: Date
  
  // Rastreamento
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  pixelId?: string
  
  responsavelId: string
  criadoEm: Date
  atualizadoEm: Date
}
```

#### 9️⃣ **produtos**
Produtos/serviços oferecidos (dinâmico por nicho).

```typescript
{
  id: string
  empresaId: string  // 🔑 ISOLAMENTO
  nicho: string
  
  categoria: string  // Ex: INSS, FGTS, Consultas
  nome: string
  descricao?: string
  valor?: number
  
  ativo: boolean
  criadoEm: Date
}
```

---

### 📱 SMS

#### 🔟 **sms_disparos**
Disparos de SMS em massa.

```typescript
{
  id: string
  empresaId: string  // 🔑 ISOLAMENTO
  campanhaId?: string
  
  nomeCampanha: string
  mensagem: string
  dataDisparo: Date
  
  // Estatísticas
  quantidadeEnviada: number
  entregues: number
  falhas: number
  cliques?: number
  conversoes: number
  
  criadoPor: string
  criadoEm: Date
}
```

#### 1️⃣1️⃣ **sms_respostas**
Respostas de clientes a SMS (com botão "Transformar em Lead").

```typescript
{
  id: string
  empresaId: string  // 🔑 ISOLAMENTO
  smsDisparoId: string
  
  nome?: string
  cpf?: string
  telefone: string
  mensagemEnviada: string
  dataEnvio: Date
  
  status: 'entregue' | 'falhou' | 'pendente'
  respondeu: boolean
  resposta?: string
  dataResposta?: Date
  
  // Conversão
  transformadoEmLead: boolean
  clienteId?: string
  atendenteId?: string
}
```

---

### 💰 FINANCEIRO

#### 1️⃣2️⃣ **financeiro_lancamentos**
Lançamentos financeiros (receitas e despesas).

```typescript
{
  id: string
  empresaId: string  // 🔑 ISOLAMENTO
  
  tipo: 'entrada' | 'saida'
  categoria: string  // Comissão, Salário, Marketing, Aluguel, Imposto
  centroCusto?: string
  descricao: string
  
  valor: number
  formaPagamento: string  // Pix, Boleto, Cartão, Dinheiro
  
  dataLancamento: Date
  vencimento: Date
  status: 'pago' | 'pendente' | 'atrasado'
  
  clienteId?: string
  empresaClienteId?: string  // Se B2B
  
  recorrente: boolean
  periodicidade?: string
  
  criadoPor: string
  criadoEm: Date
  atualizadoEm: Date
}
```

#### 1️⃣3️⃣ **comissoes**
Comissões de atendentes.

```typescript
{
  id: string
  empresaId: string  // 🔑 ISOLAMENTO
  usuarioId: string
  
  valor: number
  percentual: number
  referencia: string  // Mês/ano
  
  clienteId?: string
  pago: boolean
  dataPagamento?: Date
  
  criadoEm: Date
}
```

---

### 📄 CONTRATOS

#### 1️⃣4️⃣ **contratos**
Contratos de empresas B2B.

```typescript
{
  id: string
  empresaId: string  // 🔑 ISOLAMENTO
  
  arquivoPdf?: string  // URL do Storage
  dataAssinatura?: Date
  dataRenovacao?: Date
  assinado: boolean
  
  versao: number
  versaoAnteriorId?: string
  
  criadoEm: Date
  atualizadoEm: Date
}
```

---

### 📝 ANOTAÇÕES

#### 1️⃣5️⃣ **anotacoes**
Anotações/tarefas internas da empresa.

```typescript
{
  id: string
  empresaId: string  // 🔑 ISOLAMENTO
  
  titulo: string
  conteudo: string
  categoria?: string
  tags?: string[]
  
  clienteId?: string  // Opcional: vincula a um cliente
  responsavelId: string
  
  prioridade: 'baixa' | 'media' | 'alta'
  status: 'pendente' | 'concluida'
  
  dataVencimento?: Date
  fixarNoTopo: boolean
  compartilharComEquipe: boolean
  
  criadoEm: Date
  atualizadoEm: Date
}
```

---

### 🔄 REMARKETING

#### 1️⃣6️⃣ **remarketing**
Leads em remarketing.

```typescript
{
  id: string
  empresaId: string  // 🔑 ISOLAMENTO
  clienteId: string
  
  motivo: 'recusado' | 'sem_contato' | 'perdido' | 'manual'
  dataEntrada: Date
  ultimaTentativa?: Date
  tentativasRealizadas: number
  
  status: 'nao_iniciado' | 'em_campanha' | 'recuperado' | 'descartado'
  
  campanhaId?: string
  canalReengajamento?: string
  
  criadoEm: Date
}
```

---

### 🔒 AUDITORIA

#### 1️⃣7️⃣ **auditoria_logs**
Logs de auditoria para rastreamento.

```typescript
{
  id: string
  usuarioId: string
  empresaId?: string
  
  acao: 'criar' | 'editar' | 'excluir' | 'login' | 'logout'
  entidade: string  // 'cliente', 'usuario', 'lancamento'
  entidadeId?: string
  
  detalhes?: any  // JSON com dados antes/depois
  ip?: string
  
  timestamp: Date
}
```

---

## 🔐 REGRAS DE SEGURANÇA

### ✅ Implementadas no Firestore Rules

1. **Master** (CEO) → Acesso total a todas as empresas
2. **Empresário** → Acesso total à própria empresa
3. **Funcionário** → Acesso apenas aos seus registros

### 🛡️ Filtros Automáticos

Todos os serviços de banco de dados aplicam **automaticamente**:

- **Isolamento por `empresaId`**: Empresário e Funcionário só veem dados da própria empresa
- **Filtro por usuário**: Funcionário só vê registros onde `atendenteId` = seu ID
- **Permissões extras**: Flags `verFilaGeral`, `verFinanceiroEquipe`, `verRelatoriosEmpresa`

---

## 📈 COMO USAR

### Exemplo de Uso dos Serviços

```typescript
import { setCurrentUser, ClienteService } from './services/database.service'
import { PerfilUsuario } from './types/database.types'

// 1. Definir usuário logado (fazer no login)
setCurrentUser({
  id: 'user123',
  empresaId: 'empresa456',
  perfil: PerfilUsuario.FUNCIONARIO
})

// 2. Buscar clientes (filtro automático por empresa_id)
const clientes = await ClienteService.getAll()  // Só da empresa456

// 3. Buscar clientes por status
const leads = await ClienteService.getByStatus('lead')

// 4. Criar novo cliente (empresa_id automático)
const novoClienteId = await ClienteService.create({
  nome: 'João Silva',
  telefone: '11999999999',
  origem: 'whatsapp',
  status: 'lead',
  criadoPor: 'user123'
  // empresaId é adicionado automaticamente
})

// 5. Atualizar cliente
await ClienteService.update('cliente123', {
  status: 'em_atendimento',
  atendenteId: 'user123'
})
```

---

## 🚀 PRÓXIMOS PASSOS

### FASE 1 ✅ COMPLETA
- [x] Tipos TypeScript definidos
- [x] Serviços de banco com isolamento automático
- [x] Regras de segurança do Firestore
- [x] Documentação da arquitetura

### FASE 2 - Sistema de Permissões
- [ ] Context de autenticação com os 3 níveis
- [ ] Hook para verificar permissões em componentes
- [ ] Middleware de rotas protegidas

### FASE 3 - Onboarding
- [ ] Tela de cadastro de empresa
- [ ] Seleção de nicho (6 opções)
- [ ] Seleção de módulos (checkboxes)
- [ ] Criação automática do primeiro usuário (Empresário)

---

## 📞 SUPORTE

Desenvolvido para **CredFlow Platform 2.0**
Arquitetura Multi-Tenant com Firebase Firestore

**Implementação:** Kiro AI Assistant
**Data:** Julho 2026
