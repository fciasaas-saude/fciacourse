# Runbook: Bootstrap do Primeiro Super Admin (Fase 1)

**Status:** Procedimento manual controlado
**Ambiente:** Development apenas (`ujjhjgogtkmzkfaujjio`)
**Pré-requisitos:** Migrations 0000–0004 aplicadas com sucesso no projeto Supabase FCIA COURSE

## Objetivo

Criar o primeiro usuário administrador e a primeira organização de forma segura, sem abrir policies públicas, sem permitir auto-membership e sem automatizar o processo em migrations ou seeds.

## ⚠️ Regras Críticas

- **NUNCA** execute este procedimento em produção ou staging sem aprovação explícita.
- **NENHUM** script automático deve executar estes comandos.
- **NENHUMA** policy aberta ou permissiva deve ser criada temporariamente.
- O procedimento é **manual e auditável**.
- **O SQL Editor administrativo usa privilégios elevados e não serve para validar RLS de usuários finais.** Validações de acesso real devem ser feitas via aplicação autenticada ou endpoint PostgREST com JWT válido.

---

## Passo 1: Criar Usuário Administrador via Supabase Auth

1. Acesse o Dashboard Supabase do projeto `ujjhjgogtkmzkfaujjio`.
2. Navegue até **Authentication → Users → Add User**.
3. Preencha email e senha do primeiro administrador.
4. Confirme que o usuário foi criado e copie o **UUID** gerado.

> Substitua `<ADMIN_UUID>` pelo UUID real obtido no dashboard em todos os comandos abaixo.

## Passo 2: Criar Primeira Organização

Execute no **SQL Editor** do Dashboard Supabase (ou via `psql` conectado ao projeto dev):

```sql
INSERT INTO public.organizations (name, slug)
VALUES ('FCIA', 'fcia')
ON CONFLICT (slug) DO NOTHING;
```

Confirme a criação e copie o `id` retornado:

```sql
SELECT id, name, slug FROM public.organizations WHERE slug = 'fcia';
```

> Substitua `<ORG_UUID>` pelo ID real da organização em todos os comandos abaixo.

## Passo 3: Inserir Membership de Super Admin

Execute no SQL Editor:

```sql
INSERT INTO public.organization_members (user_id, organization_id, role, joined_at)
VALUES ('<ADMIN_UUID>', '<ORG_UUID>', 'super_admin', now())
ON CONFLICT (user_id, organization_id) DO NOTHING;
```

Confirme:

```sql
SELECT om.role, p.display_name, o.name
FROM public.organization_members om
JOIN public.profiles p ON p.id = om.user_id
JOIN public.organizations o ON o.id = om.organization_id
WHERE om.user_id = '<ADMIN_UUID>';
-- Esperado: role = 'super_admin'
```

## Passo 4: Registrar Ação em Audit Logs

```sql
INSERT INTO public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
VALUES (
    '<ORG_UUID>',
    '<ADMIN_UUID>',
    'bootstrap_first_super_admin',
    'organization_members',
    '<ADMIN_UUID>',
    '{"reason": "Initial system bootstrap", "performed_by": "manual_runbook"}'::jsonb
);
```

## Passo 5: Validação Final

Execute todas as consultas abaixo e confirme os resultados esperados:

| # | Consulta | Resultado Esperado |
|---|---|---|
| 1 | `SELECT count(*) FROM public.organizations;` | ≥ 1 |
| 2 | `SELECT role FROM public.organization_members WHERE user_id = '<ADMIN_UUID>' AND organization_id = '<ORG_UUID>';` | `super_admin` |
| 3 | `SELECT is_super_admin('<ADMIN_UUID>');` | `true` |
| 4 | `SELECT count(*) FROM public.audit_logs WHERE action = 'bootstrap_first_super_admin';` | ≥ 1 |
| 5 | Tentar INSERT em organization_members com um usuário diferente e sem ser super_admin (via aplicação ou PostgREST) | ERRO de RLS |

## Rollback Manual

Audit logs são **append-only**. Em caso de rollback ou correção, **não delete registros de auditoria**. Registre uma nova entrada indicando a reversão.

### 1. Registrar reversão em audit_logs

```sql
INSERT INTO public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
VALUES (
    '<ORG_UUID>',
    '<ADMIN_UUID>',
    'bootstrap_rollback',
    'organization_members',
    '<ADMIN_UUID>',
    '{"reason": "Bootstrap reverted due to <MOTIVO>", "performed_by": "manual_runbook"}'::jsonb
);
```

### 2. Remover membership

```sql
DELETE FROM public.organization_members
WHERE user_id = '<ADMIN_UUID>' AND organization_id = '<ORG_UUID>';
```

### 3. Remover organização (apenas se não houver outros membros)

```sql
DELETE FROM public.organizations WHERE id = '<ORG_UUID>'
AND NOT EXISTS (
    SELECT 1 FROM public.organization_members WHERE organization_id = '<ORG_UUID>'
);
```

> **Nota:** Os registros de `bootstrap_first_super_admin` e `bootstrap_rollback` permanecem em `audit_logs` como trilha de auditoria permanente.

## Checklist de Confirmação

- [ ] Usuário criado via Supabase Auth (não via SQL direto em auth.users)
- [ ] Organização criada com slug único
- [ ] Membership inserida com role `super_admin`
- [ ] `is_super_admin()` retorna `true` para o usuário
- [ ] Audit log de bootstrap registrado
- [ ] Nenhum outro usuário tem acesso à organização
- [ ] Nenhuma policy aberta foi criada
- [ ] Auto-membership continua bloqueada (teste negativo passou via aplicação/PostgREST)
- [ ] Valores reais foram usados apenas no SQL Editor, nunca versionados
- [ ] SQL Editor administrativo não foi usado para validar RLS de usuário final

---

*Este runbook é executado uma única vez por ambiente. Após o bootstrap, a gestão de membros segue exclusivamente via aplicação ou procedimentos administrativos aprovados.*