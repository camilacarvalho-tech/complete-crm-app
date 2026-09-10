export enum NichoEmpresa {
  CORRESPONDENTE_BANCARIO = 'CORRESPONDENTE_BANCARIO',
  CLINICA_MEDICA = 'CLINICA_MEDICA',
  ODONTOLOGIA = 'ODONTOLOGIA',
  PSICOLOGIA = 'PSICOLOGIA',
  NUTRICAO = 'NUTRICAO',
  ACADEMIA = 'ACADEMIA',
}

export interface PerfilUsuario {
  id: string;
  nome?: string;
  email?: string;
  telefone?: string;
  role?: string;
}

export interface Usuario {
  id: string;
  email: string;
  nome?: string;
  role?: string;
  ativo?: boolean;
}
