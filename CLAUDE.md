# FCIA Course Engine - System Context & Guidelines

## Estrutura do Workspace
- Monorepo: Raiz com Next.js app localizado estritamente em `apps/web/`
- Frontend: Next.js (App Router), Tailwind CSS, TypeScript, Lucide Icons
- Backend / DB: Supabase (PostgreSQL, Edge Functions, RLS ativo)
- Alias Path: `@/*` mapeado para `./src/*` conforme `apps/web/tsconfig.json`

## Comandos Padrão
- Dev server: `cd apps/web && npm run dev`
- Build de validação: `cd apps/web && npm run build`
- NÃO execute build ou dev na raiz principal do repositório.

## Constantes e IDs do Projeto
- Organization ID: `5b4f2734-b601-4977-86b4-adaccf566842`
- Pasta Google Drive Ingestão: `1Opd0Ly_GcXTUklAH-jHoOyLGCoXI5lP4`
- Tabela Principal de Fontes: `knowledge_sources`
- Edge Function de Sincronização: `sync-google-drive`

## Diretrizes de Execução (Zero-Waste)
1. Modifique apenas os arquivos estritamente solicitados na tarefa.
2. Não inspecione pastas desnecessárias como `node_modules`, `.next`, ou arquivos de log.
3. Não recrie migrations que já foram aplicadas no banco.
4. Ao concluir, execute apenas o build check e encerre a resposta de forma direta e concisa.
