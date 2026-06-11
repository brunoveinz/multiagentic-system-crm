# Ventas — CRM de ventas multiagente (human-in-the-loop)

CRM genérico para vender en cualquier proyecto. Cada usuario crea su empresa, define su
objetivo y su métrica más valiosa, conecta su correo y trabaja un pipeline tipo Kanban.
La capa diferenciadora es un sistema **multiagente (LangChain)** con **RAG sobre Qdrant**:

1. **Redactor** — escribe mails de venta con RAG sobre la base de conocimiento de la empresa.
   Siempre con aprobación humana antes de enviar.
2. **Seguimiento** — vigila leads estancados y te manda recordatorios.
3. **Coach** — cada día te pregunta qué hiciste para vender más; tus respuestas se guardan en
   Qdrant y le dan memoria.

> Construido por fases. Estado actual: **Fase 0 — scaffold + infra**.

## Stack

- **Frontend:** Next.js (React, TypeScript strict)
- **Backend:** Django + DRF
- **Async:** Celery + Redis
- **Datos:** PostgreSQL (relacional) + Qdrant (vectorial / RAG)
- **IA:** OpenAI (chat + embeddings), LangChain
- **Correo:** Gmail API, scope `gmail.send` (solo envío)
- **Infra:** Docker Compose (6 servicios)

## Arrancar en local

```bash
cp .env.example .env          # completar secretos (al menos DJANGO_SECRET_KEY)
docker compose up --build
```

Servicios:

| Servicio | URL                          |
|----------|------------------------------|
| web      | http://localhost:3000        |
| api      | http://localhost:8000        |
| health   | http://localhost:8000/api/health/ |
| qdrant   | http://localhost:6333/dashboard   |

## Layout

```
ventas/
├── docker-compose.yml
├── .env.example
├── backend/        Django + DRF + Celery + agentes (LangChain)
│   ├── config/     settings por entorno, urls, celery
│   └── apps/       orgs, accounts, pipeline, emails, agents, metrics
└── frontend/       Next.js (TS strict)
```
