import { describe, expect, inject, it } from 'vitest';
import { admin } from './helpers';

// Structural guarantees that protect every future migration too.
describe.skipIf(!inject('dbAvailable'))('schema guarantees', () => {
  it('enables Row Level Security on every public table', async () => {
    const { rows } = await admin<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' and not rowsecurity",
    );
    expect(rows.map((r) => r.tablename)).toEqual([]);
  });

  it('gives every public table at least one policy', async () => {
    const { rows } = await admin<{ tablename: string }>(`
      select t.tablename from pg_tables t
      where t.schemaname = 'public'
        and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)
    `);
    expect(rows.map((r) => r.tablename)).toEqual([]);
  });

  it('pins search_path on every SECURITY DEFINER function', async () => {
    const { rows } = await admin<{ name: string }>(`
      select n.nspname || '.' || p.proname as name
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where p.prosecdef and n.nspname in ('public', 'private')
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
    `);
    expect(rows.map((r) => r.name)).toEqual([]);
  });

  it('keeps private helpers away from anonymous callers', async () => {
    const { rows } = await admin<{ name: string }>(`
      select p.proname as name
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private' and has_function_privilege('anon', p.oid, 'execute')
    `);
    expect(rows.map((r) => r.name)).toEqual([]);
  });

  it('gives anonymous callers no privileges on user data tables', async () => {
    const { rows } = await admin<{ table_name: string }>(`
      select distinct table_name from information_schema.role_table_grants
      where grantee = 'anon' and table_schema = 'public'
        and table_name not in ('region_rules', 'life_area_defaults', 'goal_templates', 'achievements')
    `);
    expect(rows.map((r) => r.table_name)).toEqual([]);
  });
});
