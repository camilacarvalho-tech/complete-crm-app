# 🔐 GUIA DE PERMISSÕES - CREDFLOW PLATFORM 2.0

## 📋 VISÃO GERAL

Sistema de permissões em **3 níveis** para controlar acesso a dados e funcionalidades.

---

## 👥 OS 3 NÍVEIS DE PERMISSÃO

| Nível | Quem é | O que vê | Cor |
|-------|--------|----------|-----|
| 🌟 **Master** | CEO/Dona da plataforma | **TUDO** de todas as empresas | Dourado |
| 🛡️ **Empresário** | Dono da empresa cliente | **TUDO** da própria empresa | Roxo |
| 👤 **Funcionário** | Atendente/colaborador | Apenas **seus registros** (ou fila geral se liberado) | Azul |

---

## 🎯 COMO USAR

### 1️⃣ Hook `useAuth`

Hook principal de autenticação com todas as informações do usuário logado.

```tsx
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const {
    user,          // Dados do Firebase Auth
    usuario,       // Dados do Firestore (nome, perfil, etc.)
    empresa,       // Dados da empresa do usuário
    loading,       // Estado de carregamento
    
    // Funções
    signIn,
    signOut,
    
    // Verificações rápidas
    isMaster,
    isEmpresario,
    isFuncionario,
    
    // Permissões específicas
    canViewFilaGeral,
    canViewFinanceiroEquipe,
    canViewRelatoriosEmpresa,
    
    // Helpers
    canView,
    canEdit,
    canDelete,
    canCreate
  } = useAuth()

  return (
    <div>
      <h1>Bem-vindo, {usuario?.nome}!</h1>
      {isMaster && <p>🌟 Você é Master</p>}
      {isEmpresario && <p>🛡️ Você é Empresário</p>}
      {isFuncionario && <p>👤 Você é Funcionário</p>}
    </div>
  )
}
```

---

### 2️⃣ Hook `usePermissions`

Hook simplificado apenas com verificações de permissão.

```tsx
import { usePermissions } from '@/hooks/usePermissions'

function MyComponent() {
  const {
    isMaster,
    isEmpresario,
    isFuncionario,
    
    canAccessPainelMaster,
    canManageUsers,
    canManageFinanceiro,
    canManageEmpresas,
    canViewAllClientes,
    canViewAllConversas,
    canManageCampanhas,
    canManageModulos
  } = usePermissions()

  return (
    <div>
      {canManageUsers && <button>Gerenciar Usuários</button>}
      {canAccessPainelMaster && <button>Painel Master</button>}
    </div>
  )
}
```

---

### 3️⃣ Componente `ProtectedRoute`

Protege rotas inteiras por perfil ou permissão.

```tsx
import { ProtectedRoute } from '@/contexts/AuthContext'
import { PerfilUsuario } from '@/types/database.types'

// Rota apenas para Master
<Route 
  path="/painel-master" 
  element={
    <ProtectedRoute requiredPerfil={[PerfilUsuario.MASTER]}>
      <PainelMaster />
    </ProtectedRoute>
  } 
/>

// Rota para Master e Empresário
<Route 
  path="/empresas" 
  element={
    <ProtectedRoute 
      requiredPerfil={[PerfilUsuario.MASTER, PerfilUsuario.EMPRESARIO]}
    >
      <Empresas />
    </ProtectedRoute>
  } 
/>

// Rota com permissão específica
<Route 
  path="/financeiro-completo" 
  element={
    <ProtectedRoute requiredPermission="verFinanceiroEquipe">
      <FinanceiroCompleto />
    </ProtectedRoute>
  } 
/>
```

---

### 4️⃣ Componente `PermissionGate`

Oculta conteúdo se o usuário não tiver permissão.

```tsx
import PermissionGate, { AdminOnlyBadge } from '@/components/PermissionGate'

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Apenas para Master */}
      <PermissionGate requireMaster>
        <div className="bg-yellow-500 p-4">
          Painel exclusivo do Master 🌟
        </div>
      </PermissionGate>
      
      {/* Apenas para Empresário ou superior */}
      <PermissionGate requireEmpresario>
        <div className="bg-purple-500 p-4">
          Financeiro completo da empresa 💰
        </div>
      </PermissionGate>
      
      {/* Apenas para quem tem permissão específica */}
      <PermissionGate requirePermission="verFinanceiroEquipe">
        <div className="bg-blue-500 p-4">
          Relatório da equipe 📊
        </div>
      </PermissionGate>
      
      {/* Badge visual */}
      <div className="flex items-center gap-2">
        <h2>Configurações Avançadas</h2>
        <AdminOnlyBadge />
      </div>
    </div>
  )
}
```

---

### 5️⃣ Componente `PermissionButton`

Botão que desabilita automaticamente sem permissão.

```tsx
import PermissionButton from '@/components/PermissionButton'

function ClienteCard({ cliente }) {
  return (
    <div>
      <h3>{cliente.nome}</h3>
      
      {/* Apenas Master pode deletar */}
      <PermissionButton
        requireMaster
        onClick={() => deleteCliente(cliente.id)}
        className="btn-danger"
      >
        Excluir Cliente
      </PermissionButton>
      
      {/* Verifica permissão de editar registro específico */}
      <PermissionButton
        record={cliente}
        action="edit"
        onClick={() => editCliente(cliente)}
        className="btn-primary"
      >
        Editar
      </PermissionButton>
      
      {/* Oculta completamente se não tiver permissão */}
      <PermissionButton
        requireEmpresario
        hideIfNoPermission
        onClick={() => verFinanceiro()}
        className="btn-secondary"
      >
        Ver Financeiro
      </PermissionButton>
    </div>
  )
}
```

---

### 6️⃣ Componente `PermissionBadge`

Badge visual mostrando o nível do usuário.

```tsx
import PermissionBadge from '@/components/PermissionBadge'

function UserMenu() {
  const { usuario } = useAuth()
  
  return (
    <div className="flex items-center gap-3">
      <img src={usuario?.avatar} alt="Avatar" />
      <div>
        <p className="font-semibold">{usuario?.nome}</p>
        <PermissionBadge />
      </div>
    </div>
  )
}
```

---

## 🎯 VERIFICAÇÕES DE PERMISSÃO EM REGISTROS

### Verificar se pode VER um registro

```tsx
const { canView } = useAuth()

function ClienteCard({ cliente }) {
  if (!canView(cliente)) {
    return <div>Você não tem permissão para ver este cliente</div>
  }
  
  return <div>{cliente.nome}</div>
}
```

### Verificar se pode EDITAR um registro

```tsx
const { canEdit } = useAuth()

function ClienteForm({ cliente }) {
  const podeEditar = canEdit(cliente)
  
  return (
    <form>
      <input disabled={!podeEditar} value={cliente.nome} />
      <button disabled={!podeEditar}>Salvar</button>
    </form>
  )
}
```

### Verificar se pode EXCLUIR um registro

```tsx
const { canDelete } = useAuth()

function ClienteActions({ cliente }) {
  return (
    <div>
      {canDelete(cliente) && (
        <button onClick={() => deleteCliente(cliente.id)}>
          Excluir
        </button>
      )}
    </div>
  )
}
```

---

## 📊 FILTROS AUTOMÁTICOS

Todos os serviços de banco de dados **aplicam filtros automaticamente**:

```tsx
import { ClienteService } from '@/services/database.service'

// Ao buscar clientes, o filtro é aplicado automaticamente:
// - Master: vê todos os clientes de todas as empresas
// - Empresário: vê apenas clientes da sua empresa
// - Funcionário: vê apenas clientes onde atendenteId = seu ID

const clientes = await ClienteService.getAll()
// ✅ Já vem filtrado conforme o perfil do usuário logado!
```

---

## 🚨 ERROS COMUNS E SOLUÇÕES

### Erro: "useAuth deve ser usado dentro de um AuthProvider"

**Causa:** Componente está fora do `<AuthProvider>`

**Solução:** Certifique-se de que o `App.tsx` está envolvido com `<AuthProvider>`:

```tsx
<AuthProvider>
  <ThemeProvider>
    <AppRoutes />
  </ThemeProvider>
</AuthProvider>
```

---

### Erro: "Usuário não autenticado" ao fazer queries

**Causa:** `setCurrentUser` não foi chamado após o login

**Solução:** O `AuthContext` já faz isso automaticamente. Certifique-se de usar o `signIn` do `useAuth`:

```tsx
const { signIn } = useAuth()
await signIn(email, senha)
```

---

### Funcionário não consegue ver nenhum cliente

**Causa:** Os clientes não têm `atendenteId` definido

**Solução:** 
1. Ao criar cliente, definir `atendenteId`
2. Ou liberar flag `verFilaGeral: true` no cadastro do funcionário

```tsx
await ClienteService.create({
  nome: 'João',
  telefone: '11999999999',
  atendenteId: usuario.id,  // ← Define o atendente
  // ...
})
```

---

## 🎨 BADGES VISUAIS

### No cabeçalho do sistema

```tsx
function Header() {
  const { usuario, empresa } = useAuth()
  
  return (
    <header>
      <div className="flex items-center gap-4">
        <img src={empresa?.avatarRobo} alt="Logo" />
        <div>
          <h1>{empresa?.nomeFantasia}</h1>
          <PermissionBadge />
        </div>
      </div>
      
      <div>
        <p>{usuario?.nome}</p>
        <p className="text-xs text-slate-400">{usuario?.email}</p>
      </div>
    </header>
  )
}
```

---

## 🔒 PERMISSÕES ESPECÍFICAS DO FUNCIONÁRIO

Além do perfil, o Funcionário pode ter permissões extras:

| Permissão | O que libera |
|-----------|-------------|
| `verFilaGeral` | Ver clientes sem atendente definido |
| `verFinanceiroEquipe` | Ver financeiro de toda a equipe (não só suas comissões) |
| `verRelatoriosEmpresa` | Ver relatórios gerais da empresa (não só seus números) |

### Como verificar:

```tsx
const { canViewFilaGeral, canViewFinanceiroEquipe } = useAuth()

{canViewFilaGeral && <FilaGeralComponent />}
{canViewFinanceiroEquipe && <FinanceiroCompletoDashboard />}
```

---

## 📦 ARQUIVOS CRIADOS

- `src/contexts/AuthContext.tsx` - Context principal
- `src/hooks/usePermissions.ts` - Hook exportador
- `src/components/PermissionBadge.tsx` - Badge visual
- `src/components/PermissionButton.tsx` - Botão com permissão
- `src/components/PermissionGate.tsx` - Gate de conteúdo

---

## 🚀 PRÓXIMOS PASSOS

Com o sistema de permissões implementado, você pode:

1. ✅ Criar telas protegidas por perfil
2. ✅ Ocultar funcionalidades sensíveis para Funcionários
3. ✅ Implementar o Painel Master exclusivo
4. ✅ Criar filtros automáticos em listagens
5. ✅ Implementar auditoria de ações

---

**Desenvolvido para CredFlow Platform 2.0**
Sistema Multi-Tenant com 3 níveis de permissão
