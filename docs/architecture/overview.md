# FCIA Course Engine — Architecture Overview

## Macrofluxo

```
[Cliente / Admin FCIA]
        ↓
[Painel FCIA Course Engine]
   Briefing · Projeto · Biblioteca · Produção · Revisão · Publicação
        ↓
[Supabase]
   Auth · Papéis · Banco · RLS · Storage · Edge Functions · Logs · Fila de jobs
        ↓                          ↓
[Google Drive]                [Claude API]
 Biblioteca de fontes         Motor de IA
                              (11 agentes)
        ↓                          ↓
   [Fila de jobs persistente — Postgres na Fase 1]
        ↓
[Curso em rascunho] → [Revisão editorial FCIA] → [Course Release] → [LMS FCIA Academy]
```

## Separação de Responsabilidades

| Domínio | Fonte de Verdade |
|---|---|
| Código, prompts, schemas, migrations, docs | GitHub (`fciasaas-saude/fciacourse`) |
| Dados operacionais, auth, RLS, storage, logs, fila | Supabase (`ujjhjgogtkmzkfaujjio`) |
| Livros, PDFs, materiais de cliente | Google Drive (Fase 2+) |
| Inteligência (diagnóstico, curadoria, produção) | Claude API (Fase 3+) |

## Multi-tenant desde a Fundação

- `organization_id` em toda entidade de cliente
- RLS habilitado em 100% das tabelas antes de qualquer deploy
- Cache isolado por organização
- Busca vetorial filtra permissão no SQL (Fase 2+)

## Fila de Jobs (Fase 1)

Tabela `ai_jobs` em PostgreSQL com estados:
- queued → running → retrying → completed / failed / cancelled
- Idempotency key via unique constraint
- Checkpoints em JSONB
- Retries configuráveis por tipo de job
- Sem worker externo nesta fase; reavaliar na Fase 2

## Storage (Fora da Fase 1)

Buckets de storage (`course-sources`, `course-materials`, `exports`, `certificates`) **não são criados na Fase 1**.
- `sources`: Fase 2 (biblioteca e curadoria)
- `materials`: Fase 4 (curso-piloto)
- `exports`: Fase 4 (integração e entrega)
- `certificates`: Fase 5 (distribuição educacional)

## Stack Aprovada (D15)

- Next.js 14+ / React / TypeScript / Tailwind CSS / shadcn/ui
- Supabase PostgreSQL + Auth + Edge Functions
- GitHub Actions (CI)
- Claude API apenas nas fases de IA
- Google Drive apenas na Fase 2