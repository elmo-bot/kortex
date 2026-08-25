begin;

select plan(31);

select is(
  (
    select array_agg(c.relname::text order by c.relname)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  ),
  array[
    'ai_interpretations', 'captures', 'companies', 'contacts', 'documents',
    'entities', 'entity_tags', 'follow_ups', 'ideas', 'meetings', 'profiles',
    'projects', 'relationships', 'tags', 'timeline_events'
  ]::text[],
  'the public schema contains exactly the expected Kortex tables'
);

with expected(table_name) as (
  values
    ('ai_interpretations'), ('captures'), ('companies'), ('contacts'), ('documents'),
    ('entities'), ('entity_tags'), ('follow_ups'), ('ideas'), ('meetings'), ('profiles'),
    ('projects'), ('relationships'), ('tags'), ('timeline_events')
)
select ok(
  c.relrowsecurity,
  format('RLS is enabled on public.%I', expected.table_name)
)
from expected
join pg_catalog.pg_class c on c.relname = expected.table_name
join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
order by expected.table_name;

with expected(table_name, owner_column) as (
  values
    ('ai_interpretations', 'owner_id'), ('captures', 'owner_id'),
    ('companies', 'owner_id'), ('contacts', 'owner_id'), ('documents', 'owner_id'),
    ('entities', 'owner_id'), ('entity_tags', 'owner_id'), ('follow_ups', 'owner_id'),
    ('ideas', 'owner_id'), ('meetings', 'owner_id'), ('profiles', 'id'),
    ('projects', 'owner_id'), ('relationships', 'owner_id'), ('tags', 'owner_id'),
    ('timeline_events', 'owner_id')
)
select ok(
  (
    select count(*) = 1
      and bool_and(
        p.cmd = 'ALL'
        and p.roles::text = '{public}'
        and p.qual is not null
        and p.with_check is not null
        and position(expected.owner_column in p.qual) > 0
        and position(expected.owner_column in p.with_check) > 0
        and p.qual like '%uid()%'
        and p.with_check like '%uid()%'
      )
    from pg_catalog.pg_policies p
    where p.schemaname = 'public' and p.tablename = expected.table_name
  ),
  format('public.%I has one auth.uid()-scoped ALL policy with USING and WITH CHECK', expected.table_name)
)
from expected
order by expected.table_name;

select * from finish();
rollback;
