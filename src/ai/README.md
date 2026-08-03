# Nexus AI — cliente CRM

O CRM **apenas consome** a API pública do serviço `nexus_ai/` (FastAPI + PostgreSQL).

```
CRM (React)  --HTTP-->  nexus_ai/src/ai  --SQL-->  PostgreSQL (+ pgvector)
                              |
                              +-- sync/  (Firestore CRM, opcional, NUNCA store da IA)
```

Não grave conversas/memória/logs da IA no Firestore.
