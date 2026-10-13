# Decisões Aprovadas — FCIA Course Engine

**Data de aprovação:** 2026-10-13
**Aprovado por:** Fernando Cabral / FCIA
**Status:** Fase 0 concluída; Fase 1 autorizada

## Decisões Confirmadas

| ID | Decisão | Valor Aprovado |
|---|---|---|
| D1 | Nome do produto | FCIA Course Engine |
| D2 | Repositório oficial | `fciasaas-saude/fciacourse` (dedicado) |
| D3 | Supabase development | `ujjhjgogtkmzkfaujjio` (FCIA COURSE) |
| D4 | Papéis iniciais | super_admin, content_director, editor, researcher, client_admin, client_reviewer, student |
| D11 | Ambientes | dev agora; staging e prod futuros |
| D15 | Stack inicial | Next.js + React + TS + Tailwind + shadcn/ui + Supabase + GitHub Actions |
| D19 | Fila de jobs (Fase 1) | PostgreSQL tabela `ai_jobs`; sem worker externo |

## Decisão sobre Lovable

- Lovable não faz parte da stack crítica
- GitHub é fonte de verdade do código
- Supabase é fonte de verdade dos dados
- Uso futuro opcional apenas para prototipação UI

## Decisões Pendentes (Não Bloqueiam Fase 1)

| ID | Decisão | Quando Decidir |
|---|---|---|
| D5 | Política de direitos de fontes | Antes da Fase 2 |
| D6 | Público-piloto | Antes da Fase 2 |
| D7 | Briefing-piloto | Antes da Fase 2 |
| D8 | Teto de custo IA | Antes da Fase 3 |
| D9 | Modelo de aprovação | Antes da Fase 3 |
| D10 | Integração Drive | Antes da Fase 2 |
| D12 | Revisor pedagógico | Antes da Fase 3 |
| D13 | Revisor jurídico | Antes da Fase 3 |
| D16 | Domínios e deploy | Antes de staging |
| D17 | Embeddings (modelo/dimensão) | Antes da Fase 2 |
| D18 | Estratégia de OCR | Antes da Fase 2 |
| D20 | Observabilidade | Antes da Fase 1 (CI) |

---

*Este documento é atualizado a cada nova decisão aprovada.*