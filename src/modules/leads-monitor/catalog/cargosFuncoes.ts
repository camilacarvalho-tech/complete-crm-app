export const CARGO_TODOS = '__TODOS_CARGOS__'

export const CARGOS_FUNCOES: Array<{ grupo: string; cargos: string[] }> = [
  {
    grupo: 'Operacional',
    cargos: [
      'Açougueiro',
      'Auxiliar de açougue',
      'Atendente',
      'Caixa',
      'Operador de caixa',
      'Repositor',
      'Estoquista',
      'Conferente',
      'Auxiliar de serviços gerais',
      'Auxiliar operacional',
      'Auxiliar administrativo',
      'Auxiliar de produção',
      'Operador',
      'Operador de máquina',
      'Produção',
      'Técnico',
      'Eletricista',
      'Mecânico',
      'Motorista',
      'Entregador',
      'Cozinheiro',
      'Auxiliar de cozinha',
      'Garçom',
      'Recepcionista',
      'Vendedor',
      'Consultor de vendas',
    ],
  },
  {
    grupo: 'Administrativo',
    cargos: [
      'Assistente administrativo',
      'Analista administrativo',
      'Analista financeiro',
      'Financeiro',
      'Contabilidade',
      'Contador',
      'Recursos Humanos',
      'RH',
      'Departamento pessoal',
      'Compras',
      'Fiscal',
      'Jurídico',
      'TI',
      'Tecnologia',
      'Marketing',
      'Comercial',
      'Atendimento',
      'Secretária',
    ],
  },
  {
    grupo: 'Gestão',
    cargos: [
      'Encarregado',
      'Supervisor',
      'Coordenador',
      'Gerente',
      'Gerente administrativo',
      'Gerente comercial',
      'Gerente financeiro',
      'Gerente de RH',
      'Diretor',
      'Diretor administrativo',
      'Diretor comercial',
      'Diretor financeiro',
      'Administrador',
      'Sócio',
      'Sócio-administrador',
      'Proprietário',
      'Dono',
      'Fundador',
      'Responsável pela empresa',
    ],
  },
]

export function todosOsCargos(): string[] {
  return CARGOS_FUNCOES.flatMap((g) => g.cargos)
}

export function cargosEfetivos(selected?: string[]): string[] {
  if (!selected?.length || selected.includes(CARGO_TODOS)) return []
  return selected.filter(Boolean)
}
