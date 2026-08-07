# Recomece Cred — CRM Oficial

CRM da **Recomece Cred** (Firebase project `recomece-cred-oficial`).

**Site de produção:** https://recomece-cred-oficial.web.app

> Este repositório NÃO é NX CRM / Nexus Platform.

## Desenvolvimento

```bash
npm i
npm run dev
```

## Deploy (Firebase Hosting)

```bash
# Requer Firebase CLI autenticado (firebase login) ou FIREBASE_TOKEN
./scripts/deploy-recomece-hosting.sh
```

Ou via GitHub Actions: secret `FIREBASE_TOKEN` (gere com `firebase login:ci`) + workflow `Deploy Recomece Cred Hosting`.
