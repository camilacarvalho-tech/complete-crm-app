/**
 * Cria/atualiza perfil Master no Firestore (Camila).
 * UID Auth atual: 5zz9M03nttaPnXHmzrP55XhDHmF2
 */
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { PerfilUsuario } from '../types/database.types'

export const createMasterUser = async () => {
  const userId = '5zz9M03nttaPnXHmzrP55XhDHmF2'
  const email = 'carvalhoduraocamila@gmail.com'
  const empresaId = 'nexus-homologacao-v1'

  const userRef = doc(db, 'usuarios', userId)
  const userSnap = await getDoc(userRef)

  const userData = {
    empresaId,
    nome: 'Camila Carvalho',
    email,
    telefone: '',
    avatar: '',
    perfil: PerfilUsuario.MASTER,
    verFilaGeral: true,
    verFinanceiroEquipe: true,
    verRelatoriosEmpresa: true,
    ativo: true,
    criadoEm: userSnap.exists() ? userSnap.data()?.criadoEm || new Date() : new Date(),
    atualizadoEm: new Date(),
  }

  await setDoc(userRef, userData, { merge: true })
  console.log('Master atualizado:', userData)
  return userData
}
