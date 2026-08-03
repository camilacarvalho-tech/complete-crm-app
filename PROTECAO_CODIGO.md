# 🔒 Guia de Proteção de Código - Nexus CRM

## 📋 Índice
1. [Métodos de Proteção](#métodos-de-proteção)
2. [Ofuscação de Código](#ofuscação-de-código)
3. [Licenciamento](#licenciamento)
4. [Deploy Seguro](#deploy-seguro)
5. [Checklist de Segurança](#checklist-de-segurança)

---

## 🛡️ Métodos de Proteção

### 1. Ofuscação de Código JavaScript/TypeScript

#### Opção 1: JavaScript Obfuscator (Recomendado)
```bash
npm install --save-dev javascript-obfuscator
```

**Configuração no `package.json`:**
```json
{
  "scripts": {
    "build": "vite build",
    "build:protected": "vite build && node obfuscate.js"
  }
}
```

**Criar arquivo `obfuscate.js`:**
```javascript
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist', 'assets');

fs.readdirSync(distPath).forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(distPath, file);
    const code = fs.readFileSync(filePath, 'utf8');
    
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.4,
      debugProtection: true,
      debugProtectionInterval: 2000,
      disableConsoleOutput: true,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      renameGlobals: false,
      rotateStringArray: true,
      selfDefending: true,
      stringArray: true,
      stringArrayThreshold: 0.75,
      stringArrayEncoding: ['base64'],
      stringArrayWrappersCount: 2,
      stringArrayWrappersType: 'function',
      transformObjectKeys: true,
      unicodeEscapeSequence: false
    }).getObfuscatedCode();

    fs.writeFileSync(filePath, obfuscatedCode);
    console.log(`✅ Ofuscado: ${file}`);
  }
});

console.log('🔒 Código protegido com sucesso!');
```

#### Opção 2: Webpack Obfuscator
```bash
npm install --save-dev webpack-obfuscator
```

#### Opção 3: Terser (Minificação Avançada)
Já vem com Vite, mas pode configurar mais agressivamente:

```javascript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info']
      },
      mangle: {
        toplevel: true
      },
      format: {
        comments: false
      }
    }
  }
})
```

---

## 🔐 Sistema de Licenciamento

### Opção 1: Licença por Domínio (Recomendado para SaaS)

**Criar `src/utils/license.ts`:**
```typescript
export class LicenseManager {
  private static ALLOWED_DOMAINS = [
    'seudominio.com',
    'app.seudominio.com',
    'localhost' // apenas para desenvolvimento
  ]

  private static LICENSE_KEY = 'SUA_CHAVE_SECRETA_AQUI'

  static validateLicense(): boolean {
    const currentDomain = window.location.hostname

    // Verificar domínio
    if (!this.ALLOWED_DOMAINS.includes(currentDomain)) {
      this.showLicenseError()
      return false
    }

    // Verificar chave no localStorage (licença ativada)
    const storedKey = localStorage.getItem('nexus_license_key')
    if (storedKey !== this.LICENSE_KEY) {
      this.showLicenseError()
      return false
    }

    // Verificar data de expiração
    const expirationDate = localStorage.getItem('nexus_license_expiration')
    if (expirationDate) {
      const expDate = new Date(expirationDate)
      if (new Date() > expDate) {
        this.showLicenseExpiredError()
        return false
      }
    }

    return true
  }

  private static showLicenseError() {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:Arial;">
        <div style="text-align:center;">
          <h1>🔒 Licença Inválida</h1>
          <p>Este software não possui licença válida para este domínio.</p>
          <p>Entre em contato: contato@seudominio.com</p>
        </div>
      </div>
    `
  }

  private static showLicenseExpiredError() {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:Arial;">
        <div style="text-align:center;">
          <h1>⏰ Licença Expirada</h1>
          <p>Sua licença expirou. Renove para continuar usando.</p>
          <p>Entre em contato: contato@seudominio.com</p>
        </div>
      </div>
    `
  }
}

// Adicionar no início do App.tsx
if (!LicenseManager.validateLicense()) {
  throw new Error('Licença inválida')
}
```

### Opção 2: Licença por Ativação Online

```typescript
export class OnlineLicenseManager {
  private static API_URL = 'https://api.seudominio.com/validate-license'

  static async validateLicense(licenseKey: string): Promise<boolean> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: licenseKey,
          domain: window.location.hostname,
          appVersion: '1.0.0'
        })
      })

      const data = await response.json()
      
      if (data.valid) {
        localStorage.setItem('nexus_license_validated', Date.now().toString())
        return true
      }

      return false
    } catch (error) {
      console.error('Erro ao validar licença:', error)
      return false
    }
  }

  // Validar a cada 24 horas
  static needsRevalidation(): boolean {
    const lastValidation = localStorage.getItem('nexus_license_validated')
    if (!lastValidation) return true

    const dayInMs = 24 * 60 * 60 * 1000
    return (Date.now() - parseInt(lastValidation)) > dayInMs
  }
}
```

---

## 🌐 Deploy Seguro

### 1. Variáveis de Ambiente

**Criar `.env.production`:**
```env
VITE_API_URL=https://api.producao.com
VITE_LICENSE_SERVER=https://license.seudominio.com
VITE_APP_VERSION=1.0.0
```

**Nunca commitar:**
- `.env.local`
- Chaves de API
- Credenciais Firebase
- Tokens de acesso

### 2. Firebase Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir apenas usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Exemplo: Clientes só podem ver seus próprios dados
    match /clientes/{clienteId} {
      allow read: if request.auth.uid == clienteId 
                  || get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role == 'admin';
      allow write: if get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 3. Configurar CORS e CSP

**Adicionar ao `index.html`:**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               font-src 'self' data:;">
```

---

## ✅ Checklist de Segurança

### Antes do Deploy:

- [ ] **Remover console.logs** de produção
- [ ] **Ofuscar código JavaScript**
- [ ] **Configurar variáveis de ambiente**
- [ ] **Implementar sistema de licença**
- [ ] **Configurar Firebase Rules**
- [ ] **Ativar HTTPS obrigatório**
- [ ] **Remover arquivos de desenvolvimento** (.env.local, .bak, etc)
- [ ] **Testar em ambiente de staging**
- [ ] **Configurar rate limiting** na API
- [ ] **Implementar WAF** (Web Application Firewall)
- [ ] **Backup automático** do banco de dados
- [ ] **Monitoramento de erros** (Sentry, LogRocket)

### Proteção de API Keys:

```typescript
// ❌ NUNCA fazer isso:
const apiKey = 'AIzaSyD...'

// ✅ Fazer assim:
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
```

### Proteção contra DevTools:

```typescript
// Detectar abertura do DevTools
(function() {
  const threshold = 160
  const devtools = /./
  devtools.toString = function() {
    this.opened = true
  }
  
  setInterval(() => {
    console.log(devtools)
    if (devtools.opened || 
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold) {
      alert('🔒 DevTools detectado! Acesso bloqueado.')
      window.location.href = 'about:blank'
    }
    devtools.opened = false
  }, 1000)
})()
```

---

## 🚀 Comandos para Build Protegido

```bash
# 1. Build normal
npm run build

# 2. Build com ofuscação
npm run build:protected

# 3. Testar build localmente
npm run preview

# 4. Deploy (exemplo Vercel)
vercel --prod

# 5. Deploy (exemplo Netlify)
netlify deploy --prod
```

---

## 📞 Suporte

Para dúvidas sobre proteção de código:
- **Email:** suporte@nexuscrm.com
- **Documentação:** https://docs.nexuscrm.com/security

---

**Última atualização:** 14/07/2026  
**Versão do Guia:** 1.0  
**Classificação:** Confidencial
