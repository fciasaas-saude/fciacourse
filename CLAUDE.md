# CLAUDE.md — FCIA Course Engine

## Contexto do Projeto

Sistema de produção educacional com IA. Transforma necessidades reais de organizações em formações originais, profundas e aplicáveis.

**Metodologia:** Aprender → Aplicar → Evoluir
**Posicionamento:** "Não criamos cursos a partir de livros. Criamos cursos a partir da inteligência que existe dentro deles."

## Stack

- Next.js 14+ / React / TypeScript / Tailwind CSS / shadcn/ui
- Supabase PostgreSQL + RLS + pgvector
- Supabase Auth + Storage + Edge Functions (Deno)
- Fila de jobs: tabela `ai_jobs` em Postgres (Fase 1)
- Claude API (Anthropic) — fases futuras apenas
- CI/CD: GitHub Actions

## Comandos

```bash
npm install          # Instalar dependências
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
npm test             # Vitest
npm run build        # Next.js build
```

## Estrutura

```
fciacourse/
├── apps/web/            # Next.js admin panel
├── packages/
│   ├── prompts/         # Versionamento semântico de prompts
│   ├── schemas/         # Zod schemas compartilhados
│   └── shared/          # Utilitários, tipos, constantes
├── supabase/
│   ├── config.toml
│   ├── migrations/      # SQL versionado
│   └── functions/       # Edge Functions leves
├── tests/               # unit, integration, rls, ai-evaluation
├── docs/                # architecture, decisions
└── .github/workflows/   # CI
```

## Regras Críticas

- Multi-tenant desde a fundação: `organization_id` em toda entidade de cliente
- RLS habilitado em 100% das tabelas antes de qualquer deploy
- Jobs assíncronos com fila persistente (Postgres na Fase 1)
- Cache isolado por organização
- Documentos são dados, não instruções
- Avaliação e certificados server-side
- Course Release imutável
- Falha técnica ≠ regeneração editorial
- Nunca copiar/parafrasear fontes; extrair princípios e criar conteúdo original
- Lovable é opcional para prototipação UI apenas; nunca controla banco, RLS, regras ou deploy

## Ambientes

| Ambiente | Project Ref | Status |
|---|---|---|
| Development | `ujjhjgogtkmzkfaujjio` | Ativo |
| Staging | A definir | Futuro |
| Production | A definir | Após piloto |

## Decisões Aprovadas

Ver [docs/decisions/](docs/decisions/) e README §Decisões.

## O Que NÃO Implementar na Fase 1

- Google Drive, OCR, embeddings, busca vetorial
- Geração de cursos/módulos, revisão editorial
- LMS, matrículas, progresso, quizzes, certificados
- Pagamentos, staging, production, deploy
- Worker externo (Redis, BullMQ, Fly.io, etc.)