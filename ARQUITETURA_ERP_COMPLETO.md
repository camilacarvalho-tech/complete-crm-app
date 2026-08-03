# 🏢 NEXUS ERP + CRM + IA - ARQUITETURA COMPLETA

## 📋 VISÃO GERAL

**Nexus ERP** é uma plataforma completa de gestão empresarial que integra:
- ✅ **ERP** (Enterprise Resource Planning)
- ✅ **CRM** (Customer Relationship Management)
- ✅ **IA** (Inteligência Artificial para automação e insights)

**Nível de complexidade:** TOTVS, Omie, Conta Azul, Bling, Salesforce, HubSpot
**Diferencial:** Totalmente voltado para nichos específicos + Interface muito mais intuitiva

---

## 🎯 NICHOS ALVO

1. Clínicas Médicas
2. Clínicas Veterinárias
3. Odontologia
4. Psicologia
5. Nutrição
6. Academias
7. Logística
8. Correspondentes Bancários
9. Empresas Genéricas

---

## 🏗️ ESTRUTURA DE NAVEGAÇÃO

### CRM (Lado Esquerdo - Verde/Azul)
- Dashboard CRM
- Pipeline
- Chat WhatsApp
- Clientes
- Campanhas
- IA Prospecção
- VOIP/Discadora
- Marketing ROI
- Financeiro CRM
- Relatórios CRM
- Configurações

### ERP (Lado Direito - Roxo/Azul)
- Dashboard ERP
- Financeiro ERP
- Clientes ERP
- Fornecedores
- Estoque
- Compras
- Vendas
- Contratos
- RH
- Agenda
- Documentos
- Patrimônio
- Centro de Custos
- Auditoria
- Relatórios ERP
- Configurações ERP

**Navegação:** Botão "Acessar ERP" no CRM | Botão "Voltar para CRM" no ERP

---

## 📊 1. DASHBOARD ERP

### KPIs Principais (4 cards grandes)
```typescript
interface DashboardKPIs {
  receitaDia: number
  receitaMes: number
  receitaAno: number
  lucroLiquido: number
}
```

### KPIs Secundários (Grid 3x4)
- Contas a Pagar
- Contas a Receber
- Fluxo de Caixa Atual
- Fluxo de Caixa Previsto
- Agendamentos Hoje
- Clientes Novos
- Clientes Ativos
- Estoque Baixo
- Produtos Vencendo
- Funcionários Presentes
- Ranking de Vendedores
- Taxa de Conversão

### Gráficos (Parte Inferior)
- Receita x Despesa (últimos 12 meses)
- Faturamento por Nicho/Departamento
- Top 10 Produtos/Serviços
- Top 5 Clientes
- Movimentação de Estoque

### Alertas do Sistema
- 🔴 Contas vencidas
- 🟡 Produtos vencendo em 30 dias
- 🟠 Estoque abaixo do mínimo
- 🔵 Contratos a vencer
- 🟣 Aniversariantes do mês

---

## 💰 2. FINANCEIRO ERP (COMPLETO)

### 2.1 RECEBIMENTOS

#### Formas de Pagamento
```typescript
type FormasPagamento = 
  | 'PIX'
  | 'Dinheiro'
  | 'Boleto'
  | 'Cartão Débito'
  | 'Cartão Crédito'
  | 'Parcelado'
  | 'Convênio'
  | 'Transferência Bancária'
  | 'TED'
  | 'DOC'

interface Recebimento {
  id: string
  empresa: string
  cliente: string
  formaPagamento: FormasPagamento
  numeroParcela: number
  quantidadeParcelas: number
  dataVencimento: Date
  dataRecebimento: Date | null
  valorBruto: number
  desconto: number
  juros: number
  multa: number
  valorLiquido: number
  situacao: 'Pago' | 'Pendente' | 'Cancelado' | 'Recebido Parcialmente'
  observacoes: string
  comprovante: string // URL do comprovante
  criadoPor: string
  criadoEm: Date
  atualizadoEm: Date
}
```

#### Tela de Recebimentos
- **Filtros:** Data, Cliente, Forma Pagamento, Situação, Empresa
- **Campos de busca:** Nome do cliente, Número da parcela
- **Ações:** Registrar Pagamento, Editar, Cancelar, Imprimir Recibo, Enviar por Email/WhatsApp
- **Totalizadores:** Total Recebido, Total Pendente, Total Atrasado

### 2.2 CONTAS A PAGAR

```typescript
interface ContaPagar {
  id: string
  fornecedor: string
  centroCusto: string
  categoria: string
  descricao: string
  dataVencimento: Date
  dataPagamento: Date | null
  valorBruto: number
  desconto: number
  juros: number
  multa: number
  valorLiquido: number
  formaPagamento: FormasPagamento
  comprovante: string
  responsavel: string
  status: 'Pago' | 'Pendente' | 'Atrasado' | 'Cancelado'
  recorrente: boolean
  observacoes: string
}
```

#### Categorias de Despesas
- Salários e Encargos
- Aluguel
- Energia Elétrica
- Água
- Internet/Telefone
- Material de Escritório
- Material de Limpeza
- Manutenção e Reparos
- Combustível
- Impostos e Taxas
- Marketing e Publicidade
- Honorários Profissionais
- Seguros
- Depreciação
- Compra de Mercadorias
- Compra de Insumos
- Outros

### 2.3 FLUXO DE CAIXA

#### KPIs (6 cards)
- Entradas Realizadas (dia/mês/ano)
- Saídas Realizadas (dia/mês/ano)
- Saldo Atual
- Entradas Previstas
- Saídas Previstas
- Saldo Projetado (30/60/90 dias)

#### Análise por Centro de Custo
```typescript
interface CentroCusto {
  id: string
  nome: string
  entradas: number
  saidas: number
  saldo: number
  cor: string
}

// Centros de Custo Padrão
const centrosCusto = [
  'Vendas',
  'Marketing',
  'Operacional',
  'Administrativo',
  'Financeiro',
  'TI',
  'RH',
  'Logística'
]
```

#### Gráficos
- Fluxo Diário (últimos 30 dias)
- Fluxo Mensal (últimos 12 meses)
- Previsão de Caixa (próximos 90 dias)
- Entradas x Saídas por Categoria
- Análise por Centro de Custo

#### DRE (Demonstrativo de Resultado do Exercício)
- Receita Bruta
- (-) Descontos
- (-) Devoluções
- (=) Receita Líquida
- (-) Custo das Mercadorias Vendidas
- (=) Lucro Bruto
- (-) Despesas Operacionais
- (-) Despesas Administrativas
- (-) Despesas Financeiras
- (=) Lucro Operacional
- (-) Impostos
- (=) Lucro Líquido

---

## 👥 3. CLIENTES ERP

### 3.1 Campos Comuns (Todos os Nichos)
```typescript
interface ClienteBase {
  id: string
  tipo: 'Pessoa Física' | 'Pessoa Jurídica'
  nome: string
  cpfCnpj: string
  rg?: string
  ie?: string // Inscrição Estadual
  dataNascimento?: Date
  sexo?: 'M' | 'F' | 'Outro'
  telefone: string
  celular: string
  email: string
  
  // Endereço
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
  
  // Financeiro
  limiteCredito?: number
  saldoDevedor: number
  situacao: 'Ativo' | 'Inativo' | 'Bloqueado' | 'Inadimplente'
  
  // Controle
  dataCadastro: Date
  ultimaCompra?: Date
  observacoes: string
  documentos: Documento[]
  anexos: Anexo[]
}
```

### 3.2 CLÍNICA MÉDICA
```typescript
interface ClienteClinicaMedica extends ClienteBase {
  nicho: 'Clínica Médica'
  
  // Convênio
  convenio?: {
    nome: string
    plano: string
    numeroCarteirinha: string
    validade: Date
    titular: string
  }
  
  // Médico
  historicoConsultas: Consulta[]
  prontuarios: Prontuario[]
  exames: Exame[]
  receitas: Receita[]
  procedimentos: Procedimento[]
  alergias: string[]
  medicamentosUsoContinuo: string[]
  
  // Anamnese
  tipoSanguineo?: string
  peso?: number
  altura?: number
  pressaoArterial?: string
  doencasPreexistentes: string[]
}
```

### 3.3 CLÍNICA VETERINÁRIA
```typescript
interface ClienteVeterinaria extends ClienteBase {
  nicho: 'Veterinária'
  
  // Tutor (dono do pet)
  pets: Pet[]
}

interface Pet {
  id: string
  nome: string
  especie: 'Cão' | 'Gato' | 'Ave' | 'Réptil' | 'Roedor' | 'Outro'
  raca: string
  cor: string
  sexo: 'Macho' | 'Fêmea'
  dataNascimento: Date
  peso: number
  porte: 'Pequeno' | 'Médio' | 'Grande' | 'Gigante'
  
  // Identificação
  microchip?: string
  pedigree?: string
  
  // Saúde
  vacinas: Vacina[]
  cirurgias: Cirurgia[]
  exames: Exame[]
  prontuarios: Prontuario[]
  alergias: string[]
  medicamentos: string[]
  
  // Fotos
  fotos: string[]
  
  situacao: 'Ativo' | 'Falecido' | 'Transferido'
}
```

### 3.4 ODONTOLOGIA
```typescript
interface ClienteOdontologia extends ClienteBase {
  nicho: 'Odontologia'
  
  // Plano Odontológico
  planoOdonto?: {
    operadora: string
    plano: string
    numeroCarteirinha: string
    validade: Date
  }
  
  // Odontograma
  odontograma: Odontograma
  radiografias: Radiografia[]
  implantes: Implante[]
  orcamentos: Orcamento[]
  procedimentos: ProcedimentoOdonto[]
  fotosAntesDep ois: FotoComparacao[]
  
  // Histórico
  alergiasMedicamentos: string[]
  doencasPreexistentes: string[]
}
```

### 3.5 PSICOLOGIA
```typescript
interface ClientePsicologia extends ClienteBase {
  nicho: 'Psicologia'
  
  sessoes: Sessao[]
  evolucoes: Evolucao[]
  planejamentoTerapeutico: string
  diagnostico?: string
  medicamentos?: string[]
  encaminhamentos: Encaminhamento[]
  
  // Dados sensíveis (criptografados)
  anotacoesPsicologo: string // Criptografado
}
```

### 3.6 NUTRIÇÃO
```typescript
interface ClienteNutricao extends ClienteBase {
  nicho: 'Nutrição'
  
  // Avaliação Nutricional
  peso: number
  altura: number
  imc: number
  percentualGordura?: number
  massaMuscular?: number
  circunferencias: {
    cintura?: number
    quadril?: number
    braco?: number
    coxa?: number
  }
  
  // Histórico
  consultas: ConsultaNutricao[]
  planoAlimentar: PlanoAlimentar[]
  evolucaoPeso: EvolucaoPeso[]
  
  // Restrições
  alergias: string[]
  restricoes: string[]
  preferenciasAlimentares: string[]
  objetivo: 'Emagrecimento' | 'Ganho de Massa' | 'Saúde' | 'Performance'
}
```

### 3.7 ACADEMIA
```typescript
interface ClienteAcademia extends ClienteBase {
  nicho: 'Academia'
  
  // Plano
  plano: {
    nome: string
    valor: number
    vencimento: number // dia do mês
    situacao: 'Ativo' | 'Suspenso' | 'Cancelado'
    dataInicio: Date
    dataFim?: Date
  }
  
  // Ficha de Treino
  fichasTreino: FichaTreino[]
  avaliacaoFisica: AvaliacaoFisica[]
  evolucao: EvolucaoFisica[]
  
  // Acesso
  biometria?: string
  fotoCarteirinha: string
  ultimoAcesso?: Date
  acessos: Acesso[]
  
  // Restrições
  restricoesMedicas: string[]
  observacoesTreinador: string
}
```

---

## 🏭 4. FORNECEDORES

```typescript
interface Fornecedor {
  id: string
  tipo: 'Pessoa Física' | 'Pessoa Jurídica'
  
  // Dados Empresa
  nomeFantasia: string
  razaoSocial: string
  cnpj: string
  inscricaoEstadual?: string
  inscricaoMunicipal?: string
  
  // Contato
  telefone: string
  celular: string
  whatsapp: string
  email: string
  site?: string
  
  // Endereço
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
  
  // Dados Bancários
  banco: string
  agencia: string
  conta: string
  tipoConta: 'Corrente' | 'Poupança'
  pix?: string
  
  // Comercial
  prazoEntrega: number // dias
  prazoPagamento: number // dias
  formaPagamento: FormasPagamento[]
  produtosFornecidos: string[]
  categorias: string[]
  
  // Histórico
  ultimaCompra?: Date
  totalComprado: number
  pedidosRealizados: number
  
  // Avaliação
  avaliacao: number // 1 a 5
  observacoes: string
  
  // Documentos
  contratoSocial?: string
  certidoes: Documento[]
  notasFiscais: NotaFiscal[]
  
  // Controle
  situacao: 'Ativo' | 'Inativo' | 'Bloqueado'
  dataCadastro: Date
}
```

### Fornecedores por Nicho

#### Odontologia
- Dental Cremer
- Odonto Premium
- S.S. White
- FGM
- Angelus
- Biodinâmica

#### Veterinária
- Vetnil
- Medsystem
- Royal Canin
- Special Dog
- Pedigree
- Whiskas

#### Clínica Médica
- Cirúrgica União
- Medshop
- Medimport
- Protec do Brasil

#### Academia
- Technogym
- Life Fitness
- Whey Protein (diversos)
- Suplementos (diversos)

---

## 📦 5. ESTOQUE

```typescript
interface Produto {
  id: string
  
  // Identificação
  codigo: string
  sku: string
  codigoBarras?: string
  nome: string
  descricao: string
  categoria: string
  subcategoria?: string
  
  // Fornecedor
  fornecedor: string
  fornecedorId: string
  
  // Lote e Validade
  lote?: string
  dataFabricacao?: Date
  dataValidade?: Date
  controlaLote: boolean
  controlaValidade: boolean
  
  // Quantidade
  quantidadeMinima: number
  quantidadeMaxima: number
  estoqueAtual: number
  estoqueReservado: number
  estoqueDisponivel: number // atual - reservado
  
  // Localização
  localizacao?: {
    sala?: string
    armario?: string
    corredor?: string
    prateleira?: string
    gaveta?: string
  }
  
  // Valores
  valorCompra: number
  valorVenda: number
  margemLucro: number // %
  
  // Unidade
  unidadeMedida: 'UN' | 'CX' | 'PC' | 'KG' | 'L' | 'ML' | 'G' | 'M' | 'CM'
  
  // Movimentação
  movimentacoes: Movimentacao[]
  
  // Fiscal
  ncm?: string // Nomenclatura Comum do Mercosul
  cest?: string // Código Especificador da Substituição Tributária
  
  // Controle
  ativo: boolean
  dataCadastro: Date
  ultimaEntrada?: Date
  ultimaSaida?: Date
}

interface Movimentacao {
  id: string
  produtoId: string
  tipo: 'Entrada' | 'Saída' | 'Transferência' | 'Perda' | 'Quebra' | 'Inventário' | 'Devolução'
  quantidade: number
  valorUnitario: number
  valorTotal: number
  lote?: string
  data: Date
  responsavel: string
  origem?: string
  destino?: string
  motivo?: string
  notaFiscal?: string
  observacoes: string
}
```

### Funcionalidades Estoque
- ✅ Alertas de Estoque Mínimo
- ✅ Alertas de Produtos Vencendo (30/60/90 dias)
- ✅ Controle de Lotes
- ✅ Rastreabilidade Completa
- ✅ Inventário Periódico
- ✅ Relatório de Giro de Estoque
- ✅ Análise ABC de Produtos
- ✅ Etiquetas com Código de Barras
- ✅ Leitor de Código de Barras (integração)

---

## 🛒 6. COMPRAS

```typescript
interface Compra {
  id: string
  
  // Tipo
  tipo: 'Solicitação' | 'Cotação' | 'Pedido' | 'Recebimento'
  
  // Fornecedor
  fornecedorId: string
  fornecedorNome: string
  
  // Itens
  itens: ItemCompra[]
  
  // Valores
  subtotal: number
  desconto: number
  frete: number
  impostos: number
  total: number
  
  // Pagamento
  formaPagamento: FormasPagamento
  condicaoPagamento: string // "À vista", "30/60/90", etc
  
  // Entrega
  dataPrevisaoEntrega: Date
  dataRecebimento?: Date
  
  // Documentos
  notaFiscal?: string
  numeroNF?: string
  chaveNF?: string
  
  // Status
  status: 'Solicitada' | 'Cotada' | 'Aprovada' | 'Pedido Enviado' | 'Recebida' | 'Cancelada'
  
  // Controle
  solicitadoPor: string
  aprovadoPor?: string
  dataSolicitacao: Date
  dataAprovacao?: Date
  observacoes: string
}

interface ItemCompra {
  produtoId: string
  produtoNome: string
  quantidade: number
  valorUnitario: number
  desconto: number
  valorTotal: number
  lote?: string
  validade?: Date
}
```

### Fluxo de Compra
1. **Solicitação** → Funcionário solicita compra
2. **Cotação** → Busca de preços com fornecedores
3. **Aprovação** → Gestor aprova
4. **Pedido** → Envia pedido ao fornecedor
5. **Recebimento** → Confere e dá entrada no estoque
6. **Pagamento** → Lança no contas a pagar

---

## 💼 7. VENDAS

```typescript
interface Venda {
  id: string
  numero: string
  
  // Cliente
  clienteId: string
  clienteNome: string
  
  // Vendedor
  vendedorId: string
  vendedorNome: string
  
  // Itens
  itens: ItemVenda[]
  
  // Valores
  subtotal: number
  desconto: number
  acrescimo: number
  total: number
  
  // Pagamento
  formaPagamento: FormasPagamento[]
  parcelas: Parcela[]
  
  // Comissão
  percentualComissao: number
  valorComissao: number
  
  // Entrega
  tipoEntrega: 'Retirada' | 'Entrega' | 'Digital'
  enderecoEntrega?: Endereco
  dataPrevisaoEntrega?: Date
  dataEntrega?: Date
  
  // Fiscal
  notaFiscal?: string
  numeroNF?: string
  chaveNF?: string
  emitirNFe: boolean
  
  // Status
  status: 'Orçamento' | 'Aguardando Pagamento' | 'Pago' | 'Em Separação' | 'Entregue' | 'Cancelado'
  
  // Controle
  data: Date
  observacoes: string
}

interface ItemVenda {
  produtoId: string
  produtoNome: string
  quantidade: number
  valorUnitario: number
  desconto: number
  valorTotal: number
}

interface Parcela {
  numero: number
  dataVencimento: Date
  valor: number
  status: 'Pendente' | 'Pago' | 'Atrasado'
}
```

---

## 📄 8. CONTRATOS

```typescript
interface Contrato {
  id: string
  numero: string
  
  // Tipo
  tipo: 
    | 'Prestação de Serviços'
    | 'Contrato Social'
    | 'Contrato Comercial'
    | 'Locação'
    | 'Fornecedor'
    | 'Cliente'
    | 'Confidencialidade (NDA)'
    | 'Estágio'
    | 'CLT'
    | 'PJ'
    | 'Temporário'
    | 'Experiência'
    | 'Parceria'
    | 'Convênio'
    | 'Franquia'
    | 'Outros'
  
  // Partes
  contratante: {
    tipo: 'Pessoa Física' | 'Pessoa Jurídica'
    nome: string
    cpfCnpj: string
    endereco: string
  }
  
  contratado: {
    tipo: 'Pessoa Física' | 'Pessoa Jurídica'
    nome: string
    cpfCnpj: string
    endereco: string
  }
  
  // Vigência
  dataInicio: Date
  dataFim?: Date
  prazo?: number // meses
  renovacaoAutomatica: boolean
  diasAvisoVencimento: number // alertar X dias antes
  
  // Valores
  valor?: number
  periodicidade?: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual' | 'Único'
  reajuste?: {
    indice: 'IGPM' | 'IPCA' | 'CDI' | 'Fixo' | 'Sem Reajuste'
    percentual?: number
    periodicidade: number // meses
  }
  
  // Documentos
  arquivoPDF: string
  versoes: VersaoContrato[]
  
  // Assinatura Digital
  assinado: boolean
  dataAssinatura?: Date
  assinaturas: Assinatura[]
  
  // Status
  status: 'Rascunho' | 'Aguardando Assinatura' | 'Vigente' | 'Vencido' | 'Rescindido' | 'Renovado'
  
  // Controle
  criadoPor: string
  dataCriacao: Date
  observacoes: string
  anexos: Documento[]
}

interface VersaoContrato {
  versao: number
  arquivoPDF: string
  data: Date
  alteradoPor: string
  descricaoAlteracao: string
}

interface Assinatura {
  signatario: string
  cpf: string
  email: string
  dataAssinatura?: Date
  assinado: boolean
  ip?: string
  hashDocumento?: string
}
```

### Biblioteca de Templates por Nicho
- **Clínica Médica:** Contrato de Prestação de Serviços, Termo de Consentimento, Contrato Convênio
- **Odontologia:** Contrato Tratamento, Termo Responsabilidade, Plano de Tratamento
- **Veterinária:** Contrato Serviços Veterinários, Termo Cirurgia, Termo Eutanásia
- **Academia:** Contrato Matrícula, Termo Responsabilidade, Adesão Plano
- **Psicologia:** Contrato Terapia, Termo Confidencialidade
- **Nutrição:** Contrato Consultas, Termo Responsabilidade

### Funcionalidades
- ✅ Upload de PDF
- ✅ Assinatura Digital (integração Clicksign/DocuSign)
- ✅ Versionamento Automático
- ✅ Alertas de Vencimento
- ✅ Renovação Automática
- ✅ Rescisão de Contrato
- ✅ Histórico Completo

---

## 👔 9. RH (RECURSOS HUMANOS)

```typescript
interface Funcionario {
  id: string
  
  // Dados Pessoais
  nome: string
  cpf: string
  rg: string
  orgaoEmissor: string
  dataNascimento: Date
  sexo: 'M' | 'F' | 'Outro'
  estadoCivil: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'União Estável'
  nacionalidade: string
  naturalidade: string
  
  // Contato
  telefone: string
  celular: string
  email: string
  
  // Endereço
  endereco: Endereco
  
  // Documentos
  ctps: string // Carteira de Trabalho
  pis: string
  tituloEleitor?: string
  reservista?: string
  cnh?: {
    numero: string
    categoria: string
    validade: Date
  }
  
  // Dados Profissionais
  cargo: string
  departamento: string
  centroCusto: string
  dataAdmissao: Date
  dataDemissao?: Date
  tipoContrato: 'CLT' | 'PJ' | 'Estagiário' | 'Temporário' | 'Autônomo'
  situacao: 'Ativo' | 'Afastado' | 'Férias' | 'Demitido'
  
  // Remuneração
  salario: number
  comissao?: {
    tipo: 'Percentual' | 'Fixo por Venda'
    valor: number
  }
  beneficios: Beneficio[]
  
  // Jornada
  jornadaTrabalho: {
    tipo: 'Integral' | 'Meio Período' | 'Escala' | 'Flexível'
    horasDiarias: number
    diasSemanais: number
    horarioEntrada?: string
    horarioSaida?: string
  }
  
  // Banco
  dadosBancarios: {
    banco: string
    agencia: string
    conta: string
    tipoConta: 'Corrente' | 'Poupança'
    pix?: string
  }
  
  // Controle
  ferias: Ferias[]
  atestados: Atestado[]
  advertencias: Advertencia[]
  treinamentos: Treinamento[]
  avaliacoes: Avaliacao[]
  
  // Exames
  exameAdmissional?: Exame
  examesPeriodicos: Exame[]
  exameDemissional?: Exame
  
  // Documentos
  documentos: Documento[]
  contratoTrabalho: string
  
  // Ponto
  registrosPonto: RegistroPonto[]
  bancoHoras: number // horas positivas ou negativas
}

interface Beneficio {
  tipo: 'Vale Transporte' | 'Vale Alimentação' | 'Vale Refeição' | 'Plano Saúde' | 'Plano Odonto' | 'Seguro Vida' | 'Outros'
  valor: number
  descontarFolha: boolean
}

interface Ferias {
  periodoAquisitivo: {
    inicio: Date
    fim: Date
  }
  dataInicio: Date
  dataFim: Date
  dias: number
  status: 'Programadas' | 'Em Gozo' | 'Concluídas' | 'Canceladas'
  abono?: number // dias vendidos
}

interface FolhaPagamento {
  id: string
  funcionarioId: string
  mesReferencia: string // "2024-01"
  
  // Vencimentos
  salarioBase: number
  horasExtras: number
  comissoes: number
  bonus: number
  adicionais: number
  outrosVencimentos: number
  
  // Descontos
  inss: number
  irrf: number
  valeTransporte: number
  valeAlimentacao: number
  faltas: number
  atrasos: number
  adiantamento: number
  emprestimos: number
  outrosDescontos: number
  
  // Totais
  totalVencimentos: number
  totalDescontos: number
  salarioLiquido: number
  
  // Controle
  dataProcessamento: Date
  dataPagamento?: Date
  status: 'Aberta' | 'Processada' | 'Paga'
}

interface RegistroPonto {
  funcionarioId: string
  data: Date
  entrada1?: Date
  saida1?: Date
  entrada2?: Date
  saida2?: Date
  horasTrabalhadas: number
  horasExtras: number
  atrasos: number
  faltas: boolean
  observacoes?: string
}
```

### Funcionalidades RH
- ✅ Cadastro Completo de Funcionários
- ✅ Folha de Pagamento Automatizada
- ✅ Cálculo Automático de INSS, IRRF, FGTS
- ✅ Controle de Férias (programação e gozo)
- ✅ Controle de 13º Salário
- ✅ Ponto Eletrônico
- ✅ Banco de Horas
- ✅ Controle de Atestados
- ✅ Advertências e Elogios
- ✅ Treinamentos
- ✅ Avaliações de Desempenho
- ✅ Rescisão de Contrato
- ✅ Geração de Guias (GPS, DARF, SEFIP)
- ✅ eSocial (integração)

---

## 📅 10. AGENDA

```typescript
interface Agendamento {
  id: string
  
  // Tipo
  tipo: 
    | 'Consulta'
    | 'Cirurgia'
    | 'Retorno'
    | 'Reunião'
    | 'Avaliação'
    | 'Procedimento'
    | 'Exame'
    | 'Lembrete'
    | 'Aniversário'
    | 'Pagamento'
    | 'Cobrança'
    | 'Vencimento Contrato'
    | 'Outro'
  
  // Cliente/Paciente
  clienteId?: string
  clienteNome?: string
  
  // Profissional
  profissionalId?: string
  profissionalNome?: string
  
  // Data e Hora
  dataHora: Date
  duracao: number // minutos
  dataFim: Date // calculado automaticamente
  
  // Status
  status: 'Agendado' | 'Confirmado' | 'Em Atendimento' | 'Concluído' | 'Cancelado' | 'Faltou'
  
  // Confirmação
  confirmado: boolean
  dataConfirmacao?: Date
  lembreteEnviado: boolean
  
  // Detalhes
  titulo: string
  descricao?: string
  observacoes?: string
  
  // Recorrência
  recorrente: boolean
  frequencia?: 'Diária' | 'Semanal' | 'Quinzenal' | 'Mensal' | 'Anual'
  diasSemana?: number[] // 0-6 (domingo-sábado)
  dataFimRecorrencia?: Date
  
  // Lembretes
  lembretes: {
    tipo: 'Email' | 'SMS' | 'WhatsApp' | 'Push'
    antecedencia: number // horas
    enviado: boolean
  }[]
  
  // Controle
  criadoPor: string
  dataCriacao: Date
  cor?: string // para visualização no calendário
}
```

### Visualizações
- 📅 Calendário Diário
- 📅 Calendário Semanal
- 📅 Calendário Mensal
- 📋 Lista de Agendamentos
- 👤 Por Profissional
- 🏢 Por Sala/Consultório

### Integrações
- ✅ Google Calendar
- ✅ Outlook Calendar
- ✅ Apple Calendar

### Lembretes Automáticos
- 📧 Email (24h antes, 2h antes)
- 📱 SMS (24h antes, 2h antes)
- 💬 WhatsApp (24h antes, 2h antes)
- 🔔 Push Notification (30min antes)

---

## 📁 11. DOCUMENTOS

### Sistema de Gestão Documental por Nicho

```typescript
interface Documento {
  id: string
  
  // Tipo
  nicho: string
  categoria: string
  subcategoria?: string
  
  // Arquivo
  nomeArquivo: string
  tipo: 'PDF' | 'JPEG' | 'PNG' | 'DOCX' | 'XLSX' | 'DICOM' | 'STL' | 'Outros'
  tamanho: number // bytes
  url: string
  thumbnail?: string
  
  // Relacionamento
  clienteId?: string
  funcionarioId?: string
  fornecedorId?: string
  contratoId?: string
  
  // Metadata
  titulo: string
  descricao?: string
  tags: string[]
  data: Date
  
  // Controle
  uploadPor: string
  dataUpload: Date
  visualizacoes: number
  downloads: number
  
  // Segurança
  privado: boolean
  criptografado: boolean
  assinado: boolean
  hashDocumento?: string
  
  // Versionamento
  versao: number
  versaoAnterior?: string
}
```

### Categorias por Nicho

#### CLÍNICA MÉDICA
```typescript
const categoriasClinicaMedica = [
  'Prontuários',
  'Receitas Médicas',
  'Pedidos de Exame',
  'Laudos Médicos',
  'Raio-X',
  'Tomografia',
  'Ressonância Magnética',
  'Ultrassom',
  'Exames Laboratoriais',
  'Eletrocardiograma',
  'Atestados Médicos',
  'Termos de Consentimento',
  'Fotos Clínicas',
  'Documentos Paciente'
]
```

#### VETERINÁRIA
```typescript
const categoriasVeterinaria = [
  'Carteira de Vacinação',
  'Exames Veterinários',
  'Radiografias',
  'Ultrassom',
  'Prontuário Animal',
  'Receitas Veterinárias',
  'Termos de Cirurgia',
  'Fotos do Pet',
  'Pedigree',
  'Microchip',
  'Atestado Óbito',
  'Documentos Tutor'
]
```

#### ODONTOLOGIA
```typescript
const categoriasOdontologia = [
  'Radiografias Periapicais',
  'Radiografias Panorâmicas',
  'Tomografia Cone Beam',
  'Fotos Intraorais',
  'Fotos Extraorais',
  'Fotos Antes/Depois',
  'Odontograma',
  'Planejamento Tratamento',
  'Orçamentos',
  'Implantes',
  'Próteses',
  'Termos Consentimento',
  'Anamnese',
  'Documentos Paciente'
]
```

#### PSICOLOGIA
```typescript
const categoriasPsicologia = [
  'Anamnese',
  'Evolução Terapêutica', // CRIPTOGRAFADO
  'Testes Psicológicos',
  'Laudos Psicológicos',
  'Relatórios',
  'Encaminhamentos',
  'Termos de Consentimento',
  'Documentos Cliente'
]
```

#### NUTRIÇÃO
```typescript
const categoriasNutricao = [
  'Avaliação Nutricional',
  'Plano Alimentar',
  'Recordatório Alimentar',
  'Exames Laboratoriais',
  'Bioimpedância',
  'Fotos Progresso',
  'Receitas',
  'Termos Consentimento',
  'Documentos Cliente'
]
```

#### ACADEMIA
```typescript
const categoriasAcademia = [
  'Ficha de Anamnese',
  'Avaliação Física',
  'Ficha de Treino',
  'Evolução Física',
  'Fotos Progresso',
  'Exames Médicos',
  'Atestados',
  'Contratos',
  'Termos Responsabilidade',
  'Documentos Aluno'
]
```

### Funcionalidades Documentos
- ✅ Upload Múltiplo (drag & drop)
- ✅ Visualizador Integrado (PDF, Imagens, DICOM)
- ✅ OCR (reconhecimento de texto em imagens)
- ✅ Assinatura Digital
- ✅ Versionamento
- ✅ Busca por Texto (OCR)
- ✅ Busca por Tags
- ✅ Filtros Avançados
- ✅ Compartilhamento Seguro
- ✅ Download em Lote
- ✅ Impressão
- ✅ Criptografia End-to-End
- ✅ Backup Automático
- ✅ Logs de Acesso

---

## 🏢 12. PATRIMÔNIO

```typescript
interface Patrimonio {
  id: string
  
  // Identificação
  codigo: string
  codigoBarras?: string
  nome: string
  descricao: string
  categoria: CategoriaPatrimonio
  
  // Aquisição
  dataAquisicao: Date
  valorAquisicao: number
  fornecedor?: string
  notaFiscal?: string
  
  // Localização
  localizacao: {
    unidade?: string
    sala?: string
    setor?: string
    responsavel?: string
  }
  
  // Depreciação
  vidaUtil: number // anos
  valorResidual: number
  metodoDepreciacao: 'Linear' | 'Soma dos Dígitos' | 'Saldo Decrescente'
  depreciacaoAcumulada: number
  valorAtual: number
  
  // Manutenção
  manutencoes: Manutencao[]
  proximaManutencao?: Date
  garantia?: {
    dataInicio: Date
    dataFim: Date
    fornecedor: string
    observacoes: string
  }
  
  // Seguro
  seguro?: {
    seguradora: string
    apolice: string
    valorSegurado: number
    vigencia: {
      inicio: Date
      fim: Date
    }
  }
  
  // Status
  situacao: 'Ativo' | 'Inativo' | 'Em Manutenção' | 'Sucateado' | 'Vendido'
  estado: 'Novo' | 'Ótimo' | 'Bom' | 'Regular' | 'Ruim'
  
  // Controle
  foto?: string
  documentos: Documento[]
  observacoes: string
}

type CategoriaPatrimonio = 
  | 'Equipamentos Médicos'
  | 'Equipamentos Odontológicos'
  | 'Equipamentos Veterinários'
  | 'Equipamentos Academia'
  | 'Computadores'
  | 'Notebooks'
  | 'Tablets'
  | 'Smartphones'
  | 'Impressoras'
  | 'Servidores'
  | 'Móveis'
  | 'Veículos'
  | 'Ferramentas'
  | 'Aparelhos'
  | 'Outros'

interface Manutencao {
  data: Date
  tipo: 'Preventiva' | 'Corretiva' | 'Calibração'
  descricao: string
  responsavel: string
  custo: number
  fornecedor?: string
  notaFiscal?: string
  observacoes: string
}
```

### Exemplos de Patrimônio por Nicho

#### Odontologia
- Cadeira Odontológica
- Compressor
- Autoclave
- Raio-X Intraoral
- Raio-X Panorâmico
- Fotopolimerizador
- Amalgamador
- Ultrassom Odontológico
- Motor de Alta/Baixa Rotação

#### Veterinária
- Mesa Cirúrgica
- Aparelho de Anestesia
- Raio-X Veterinário
- Ultrassom Veterinário
- Autoclave
- Oxímetro
- Bombas de Infusão

#### Academia
- Esteiras
- Bicicletas Ergométricas
- Elípticos
- Aparelhos de Musculação
- Halteres
- Anilhas
- Barras

---

## 💼 13. CENTRO DE CUSTOS

```typescript
interface CentroCusto {
  id: string
  codigo: string
  nome: string
  descricao: string
  tipo: 'Receita' | 'Despesa' | 'Investimento'
  
  // Hierarquia
  centroPai?: string
  nivel: number
  
  // Responsável
  responsavel: string
  
  // Orçamento
  orcamentoMensal?: number
  orcamentoAnual?: number
  
  // Realizado
  realizadoMes: number
  realizadoAno: number
  
  // Status
  ativo: boolean
  
  // Rateio
  permiteRateio: boolean
  percentualRateio?: number
}
```

### Estrutura de Centros de Custo

```
1. RECEITAS
  1.1. Vendas de Produtos
  1.2. Prestação de Serviços
  1.3. Consultorias
  1.4. Outras Receitas

2. COMERCIAL
  2.1. Marketing
  2.2. Vendas
  2.3. Pós-Venda

3. OPERACIONAL
  3.1. Produção
  3.2. Atendimento
  3.3. Logística

4. ADMINISTRATIVO
  4.1. Recursos Humanos
  4.2. Financeiro
  4.3. Contabilidade
  4.4. Jurídico

5. INFRAESTRUTURA
  5.1. TI
  5.2. Manutenção
  5.3. Facilities

6. UNIDADES (se houver múltiplas unidades)
  6.1. Unidade 1
  6.2. Unidade 2
```

---

## 🔍 14. AUDITORIA

```typescript
interface LogAuditoria {
  id: string
  
  // Ação
  timestamp: Date
  modulo: string
  acao: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'DOWNLOAD' | 'EXPORT' | 'LOGIN' | 'LOGOUT'
  
  // Usuário
  usuarioId: string
  usuarioNome: string
  usuarioEmail: string
  
  // Registro Alterado
  entidade: string // 'Cliente', 'Produto', 'Venda', etc
  registroId: string
  
  // Dados Alterados
  valoresAnteriores?: Record<string, any>
  valoresNovos?: Record<string, any>
  camposAlterados?: string[]
  
  // Contexto
  ip: string
  userAgent: string
  dispositivo: string
  localizacao?: {
    cidade: string
    estado: string
    pais: string
  }
  
  // Resultado
  sucesso: boolean
  mensagemErro?: string
}
```

### Eventos Auditados
- ✅ Login/Logout
- ✅ Criação de Registros
- ✅ Edição de Registros
- ✅ Exclusão de Registros
- ✅ Visualização de Dados Sensíveis
- ✅ Download de Documentos
- ✅ Exportação de Relatórios
- ✅ Alterações de Permissões
- ✅ Movimentações Financeiras
- ✅ Alterações de Preços
- ✅ Cancelamentos

### Relatórios de Auditoria
- Ações por Usuário
- Ações por Módulo
- Ações por Período
- Alterações em Registro Específico
- Acessos Negados
- Tentativas de Login Falhas
- Exportações de Dados

---

## 📊 15. RELATÓRIOS ERP

### Relatórios Financeiros
- **DRE** (Demonstrativo de Resultado do Exercício)
- **Fluxo de Caixa** (Realizado e Projetado)
- **Contas a Pagar** (por vencimento, fornecedor, categoria)
- **Contas a Receber** (por vencimento, cliente, situação)
- **Análise de Inadimplência**
- **Análise de Custos** (por centro de custo)
- **Faturamento** (por período, produto, serviço, cliente)
- **Comissões** (por vendedor, período)
- **Impostos** (resumo de impostos pagos)

### Relatórios de Estoque
- **Posição de Estoque**
- **Movimentação de Estoque** (entradas e saídas)
- **Produtos Abaixo do Mínimo**
- **Produtos Vencendo**
- **Giro de Estoque**
- **Curva ABC** (classificação de produtos)
- **Inventário**
- **Perdas e Quebras**

### Relatórios de Vendas
- **Vendas por Período**
- **Vendas por Produto**
- **Vendas por Vendedor**
- **Vendas por Cliente**
- **Ranking de Produtos**
- **Ranking de Clientes**
- **Taxa de Conversão**
- **Análise de Descontos**
- **Devoluções**

### Relatórios de Compras
- **Compras por Período**
- **Compras por Fornecedor**
- **Compras por Produto**
- **Análise de Preços**
- **Histórico de Fornecedores**

### Relatórios de RH
- **Folha de Pagamento**
- **Férias** (programadas, vencidas)
- **13º Salário**
- **Ponto Eletrônico**
- **Banco de Horas**
- **Atestados**
- **Aniversariantes do Mês**
- **Admissões e Demissões**
- **Turnover**

### Relatórios de Clientes
- **Clientes Ativos/Inativos**
- **Clientes por Nicho**
- **Histórico de Atendimentos**
- **Análise de Retenção**
- **LTV** (Lifetime Value)
- **Churn Rate**

### Relatórios por Nicho

#### Clínica Médica
- Atendimentos por Especialidade
- Atendimentos por Convênio
- Procedimentos Realizados
- Exames Solicitados

#### Odontologia
- Procedimentos por Tipo
- Implantes Realizados
- Tratamentos em Andamento
- Convênios Odontológicos

#### Veterinária
- Atendimentos por Espécie
- Vacinas Aplicadas
- Cirurgias Realizadas
- Pets Ativos

#### Academia
- Alunos Ativos/Inativos
- Frequência de Alunos
- Planos Mais Vendidos
- Inadimplência

---

## 🔐 16. PERMISSÕES E PERFIS

```typescript
type Perfil = 
  | 'Master'        // Acesso total
  | 'Empresário'    // Acesso total menos configurações críticas
  | 'Gestor'        // Acesso gerencial
  | 'Funcionário'   // Acesso limitado
  | 'Recepcionista' // Agenda e cadastros básicos
  | 'Financeiro'   // Apenas módulo financeiro
  | 'Vendedor'      // Vendas e clientes
  | 'Estoquista'    // Apenas estoque
  | 'Personalizado' // Permissões customizadas

interface Permissoes {
  modulo: string
  visualizar: boolean
  criar: boolean
  editar: boolean
  excluir: boolean
  exportar: boolean
}
```

### Matriz de Permissões

| Módulo | Master | Empresário | Gestor | Funcionário | Recepcionista |
|--------|--------|------------|--------|-------------|---------------|
| Dashboard ERP | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ | ✅❌❌❌ | ✅❌❌❌ |
| Financeiro | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ | ✅❌❌❌ | ❌❌❌❌ |
| Clientes | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅❌ | ✅✅✅❌ |
| Fornecedores | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ | ❌❌❌❌ |
| Estoque | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅❌ | ✅❌❌❌ |
| Compras | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ | ❌❌❌❌ |
| Vendas | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅❌ | ✅✅❌❌ |
| Contratos | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅❌ | ✅❌❌❌ | ❌❌❌❌ |
| RH | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅❌ | ✅❌❌❌ | ❌❌❌❌ |
| Agenda | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅❌ | ✅✅✅❌ |
| Documentos | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅❌ | ✅✅❌❌ |
| Patrimônio | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ | ❌❌❌❌ |
| Auditoria | ✅✅❌❌ | ✅✅❌❌ | ✅❌❌❌ | ❌❌❌❌ | ❌❌❌❌ |
| Relatórios | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅❌ | ✅❌❌❌ | ✅❌❌❌ |

*Legenda: ✅Ver ✅Criar ✅Editar ✅Excluir*

---

## 🎨 17. PAINEL DE INDICADORES POR NICHO

### Clínica Médica
- 👥 Pacientes Atendidos (dia/mês)
- 📅 Taxa de Ocupação da Agenda
- 💰 Faturamento por Convênio
- ⏱️ Tempo Médio de Atendimento
- 🎯 Taxa de Retorno
- 📊 Procedimentos Mais Realizados
- ❌ Taxa de Falta

### Odontologia
- 👥 Pacientes Atendidos (dia/mês)
- 💰 Ticket Médio por Tratamento
- 📈 Taxa de Aceitação de Orçamentos
- 🦷 Implantes Realizados
- 📅 Agendamentos vs Realizados
- 💳 Faturamento por Convênio
- 🔄 Taxa de Retorno

### Veterinária
- 🐾 Pets Atendidos (dia/mês)
- 💉 Vacinas Aplicadas
- 🏥 Cirurgias Realizadas
- 💰 Ticket Médio
- 📦 Produtos Vendidos (ração, remédios)
- 🎯 Taxa de Retorno
- 📅 Taxa de Ocupação

### Academia
- 💪 Alunos Ativos
- 📈 Novas Matrículas (mês)
- 📉 Cancelamentos (mês)
- 💰 Receita Recorrente (MRR)
- 🎯 Taxa de Retenção
- 💳 Inadimplência
- 🏋️ Frequência Média

### Psicologia
- 👥 Pacientes Ativos
- 📅 Sessões Realizadas (semana/mês)
- 💰 Ticket Médio por Sessão
- 🎯 Taxa de Continuidade
- ⏱️ Duração Média do Tratamento
- 📊 Taxa de Alta

### Nutrição
- 👥 Pacientes Ativos
- 📅 Consultas Realizadas
- 🎯 Taxa de Aderência ao Plano
- 📉 Média de Perda de Peso
- 🔄 Taxa de Retorno
- 💰 Ticket Médio

---

## 📚 18. BIBLIOTECA DE CONTRATOS (Templates Prontos)

### Clínica Médica
1. Contrato de Prestação de Serviços Médicos
2. Termo de Consentimento Livre e Esclarecido (TCLE)
3. Contrato com Convênio Médico
4. Termo de Responsabilidade e Risco
5. Contrato de Locação de Consultório
6. Contrato de Parceria entre Médicos

### Odontologia
1. Contrato de Prestação de Serviços Odontológicos
2. Termo de Consentimento para Tratamento
3. Plano de Tratamento Odontológico
4. Termo de Responsabilidade - Implante Dentário
5. Termo de Responsabilidade - Clareamento
6. Contrato com Plano Odontológico

### Veterinária
1. Contrato de Prestação de Serviços Veterinários
2. Termo de Consentimento - Cirurgia Animal
3. Termo de Responsabilidade - Anestesia
4. Termo de Autorização - Eutanásia
5. Contrato de Internação Animal
6. Termo de Retirada de Animal

### Academia
1. Contrato de Adesão - Matrícula Academia
2. Termo de Responsabilidade e Risco
3. Avaliação Médica Pré-Treino
4. Termo de Autorização de Imagem
5. Contrato Personal Trainer
6. Termo de Rescisão

### Psicologia
1. Contrato de Prestação de Serviços Psicológicos
2. Termo de Consentimento e Confidencialidade
3. Contrato Terapia Infantil (responsável)
4. Termo de Autorização - Terapia Online
5. Contrato de Supervisão
6. Contrato de Avaliação Psicológica

### Nutrição
1. Contrato de Consultas Nutricionais
2. Termo de Responsabilidade
3. Autorização para Avaliação Corporal
4. Contrato Acompanhamento Nutricional
5. Termo de Consentimento - Fotos
6. Contrato Plano Alimentar Personalizado

### Genéricos (todos os nichos)
1. Contrato Social
2. Contrato de Locação Comercial
3. Contrato de Prestação de Serviços (genérico)
4. Contrato de Confidencialidade (NDA)
5. Contrato de Parceria
6. Contrato de Trabalho CLT
7. Contrato de Trabalho PJ
8. Contrato de Estágio
9. Contrato de Fornecimento
10. Termo de Rescisão Contratual

**Funcionalidade:** Cada template pode ser personalizado antes de gerar o PDF final, com campos dinâmicos que puxam automaticamente dados do cliente/empresa.

---

## 🌐 19. INTEGRAÇÕES EXTERNAS

### Contabilidade
- ✅ Exportação para Domínio Sistemas
- ✅ Exportação para Conta Azul
- ✅ Exportação para TOTVS
- ✅ Exportação XML NFe
- ✅ Exportação SPED Fiscal
- ✅ Exportação SPED Contribuições

### Pagamentos
- ✅ PagSeguro
- ✅ Mercado Pago
- ✅ PayPal
- ✅ Stripe
- ✅ Asaas
- ✅ Boleto Bancário (API bancos)
- ✅ PIX (API BACEN)

### Nota Fiscal
- ✅ NFe (Nota Fiscal Eletrônica)
- ✅ NFSe (Nota Fiscal de Serviço)
- ✅ NFCe (Nota Fiscal Consumidor)
- ✅ Integração Focus NFe
- ✅ Integração eNotas

### Correios e Logística
- ✅ Cálculo de Frete (Correios, Jadlog, etc)
- ✅ Rastreamento de Encomendas
- ✅ Etiqueta de Envio

### Comunicação
- ✅ WhatsApp Business API
- ✅ Twilio (SMS)
- ✅ SendGrid (Email)
- ✅ Firebase Cloud Messaging (Push)

### Assinatura Digital
- ✅ Clicksign
- ✅ DocuSign
- ✅ D4Sign

### Calendário
- ✅ Google Calendar
- ✅ Outlook Calendar
- ✅ Apple Calendar

### eSocial
- ✅ Envio de Eventos eSocial
- ✅ Integração FGTS Digital
- ✅ Geração de Guias (GPS, DARF)

---

## 💾 20. BANCO DE DADOS

### Estrutura Firestore

```
empresas/
  {empresaId}/
    dados: { nome, cnpj, plano, ... }
    
    clientes/
      {clienteId}/
        dados: { ... }
        prontuarios/
        documentos/
        pets/ (se veterinária)
    
    fornecedores/
      {fornecedorId}/
    
    produtos/
      {produtoId}/
        movimentacoes/
    
    vendas/
      {vendaId}/
        itens/
        parcelas/
    
    compras/
      {compraId}/
    
    contratos/
      {contratoId}/
    
    funcionarios/
      {funcionarioId}/
        ferias/
        atestados/
        folhasPagamento/
    
    agendamentos/
      {agendamentoId}/
    
    documentos/
      {documentoId}/
    
    patrimonios/
      {patrimonioId}/
    
    auditoria/
      {logId}/
    
    configuracoes/
      permissoes/
      centrosCusto/
      categorias/
```

---

## 📱 21. VERSÃO MOBILE (Futuro)

### App Empresário
- Dashboard resumido
- Notificações importantes
- Agenda do dia
- Aprovar/reprovar solicitações
- Visualizar relatórios
- Chat com equipe

### App Funcionário
- Marcar ponto
- Ver escala
- Solicitar férias/adiantamentos
- Ver holerites
- Chat com gestão

### App Cliente
- Agendar consultas
- Ver histórico
- Ver documentos
- Chat com clínica
- Receber lembretes
- Fazer pagamentos

---

## 🚀 22. ROADMAP DE IMPLEMENTAÇÃO

### FASE 1 - FUNDAÇÃO (4 semanas)
✅ Estrutura ERP separada do CRM
✅ Dashboard ERP com KPIs principais
✅ Navegação CRM ↔ ERP
✅ Sistema de Permissões
- Configurações Iniciais por Nicho

### FASE 2 - FINANCEIRO COMPLETO (4 semanas)
- Recebimentos (todas as formas de pagamento)
- Contas a Pagar
- Fluxo de Caixa Avançado
- DRE
- Centro de Custos

### FASE 3 - CLIENTES ERP (3 semanas)
- Cadastro Base de Clientes
- Campos por Nicho (Médica, Veterinária, Odonto, etc)
- Prontuários
- Histórico Completo

### FASE 4 - ESTOQUE & FORNECEDORES (3 semanas)
- Cadastro de Fornecedores
- Cadastro de Produtos
- Controle de Lotes e Validade
- Movimentações de Estoque
- Alertas Automáticos

### FASE 5 - COMPRAS & VENDAS (3 semanas)
- Fluxo Completo de Compras
- Vendas/Orçamentos
- Comissões
- Notas Fiscais

### FASE 6 - CONTRATOS (2 semanas)
- Sistema de Contratos
- Templates por Nicho
- Versionamento
- Assinatura Digital
- Alertas de Vencimento

### FASE 7 - RH (4 semanas)
- Cadastro de Funcionários
- Folha de Pagamento
- Ponto Eletrônico
- Férias e 13º
- Documentos

### FASE 8 - AGENDA (2 semanas)
- Calendário Completo
- Agendamentos
- Lembretes Automáticos
- Integrações (Google, Outlook)

### FASE 9 - DOCUMENTOS (3 semanas)
- Sistema de Upload
- Categorização por Nicho
- Visualizador Integrado
- OCR
- Busca Avançada

### FASE 10 - PATRIMÔNIO & AUDITORIA (2 semanas)
- Controle de Patrimônio
- Depreciação
- Manutenções
- Logs de Auditoria

### FASE 11 - RELATÓRIOS (2 semanas)
- Todos os Relatórios Financeiros
- Relatórios Operacionais
- Relatórios por Nicho
- Exportação PDF/Excel

### FASE 12 - INTEGRAÇÕES (4 semanas)
- NFe/NFSe
- Pagamentos Online
- WhatsApp Business API
- Assinatura Digital
- Contabilidade

### FASE 13 - OTIMIZAÇÃO & TESTES (2 semanas)
- Performance
- Testes de Carga
- Correções de Bugs
- Melhorias UX

---

## 💡 23. DIFERENCIAIS COMPETITIVOS

### vs TOTVS / Omie / Conta Azul
✅ **Interface muito mais intuitiva** ("bem mastigado")
✅ **Personalizado por nicho** (campos específicos para cada área)
✅ **IA integrada** (prospecção, sugestões, automações)
✅ **Chat WhatsApp nativo** (não precisa integração externa)
✅ **Preço mais acessível** (modelo SaaS)
✅ **Onboarding guiado** (configuração em minutos)
✅ **Suporte humanizado** (não é só chatbot)
✅ **Documentos organizados por nicho** (prontuários, exames, etc)
✅ **Templates de contratos prontos**
✅ **Dark mode nativo**

### vs Salesforce / HubSpot
✅ **Foco em pequenas e médias empresas** (não exige equipe técnica)
✅ **Preço 10x mais barato**
✅ **ERP integrado** (não precisa contratar separado)
✅ **Interface em português** (100% localizado)
✅ **Atendimento via WhatsApp** (não só email)
✅ **Sem necessidade de treinamento complexo**

---

## 🎯 24. PRÓXIMOS PASSOS

1. ✅ **Estrutura ERP criada** (CONCLUÍDO)
2. ✅ **Dashboard ERP funcional** (CONCLUÍDO)
3. ✅ **Fluxo de Caixa ERP** (CONCLUÍDO)
4. 🔄 **Implementar Recebimentos** (PRÓXIMO)
5. 🔄 **Implementar Contas a Pagar** (PRÓXIMO)
6. 🔄 **Implementar DRE** (PRÓXIMO)
7. 📋 **Clientes ERP com campos por nicho**
8. 📋 **Fornecedores completo**
9. 📋 **Estoque com controle de lotes**
10. 📋 **Compras & Vendas**
11. 📋 **Contratos com templates**
12. 📋 **RH com folha de pagamento**
13. 📋 **Agenda com integrações**
14. 📋 **Documentos por nicho**
15. 📋 **Patrimônio**
16. 📋 **Auditoria**
17. 📋 **Relatórios avançados**
18. 📋 **Integrações externas**

---

## 📦 25. DISTRIBUIÇÃO (Download Standalone)

### Opções de Distribuição

#### Cloud (SaaS) - Principal
- Acesso via navegador
- Servidor centralizado
- Banco de dados Firestore
- Atualizações automáticas
- Planos mensais

#### Desktop (Electron) - Futuro
- Aplicativo instalável (Windows, Mac, Linux)
- Funciona offline (sincroniza quando online)
- Banco local SQLite + sync Firestore
- Atualização automática
- Licença perpétua ou assinatura

#### Mobile (React Native) - Futuro
- App nativo iOS/Android
- Versão simplificada
- Notificações push
- Offline first

---

## 💰 26. MODELO DE NEGÓCIO

### Planos SaaS (Mensal)

#### STARTER - R$ 97/mês
- 1 usuário
- 100 clientes
- CRM Básico
- WhatsApp
- Relatórios básicos

#### PROFESSIONAL - R$ 297/mês
- 5 usuários
- 1.000 clientes
- CRM + ERP Completo
- IA Prospecção
- Todos os módulos
- Relatórios avançados
- Suporte prioritário

#### ENTERPRISE - R$ 697/mês
- Usuários ilimitados
- Clientes ilimitados
- Tudo do Professional
- White Label
- API Access
- Suporte dedicado
- Customizações

#### CUSTOM - Sob Consulta
- Desenvolvimento personalizado
- Integrações específicas
- Servidor dedicado
- SLA garantido

### Licença Perpétua (Desktop)
- **R$ 2.997** (pagamento único)
- Atualizações por 1 ano
- Suporte por 1 ano
- Renovação anual R$ 497

---

## 🎨 27. DESIGN SYSTEM

### Cores CRM (Verde/Azul)
```css
--crm-primary: #10b981
--crm-secondary: #3b82f6
--crm-accent: #06b6d4
```

### Cores ERP (Roxo/Azul)
```css
--erp-primary: #8b5cf6
--erp-secondary: #6366f1
--erp-accent: #a855f7
```

### Dark Mode
```css
--bg-dark: #0f172a
--bg-dark-secondary: #1e293b
--text-dark: #f1f5f9
```

---

## ✅ RESUMO EXECUTIVO

**Nexus ERP + CRM + IA** é uma plataforma empresarial completa que integra:

✅ **15 módulos principais**
✅ **9 nichos específicos** com campos personalizados
✅ **Inteligência Artificial** integrada
✅ **Interface intuitiva** ("bem mastigado")
✅ **Dark mode** nativo
✅ **Sistema de permissões** robusto
✅ **Auditoria completa**
✅ **Biblioteca de contratos** por nicho
✅ **Integrações** com serviços externos
✅ **Versão Cloud** (SaaS) + **Desktop** (Electron) + **Mobile** (React Native)

**Objetivo:** Substituir TOTVS, Omie, Conta Azul, Salesforce, HubSpot para pequenas e médias empresas dos nichos escolhidos, com interface muito mais amigável e preço acessível.

---

**Documento criado em:** Janeiro 2025
**Versão:** 1.0
**Status:** Planejamento e Implementação Inicial

---

## 🚀 VAMOS IMPLEMENTAR?

Agora que temos toda a **arquitetura documentada**, podemos começar a implementar módulo por módulo.

**Sugestão de próximo passo:**
1. Finalizar Financeiro ERP (Recebimentos completos)
2. Implementar Contas a Pagar
3. Criar DRE
4. Depois partir para Clientes ERP com campos por nicho

O que você prefere começar agora?
