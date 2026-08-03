# Conta Master (uso principal)

## Login

| Campo | Valor |
|-------|-------|
| E-mail | `carvalhoduraocamila@gmail.com` |
| Senha | a senha Master do Firebase Auth (ver `CRIAR_USUARIO_MASTER.md`) |
| Perfil | `master` (administrador) |
| empresaId | `nexus-homologacao-v1` (Nexus Homologacao) |

No login, o CRM faz **bootstrap** do perfil Master e grava `empresaId` no `localStorage` para a Nexus AI.

## Persistência no Firestore

As rules **publicadas** ainda bloqueiam `create` em `usuarios` via API. Para gravar o doc no Firebase de forma permanente:

```bat
PUBLICAR_RULES_FIRESTORE.bat
```

Depois, faça logout/login uma vez.

## Início rápido

1. `INICIAR_HOMOLOGACAO.bat` (ou CRM + AI já rodando)
2. http://localhost:5474/ → login Master
3. Menu **Nexus AI** → badge API online → Chat

OpenAI: `CONFIGURAR_OPENAI.bat` se ainda não configurou a chave.
