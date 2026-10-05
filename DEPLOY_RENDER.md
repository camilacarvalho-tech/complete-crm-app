# 🚀 DEPLOY NEXUS CRM CLEAN NO RENDER

## ⚡ DEPLOY RÁPIDO (3 MINUTOS)

### 1️⃣ SUBIR CÓDIGO NO GITHUB

```bash
cd "C:\Users\carva\OneDrive\Desktop\Nexus CRM Clean"

git add .
git commit -m "Deploy CRM online - Render"
git push
```

Se não tem repositório ainda:

```bash
# Criar repositório no GitHub primeiro em: https://github.com/new
# Depois:
git init
git add .
git commit -m "Initial commit - Nexus CRM Clean"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/nexus-crm-clean.git
git push -u origin main
```

### 2️⃣ CRIAR SERVIÇO NO RENDER

1. Acesse: https://dashboard.render.com
2. Clique em **New +** → **Blueprint**
3. Conecte seu repositório GitHub
4. O Render vai ler o `render.yaml` automaticamente
5. Clique em **Apply**

### 3️⃣ AGUARDAR DEPLOY (2-3 minutos)

O Render vai:
- ✅ Instalar dependências (`npm install`)
- ✅ Fazer build (`npm run build`)
- ✅ Iniciar servidor (`npm run preview`)

### 4️⃣ ACESSAR SEU CRM

A URL será algo como:
```
https://nexus-crm-clean.onrender.com
```

**PRONTO! Seu CRM está online 24/7!** 🎉

## 🔧 CONFIGURAÇÕES IMPORTANTES

### Firebase (se usar)

No painel do Render, adicione as variáveis de ambiente do Firebase:

```
VITE_FIREBASE_API_KEY=sua-chave
VITE_FIREBASE_AUTH_DOMAIN=seu-dominio
VITE_FIREBASE_PROJECT_ID=seu-projeto
...
```

Copie do seu `.env` local.

### Integração com NX ERP

O CRM já está configurado para conectar com:
- `https://nx-erp-disparo-nuvem.onrender.com` (webhook/disparo)

Não precisa configurar mais nada! ✅

## 📱 USAR DURANTE TRÁFEGO

1. **Acesse o CRM online**: `https://nexus-crm-clean.onrender.com`
2. **Faça tráfego**: Os leads vão cair automaticamente
3. **Responda pelo CRM**: De qualquer lugar (celular, tablet, outro PC)
4. **Atualize conforme precisa**: 
   ```bash
   git add .
   git commit -m "Ajuste X"
   git push
   ```
   O Render faz redeploy automático!

## 🎯 VANTAGENS

✅ **Acessa de qualquer lugar** (não depende do PC ligado)
✅ **URL bonita** para compartilhar com time
✅ **HTTPS automático** (seguro)
✅ **Logs em tempo real** no painel do Render
✅ **Redeploy automático** a cada push no Git

## ⚠️ IMPORTANTE

O plano **Starter** do Render custa ~$7/mês mas é ESSENCIAL para:
- ✅ Não dormir (free tier dorme após inatividade)
- ✅ Performance melhor
- ✅ Disco persistente (se usar SQLite)

**Vale MUITO a pena para fazer tráfego profissional!**

## 🆘 TROUBLESHOOTING

### Build falhou

Verifique se tem todas as dependências no `package.json`:
```bash
npm install
npm run build
```

Se der erro local, não vai funcionar no Render.

### Página em branco

- Verifique os logs no Render
- Pode ser erro de variável de ambiente (Firebase, etc)

### Demora para carregar

- Normal no primeiro acesso (cold start)
- Depois fica rápido

## 📊 MONITORAR

No painel do Render você vê:
- 📈 Uso de CPU/RAM
- 📝 Logs em tempo real
- 🌐 Requisições HTTP
- ⏱️ Tempo de resposta

**AGORA SIM ESTÁ PRONTO PARA TRÁFEGO PESADO!** 🔥
