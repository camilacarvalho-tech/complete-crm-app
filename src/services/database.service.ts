/**
 * CREDFLOW PLATFORM 2.0 - DATABASE SERVICE
 * Serviço de banco de dados com isolamento multi-tenant automático
 * 
 * REGRAS:
 * - Todo registro carrega empresa_id obrigatório
 * - Toda query é filtrada automaticamente por empresa_id da sessão
 * - Master vê tudo, Empresário vê sua empresa, Funcionário vê seus registros
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
  DocumentData,
  CollectionReference
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  Usuario,
  Empresa,
  Cliente,
  Conversa,
  Mensagem,
  Campanha,
  Produto,
  SmsDisparo,
  SmsResposta,
  FinanceiroLancamento,
  Comissao,
  Contrato,
  Anotacao,
  Remarketing,
  AuditoriaLog,
  PerfilUsuario
} from '../types/database.types'

// ============================================
// CONTEXTO DE AUTENTICAÇÃO
// ============================================

/**
 * Contexto do usuário logado (deve ser setado no login)
 */
let currentUser: {
  id: string
  empresaId: string
  perfil: PerfilUsuario
} | null = null

export const setCurrentUser = (user: {
  id: string
  empresaId: string
  perfil: PerfilUsuario
} | null) => {
  currentUser = user
}

export const getCurrentUser = () => currentUser

// ============================================
// HELPER: FILTRO AUTOMÁTICO POR TENANT
// ============================================

/**
 * Aplica filtro de isolamento multi-tenant automaticamente
 */
const applyTenantFilter = (constraints: QueryConstraint[] = []): QueryConstraint[] => {
  if (!currentUser) {
    throw new Error('Usuário não autenticado')
  }

  // Master vê tudo - sem filtro de empresa
  if (currentUser.perfil === PerfilUsuario.MASTER) {
    return constraints
  }

  // Empresário e Funcionário veem apenas sua empresa
  return [where('empresaId', '==', currentUser.empresaId), ...constraints]
}

/**
 * Aplica filtro adicional para funcionário ver apenas seus registros
 */
const applyUserFilter = (
  constraints: QueryConstraint[],
  userField: string = 'atendenteId'
): QueryConstraint[] => {
  if (!currentUser) {
    throw new Error('Usuário não autenticado')
  }

  // Master e Empresário veem tudo da empresa (já filtrado por tenant)
  if (
    currentUser.perfil === PerfilUsuario.MASTER ||
    currentUser.perfil === PerfilUsuario.EMPRESARIO
  ) {
    return constraints
  }

  // Funcionário vê apenas seus registros
  return [...constraints, where(userField, '==', currentUser.id)]
}

// ============================================
// HELPER: CONVERSÃO DE DATAS
// ============================================

const convertTimestamps = <T extends DocumentData>(data: DocumentData): T => {
  const converted: any = { ...data }

  Object.keys(converted).forEach((key) => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate()
    }
  })

  return converted as T
}

// ============================================
// CRUD GENÉRICO COM ISOLAMENTO
// ============================================

class DatabaseService<T extends DocumentData> {
  private collectionName: string

  constructor(collectionName: string) {
    this.collectionName = collectionName
  }

  /**
   * Referência da coleção
   */
  private getCollectionRef(): CollectionReference {
    return collection(db, this.collectionName)
  }

  /**
   * CREATE - Cria novo documento com empresa_id automático
   */
  async create(data: Omit<T, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<string> {
    if (!currentUser) {
      throw new Error('Usuário não autenticado')
    }

    const now = new Date()
    const docData = {
      ...data,
      empresaId: currentUser.perfil === PerfilUsuario.MASTER ? data.empresaId : currentUser.empresaId,
      criadoEm: now,
      atualizadoEm: now
    }

    const docRef = await addDoc(this.getCollectionRef(), docData)
    
    // Log de auditoria
    await this.logAuditoria('criar', docRef.id, docData)
    
    return docRef.id
  }

  /**
   * READ BY ID - Busca por ID com verificação de tenant
   */
  async getById(id: string): Promise<T | null> {
    const docRef = doc(db, this.collectionName, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    const data = { id: docSnap.id, ...docSnap.data() } as T

    // Verifica se o usuário tem permissão para ver este registro
    if (!this.hasPermissionToView(data)) {
      throw new Error('Acesso negado a este registro')
    }

    return convertTimestamps<T>(data)
  }

  /**
   * READ ALL - Lista todos com filtro de tenant automático
   */
  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    const filteredConstraints = applyTenantFilter(constraints)
    const q = query(this.getCollectionRef(), ...filteredConstraints)
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) =>
      convertTimestamps<T>({ id: doc.id, ...doc.data() } as T)
    )
  }

  /**
   * READ ALL BY USER - Lista apenas registros do usuário logado (para funcionários)
   */
  async getAllByUser(
    userField: string = 'atendenteId',
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    const tenantFiltered = applyTenantFilter(constraints)
    const userFiltered = applyUserFilter(tenantFiltered, userField)
    const q = query(this.getCollectionRef(), ...userFiltered)
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) =>
      convertTimestamps<T>({ id: doc.id, ...doc.data() } as T)
    )
  }

  /**
   * UPDATE - Atualiza documento com verificação de permissão
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, this.collectionName, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Documento não encontrado')
    }

    const currentData = { id: docSnap.id, ...docSnap.data() } as T

    // Verifica permissão
    if (!this.hasPermissionToEdit(currentData)) {
      throw new Error('Sem permissão para editar este registro')
    }

    const updateData = {
      ...data,
      atualizadoEm: new Date()
    }

    await updateDoc(docRef, updateData)
    
    // Log de auditoria
    await this.logAuditoria('editar', id, { antes: currentData, depois: updateData })
  }

  /**
   * DELETE - Exclui documento com verificação de permissão
   */
  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Documento não encontrado')
    }

    const currentData = { id: docSnap.id, ...docSnap.data() } as T

    // Verifica permissão
    if (!this.hasPermissionToDelete(currentData)) {
      throw new Error('Sem permissão para excluir este registro')
    }

    await deleteDoc(docRef)
    
    // Log de auditoria
    await this.logAuditoria('excluir', id, currentData)
  }

  /**
   * Verifica se o usuário tem permissão para VER o registro
   */
  private hasPermissionToView(data: any): boolean {
    if (!currentUser) return false

    // Master vê tudo
    if (currentUser.perfil === PerfilUsuario.MASTER) return true

    // Verifica se é da mesma empresa
    if (data.empresaId !== currentUser.empresaId) return false

    // Empresário vê tudo da empresa
    if (currentUser.perfil === PerfilUsuario.EMPRESARIO) return true

    // Funcionário vê apenas seus registros (ou registros sem dono)
    return (
      !data.atendenteId ||
      data.atendenteId === currentUser.id ||
      data.criadoPor === currentUser.id
    )
  }

  /**
   * Verifica se o usuário tem permissão para EDITAR o registro
   */
  private hasPermissionToEdit(data: any): boolean {
    if (!currentUser) return false

    // Master e Empresário podem editar tudo da empresa
    if (
      currentUser.perfil === PerfilUsuario.MASTER ||
      currentUser.perfil === PerfilUsuario.EMPRESARIO
    ) {
      return true
    }

    // Funcionário pode editar apenas seus registros
    return (
      data.atendenteId === currentUser.id || data.criadoPor === currentUser.id
    )
  }

  /**
   * Verifica se o usuário tem permissão para EXCLUIR o registro
   */
  private hasPermissionToDelete(data: any): boolean {
    // Mesma lógica de edição
    return this.hasPermissionToEdit(data)
  }

  /**
   * Log de auditoria
   */
  private async logAuditoria(
    acao: string,
    entidadeId: string,
    detalhes: any
  ): Promise<void> {
    if (!currentUser) return

    try {
      const logData: Omit<AuditoriaLog, 'id'> = {
        usuarioId: currentUser.id,
        empresaId: currentUser.empresaId,
        acao,
        entidade: this.collectionName,
        entidadeId,
        detalhes,
        timestamp: new Date()
      }

      await addDoc(collection(db, 'auditoria_logs'), logData)
    } catch (error) {
      console.error('Erro ao criar log de auditoria:', error)
      // Não bloqueia a operação principal se falhar
    }
  }
}

// ============================================
// INSTÂNCIAS DOS SERVIÇOS
// ============================================

export const empresaService = new DatabaseService<Empresa>('empresas')
export const usuarioService = new DatabaseService<Usuario>('usuarios')
export const clienteService = new DatabaseService<Cliente>('clientes')
export const conversaService = new DatabaseService<Conversa>('conversas')
export const mensagemService = new DatabaseService<Mensagem>('mensagens')
export const campanhaService = new DatabaseService<Campanha>('campanhas')
export const produtoService = new DatabaseService<Produto>('produtos')
export const smsDisparoService = new DatabaseService<SmsDisparo>('sms_disparos')
export const smsRespostaService = new DatabaseService<SmsResposta>('sms_respostas')
export const financeiroService = new DatabaseService<FinanceiroLancamento>('financeiro_lancamentos')
export const comissaoService = new DatabaseService<Comissao>('comissoes')
export const contratoService = new DatabaseService<Contrato>('contratos')
export const anotacaoService = new DatabaseService<Anotacao>('anotacoes')
export const remarketingService = new DatabaseService<Remarketing>('remarketing')

// ============================================
// SERVIÇOS ESPECIALIZADOS
// ============================================

/**
 * Serviço de Usuários com funções extras
 */
export const UsuarioService = {
  ...usuarioService,

  /**
   * Busca usuário por email
   */
  async getByEmail(email: string): Promise<Usuario | null> {
    const q = query(
      collection(db, 'usuarios'),
      where('email', '==', email),
      limit(1)
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return convertTimestamps<Usuario>({ id: doc.id, ...doc.data() } as Usuario)
  },

  /**
   * Lista atendentes de uma empresa
   */
  async getAtendentes(empresaId?: string): Promise<Usuario[]> {
    const targetEmpresaId = empresaId || currentUser?.empresaId

    if (!targetEmpresaId) {
      throw new Error('ID da empresa não fornecido')
    }

    const q = query(
      collection(db, 'usuarios'),
      where('empresaId', '==', targetEmpresaId),
      where('perfil', '==', PerfilUsuario.FUNCIONARIO),
      where('ativo', '==', true)
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) =>
      convertTimestamps<Usuario>({ id: doc.id, ...doc.data() } as Usuario)
    )
  }
}

/**
 * Serviço de Clientes com funções extras
 */
export const ClienteService = {
  ...clienteService,

  /**
   * Busca clientes por status
   */
  async getByStatus(status: string): Promise<Cliente[]> {
    return await clienteService.getAll([where('status', '==', status)])
  },

  /**
   * Busca clientes sem contato há X dias
   */
  async getSemContato(dias: number): Promise<Cliente[]> {
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - dias)

    return await clienteService.getAll([
      where('dataUltimaInteracao', '<', dataLimite)
    ])
  },

  /**
   * Busca por CPF
   */
  async getByCPF(cpf: string): Promise<Cliente | null> {
    const q = query(
      collection(db, 'clientes'),
      where('cpf', '==', cpf),
      limit(1)
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return convertTimestamps<Cliente>({ id: doc.id, ...doc.data() } as Cliente)
  }
}

export default DatabaseService
