# 🔐 CRIAR USUÁRIO MASTER - CAMILA

## 📋 PASSO A PASSO

### 1️⃣ **Primeiro: Pegar seu UID do Firebase**

1. Tente fazer login com seu email: `carvalhoduraocamila@gmail.com`
2. Vai dar erro dizendo "Dados do usuário não encontrados"
3. Abra o **Console do Navegador** (F12 → aba Console)
4. Procure por uma mensagem que mostra seu **UID** (código único)

OU

1. Acesse: https://console.firebase.google.com/
2. Entre no projeto: **recomece-cred-oficial**
3. Vá em **Authentication** → **Users**
4. Copie o **User UID** da sua conta

---

### 2️⃣ **Depois: Criar o registro no Firestore**

Opção A: **Pelo Console do Firebase** (MAIS FÁCIL)

1. Acesse: https://console.firebase.google.com/
2. Entre no projeto: **recomece-cred-oficial**
3. Vá em **Firestore Database**
4. Clique em **+ Start collection**
5. Collection ID: `usuarios`
6. Document ID: **[Cole seu UID aqui]**
7. Adicione os campos:

```
empresaId: "" (string vazia)
nome: "Camila Carvalho"
email: "carvalhoduraocamila@gmail.com"
telefone: ""
avatar: ""
perfil: "master"
verFilaGeral: true
verFinanceiroEquipe: true
verRelatoriosEmpresa: true
ativo: true
criadoEm: [Timestamp - clique em "now"]
atualizadoEm: [Timestamp - clique em "now"]
```

8. Clique em **Save**

---

Opção B: **Pelo Console do Navegador**

Abra o console (F12) no site e cole este código:

```javascript
// SUBSTITUA 'SEU_UID_AQUI' pelo seu UID real do Firebase
const userId = 'SEU_UID_AQUI'

const { getFirestore, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')

const db = getFirestore()

await setDoc(doc(db, 'usuarios', userId), {
  empresaId: '',
  nome: 'Camila Carvalho',
  email: 'carvalhoduraocamila@gmail.com',
  telefone: '',
  avatar: '',
  perfil: 'master',
  verFilaGeral: true,
  verFinanceiroEquipe: true,
  verRelatoriosEmpresa: true,
  ativo: true,
  criadoEm: new Date(),
  atualizadoEm: new Date()
})

console.log('✅ Usuário Master criado!')
```

---

### 3️⃣ **Finalmente: Fazer Login**

1. Volte para: http://localhost:5173/
2. Digite:
   - **Email:** `carvalhoduraocamila@gmail.com`
   - **Senha:** `Bella01*`
3. Clique em **Entrar**

✅ **Pronto! Você terá acesso Master a todo o sistema!**

---

## 🆘 SE DER ERRO

**Erro: "Usuário não encontrado no banco de dados"**
→ Significa que você precisa criar o registro no Firestore (Passo 2)

**Erro: "Email ou senha incorretos"**
→ Verifique se a senha está correta no Firebase Authentication

**Erro: "Acesso negado"**
→ Verifique se o campo `perfil` está como `"master"` (string, minúsculo)

---

## 🎯 DEPOIS DE ENTRAR

Como Master, você poderá:
- ✅ Ver TODAS as empresas cadastradas
- ✅ Acessar o Painel Master
- ✅ Criar novas empresas
- ✅ Gerenciar usuários de qualquer empresa
- ✅ Ver todos os dados financeiros
- ✅ Acessar logs de auditoria

---

**Precisa de ajuda?** Me chame! 🚀
