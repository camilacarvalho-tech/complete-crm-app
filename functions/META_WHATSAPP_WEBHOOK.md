# Meta WhatsApp — publicação da Function

Não há token, App Secret nem Verify Token neste arquivo. Preencha os valores só em `functions/.env` (já está no `.gitignore`).

## Variáveis da Function

Arquivo: `functions/.env` (copie de `functions/.env.example`).

| Variável | Uso |
|---|---|
| `META_APP_ID` | App ID da Meta |
| `META_APP_SECRET` | Assinatura `X-Hub-Signature-256` |
| `META_WABA_ID` | WhatsApp Business Account ID |
| `META_PHONE_NUMBER_ID` | Phone Number ID |
| `META_WHATSAPP_ACCESS_TOKEN` | Token da Cloud API (não é enviado pelo CRM) |
| `META_WHATSAPP_VERIFY_TOKEN` | Valor que a Meta devolve em `hub.verify_token` |

O código lê essas variáveis apenas em `functions/metaWhatsappCloud.js` e `functions/index.js`, via `process.env`. O frontend não recebe o conteúdo.

## Frontend

No `.env` da raiz do CRM (Vite), sem segredo:

```
VITE_META_WHATSAPP_WEBHOOK_URL=https://southamerica-east1-recomece-cred-oficial.cloudfunctions.net/metaWhatsAppWebhook
```

O cartão WhatsApp chama essa URL com `action=config` e só muda de estado se a Function responder que as seis variáveis existem. A resposta lista nomes faltantes, nunca os valores.

## URL do webhook na Meta

```
https://southamerica-east1-recomece-cred-oficial.cloudfunctions.net/metaWhatsAppWebhook?empresaId=ID_DA_EMPRESA
```

`empresaId` é o id do tenant no Firestore (`empresas/{empresaId}`). Sem ele o POST responde 400.

## GET — verificação

A Meta envia:

`hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`

Se `hub.verify_token` for igual a `META_WHATSAPP_VERIFY_TOKEN`, a Function responde `200` com o `hub.challenge` em texto puro. Caso contrário, `403`.

`GET ?action=config` não valida o webhook. Só informa `{ configured, missing }`.

## POST — eventos

Header obrigatório: `X-Hub-Signature-256: sha256=<hmac do corpo com META_APP_SECRET>`.

Sem assinatura válida a resposta é `401`. Nenhuma mensagem é gravada.

Com assinatura válida, mensagem recebida entra em `empresas/{empresaId}/erpInbound` (o Chat Clientes já consome essa fila). O `wamid` repetido é ignorado. Status `sent`, `delivered`, `read` e `failed` atualizam `erpStatus` da mensagem existente. A Function não chama a API da Meta e não envia WhatsApp.
