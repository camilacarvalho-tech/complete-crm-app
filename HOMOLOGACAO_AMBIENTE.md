# Homologação Nexus CRM × Nexus AI V1.0 — Ambiente operacional

## Status do provisionamento (preparado automaticamente)

| Item | Status |
|------|--------|
| CRM `.env` (`VITE_NEXUS_AI_URL` / `VITE_NEXUS_AI_KEY`) | Pronto |
| Nexus AI API (porta 8090) | Pronta para subir |
| Empresa Firestore `nexus-homologacao-v1` | **Criada** (Nexus Homologacao) |
| Auth `teste@nexuscrm.com` | **Criado** (senha `123456`) |
| Doc Firestore `usuarios/{uid}` do teste | **Pendente — ação local no Console** (rules remotas bloqueiam create via API) |
| Doc Firestore `usuarios` do Master | **Pendente — ação local no Console** |
| `OPENAI_API_KEY` | **Pendente — cole a chave localmente** |

> As rules publicadas no Firebase **não permitem** criar documentos em `usuarios` via cliente (mesmo como Master). A criação desses 2 docs precisa ser feita **uma vez** no Firebase Console (bypass de rules). A empresa já está criada.

---

## 1) Ação única no Firebase Console (obrigatória)

1. Abra: https://console.firebase.google.com/project/recomece-cred-oficial/firestore
2. Collection `usuarios` → **Add document**

### Documento A — Master

- **Document ID:** `5zz9M03nttaPnXHmzrP55XhDHmF2`
- Campos:

| Campo | Tipo | Valor |
|-------|------|-------|
| empresaId | string | *(vazio)* |
| nome | string | Camila Carvalho |
| email | string | carvalhoduraocamila@gmail.com |
| telefone | string | *(vazio)* |
| avatar | string | *(vazio)* |
| perfil | string | master |
| verFilaGeral | boolean | true |
| verFinanceiroEquipe | boolean | true |
| verRelatoriosEmpresa | boolean | true |
| ativo | boolean | true |
| criadoEm | timestamp | now |
| atualizadoEm | timestamp | now |

### Documento B — Usuário de teste (homologação)

- **Document ID:** `kS40UlDpg1hGFQA6WC6TwvcoWTC2`
- Campos:

| Campo | Tipo | Valor |
|-------|------|-------|
| empresaId | string | nexus-homologacao-v1 |
| nome | string | Usuario Teste Nexus |
| email | string | teste@nexuscrm.com |
| telefone | string | 11999999999 |
| avatar | string | *(vazio)* |
| perfil | string | empresario |
| verFilaGeral | boolean | true |
| verFinanceiroEquipe | boolean | true |
| verRelatoriosEmpresa | boolean | true |
| ativo | boolean | true |
| criadoEm | timestamp | now |
| atualizadoEm | timestamp | now |

Empresa já existente: `empresas/nexus-homologacao-v1` (nomeFantasia: **Nexus Homologacao**).

---

## 2) Configurar OpenAI (obrigatório para resposta LLM real)

Execute na raiz do projeto:

```bat
CONFIGURAR_OPENAI.bat
```

Cole a chave `sk-...` quando solicitado. Isso grava `OPENAI_API_KEY` em `nexus_ai\.env`.

Reinicie a Nexus AI depois.

---

## 3) Como iniciar o ambiente

### Opção rápida (dois terminais)

```bat
INICIAR_HOMOLOGACAO.bat
```

### Opção manual

**Terminal 1 — Nexus AI**
```bat
cd nexus_ai
INICIAR_NEXUS_AI.bat
```
- API: http://127.0.0.1:8090  
- Swagger: http://127.0.0.1:8090/docs  
- Health: http://127.0.0.1:8090/health  

**Terminal 2 — Nexus CRM**
```bat
INICIAR_CRM.bat
```
- App: http://localhost:5474/  
- Nexus AI UI: http://localhost:5474/nexus-ai  

> Prefira `localhost` (não `127.0.0.1`) no CRM — o Vite escuta em IPv6 `::1`.

---

## 4) Credenciais de login

### Homologação (recomendado)

| Campo | Valor |
|-------|-------|
| E-mail | `teste@nexuscrm.com` |
| Senha | `123456` |
| Empresa | `nexus-homologacao-v1` (Nexus Homologacao) |

Na tela de login também existe o botão **“Preencher com dados de teste”**.

### Master (admin da plataforma)

| Campo | Valor |
|-------|-------|
| E-mail | `carvalhoduraocamila@gmail.com` |
| Senha | *(a senha Master já usada no ambiente — ver `CRIAR_USUARIO_MASTER.md`)* |

---

## 5) Checklist rápido pós-subida

1. `GET http://127.0.0.1:8090/health` → `"status":"ok"`
2. Login com `teste@nexuscrm.com` / `123456`
3. Menu **Nexus AI** → badge **API online**
4. Abas: Chat · Histórico · Memória · Conhecimento · Configurações
5. Chat → **Nova** → enviar mensagem → resposta da IA (exige `OPENAI_API_KEY`)

---

## 6) Variáveis locais já esperadas

**CRM (`.env` na raiz)**
```
VITE_NEXUS_AI_URL=http://127.0.0.1:8090
VITE_NEXUS_AI_KEY=dev-nexus-ai-key
```

**Nexus AI (`nexus_ai/.env`)**
```
NEXUS_AI_API_KEY=dev-nexus-ai-key
NEXUS_AI_DATABASE_URL=sqlite:///./data/nexus_ai.db
NEXUS_AI_LLM_PROVIDER=openai
OPENAI_API_KEY=<sua chave>
OPENAI_MODEL=gpt-4o-mini
NEXUS_AI_CORS_ORIGINS=http://localhost:5474,http://127.0.0.1:5474
```

---

## 7) O que falta só no seu PC

1. Criar os **2 documentos** em `usuarios` no Firebase Console (seção 1).  
2. Rodar `CONFIGURAR_OPENAI.bat` com sua chave.  
3. Subir com `INICIAR_HOMOLOGACAO.bat`.

Nenhuma funcionalidade nova foi implementada — apenas scripts de ambiente e provisionamento da empresa/Auth.
