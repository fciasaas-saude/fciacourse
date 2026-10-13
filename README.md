# FCIA Course Engine

Sistema de produção educacional com IA. Transforma necessidades reais de organizações em formações originais, profundas e aplicáveis.

> "Não criamos cursos a partir de livros. Criamos cursos a partir da inteligência que existe dentro deles."

## Metodologia

**Aprender → Aplicar → Evoluir**

Todo módulo contém atividade, material aplicável ou entregável. O objetivo é gerar capacidade real, não apenas entregar conteúdo.

## Stack

- **Frontend:** Next.js 14+ / React / TypeScript / Tailwind CSS / shadcn/ui
- **Backend:** Supabase Edge Functions (Deno, TS)
- **Banco:** Supabase PostgreSQL + RLS + pgvector
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Fila de Jobs:** PostgreSQL (tabela `ai_jobs`)
- **IA:** Claude API (Anthropic) — integrada nas fases de IA
- **CI/CD:** GitHub Actions

## Ambientes

| Ambiente | Project Ref | Status |
|---|---|---|
| Development | `ujjhjgogtkmzkfaujjio` | Ativo |
| Staging | A definir | Futuro |
| Production | A definir | Após piloto aprovado |

## Decisões Aprovadas

| ID | Decisão | Valor |
|---|---|---|
| D1 | Nome oficial | FCIA Course Engine |
| D2 | Repositório | `fciasaas-saude/fciacourse` (dedicado) |
| D3 | Supabase dev | `ujjhjgogtkmzkfaujjio` (FCIA COURSE) |
| D4 | Papéis iniciais | super_admin, content_director, editor, researcher, client_admin, client_reviewer, student |
| D11 | Ambientes | dev agora; staging e prod futuros |
| D15 | Stack | Next.js + Supabase + Claude API (fases futuras) |
| D19 | Fila de jobs | PostgreSQL na Fase 1; worker externo reavaliado na Fase 2 |

## Governança

- **Código:** GitHub é a fonte de verdade
- **Dados:** Supabase é a fonte de verdade
- **Fontes documentais:** Google Drive (Fase 2+)
- **Lovable:** Opcional para prototipação UI apenas; não controla banco, RLS, regras, prompts, jobs ou deploy

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar testes
npm test

# Lint
npm run lint

# Type-check
npm run type-check

# Build
npm run build
```

## Documentação

- [Plano de Desenvolvimento v2](docs/plan-v2.md)
- [Arquitetura](docs/architecture/)
- [Decisões](docs/decisions/)

## Licença

Proprietário — FCIA