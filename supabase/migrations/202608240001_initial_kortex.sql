create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create type public.entity_type as enum ('contact','company','idea','project','meeting','document');
create type public.capture_input_type as enum ('text','voice');
create type public.capture_status as enum ('pending','interpreting','ready','saved','failed');
create type public.knowledge_origin as enum ('explicit','inferred','system');
create type public.relationship_creator as enum ('user','ai','system');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.captures (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  input_type public.capture_input_type not null,
  raw_text text not null check (char_length(raw_text) between 1 and 20000),
  transcript text,
  processing_status public.capture_status not null default 'pending',
  confidence real check (confidence between 0 and 1),
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index captures_owner_created_idx on public.captures(owner_id, created_at desc);

create table public.entities (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entity_type public.entity_type not null,
  display_name text not null check (char_length(display_name) between 1 and 180),
  subtitle text,
  summary text,
  status text,
  knowledge_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(knowledge_fields) = 'array'),
  tags_cache text[] not null default '{}',
  source_capture_id uuid references public.captures(id) on delete set null,
  ai_confidence real check (ai_confidence between 0 and 1),
  needs_review boolean not null default false,
  search_document tsvector generated always as (to_tsvector('simple', coalesce(display_name,'') || ' ' || coalesce(subtitle,'') || ' ' || coalesce(summary,''))) stored,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, owner_id)
);
create index entities_owner_type_updated_idx on public.entities(owner_id, entity_type, updated_at desc);
create index entities_search_idx on public.entities using gin(search_document);
create index entities_embedding_idx on public.entities using hnsw (embedding extensions.vector_cosine_ops) where embedding is not null;

create table public.contacts (
  entity_id uuid primary key,
  owner_id uuid not null,
  first_name text, last_name text, role text, title text, company_entity_id uuid,
  location text, languages text[], expertise text[], personal_notes text, how_met text,
  relationship_strength smallint check (relationship_strength between 0 and 100), last_interaction_at timestamptz,
  foreign key(entity_id, owner_id) references public.entities(id, owner_id) on delete cascade,
  foreign key(company_entity_id, owner_id) references public.entities(id, owner_id) on delete set null
);
create table public.companies (
  entity_id uuid primary key, owner_id uuid not null, industry text, description text, location text, website text, size_label text,
  foreign key(entity_id, owner_id) references public.entities(id, owner_id) on delete cascade
);
create table public.ideas (
  entity_id uuid primary key, owner_id uuid not null, description text, hypothesis text, stage text not null default 'Seed', original_thought text,
  foreign key(entity_id, owner_id) references public.entities(id, owner_id) on delete cascade
);
create table public.projects (
  entity_id uuid primary key, owner_id uuid not null, description text, project_status text not null default 'Planned', starts_at timestamptz, ends_at timestamptz,
  foreign key(entity_id, owner_id) references public.entities(id, owner_id) on delete cascade
);
create table public.meetings (
  entity_id uuid primary key, owner_id uuid not null, occurred_at timestamptz, raw_notes text, transcript text, decisions text[], action_points text[],
  foreign key(entity_id, owner_id) references public.entities(id, owner_id) on delete cascade
);
create table public.documents (
  entity_id uuid primary key, owner_id uuid not null, body_text text, source text, reference_url text, storage_path text,
  foreign key(entity_id, owner_id) references public.entities(id, owner_id) on delete cascade
);

create table public.relationships (
  id uuid primary key default extensions.gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  source_entity_id uuid not null, target_entity_id uuid not null, relationship_type text not null check (relationship_type ~ '^[a-z][a-z0-9_]{1,79}$'),
  context text, confidence real check (confidence between 0 and 1), source_capture_id uuid references public.captures(id) on delete set null,
  created_by public.relationship_creator not null default 'user', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(source_entity_id, owner_id) references public.entities(id, owner_id) on delete cascade,
  foreign key(target_entity_id, owner_id) references public.entities(id, owner_id) on delete cascade,
  check (source_entity_id <> target_entity_id), unique(owner_id, source_entity_id, target_entity_id, relationship_type)
);
create index relationships_source_idx on public.relationships(owner_id, source_entity_id);
create index relationships_target_idx on public.relationships(owner_id, target_entity_id);

create table public.tags (
  id uuid primary key default extensions.gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60), created_at timestamptz not null default now(), unique(owner_id, name)
);
create table public.entity_tags (
  owner_id uuid not null references public.profiles(id) on delete cascade, entity_id uuid not null, tag_id uuid not null references public.tags(id) on delete cascade,
  primary key(entity_id, tag_id), foreign key(entity_id, owner_id) references public.entities(id, owner_id) on delete cascade
);

create table public.timeline_events (
  id uuid primary key default extensions.gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  entity_id uuid, capture_id uuid references public.captures(id) on delete set null, event_kind text not null,
  title text not null, detail text, occurred_at timestamptz not null default now(), needs_review boolean not null default false,
  foreign key(entity_id, owner_id) references public.entities(id, owner_id) on delete cascade
);
create index timeline_owner_occurred_idx on public.timeline_events(owner_id, occurred_at desc);

create table public.follow_ups (
  id uuid primary key default extensions.gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  capture_id uuid references public.captures(id) on delete set null, related_entity_id uuid, description text not null,
  date_interpretation text not null, due_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(),
  foreign key(related_entity_id, owner_id) references public.entities(id, owner_id) on delete set null
);
create table public.ai_interpretations (
  id uuid primary key default extensions.gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  capture_id uuid not null references public.captures(id) on delete cascade, provider text not null, model text not null,
  schema_version integer not null, structured_result jsonb not null check (jsonb_typeof(structured_result) = 'object'), created_at timestamptz not null default now()
);
create index interpretations_capture_idx on public.ai_interpretations(owner_id, capture_id);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger captures_updated before update on public.captures for each row execute function public.set_updated_at();
create trigger entities_updated before update on public.entities for each row execute function public.set_updated_at();
create trigger relationships_updated before update on public.relationships for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path = '' as $$ begin insert into public.profiles(id, display_name) values(new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))); return new; end $$;
create trigger auth_user_profile after insert on auth.users for each row execute function public.create_profile_for_user();

alter table public.profiles enable row level security;
alter table public.captures enable row level security;
alter table public.entities enable row level security;
alter table public.contacts enable row level security;
alter table public.companies enable row level security;
alter table public.ideas enable row level security;
alter table public.projects enable row level security;
alter table public.meetings enable row level security;
alter table public.documents enable row level security;
alter table public.relationships enable row level security;
alter table public.tags enable row level security;
alter table public.entity_tags enable row level security;
alter table public.timeline_events enable row level security;
alter table public.follow_ups enable row level security;
alter table public.ai_interpretations enable row level security;

create policy profiles_owner_all on public.profiles for all using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy captures_owner_all on public.captures for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy entities_owner_all on public.entities for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy contacts_owner_all on public.contacts for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy companies_owner_all on public.companies for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy ideas_owner_all on public.ideas for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy projects_owner_all on public.projects for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy meetings_owner_all on public.meetings for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy documents_owner_all on public.documents for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy relationships_owner_all on public.relationships for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy tags_owner_all on public.tags for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy entity_tags_owner_all on public.entity_tags for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy timeline_owner_all on public.timeline_events for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy followups_owner_all on public.follow_ups for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy interpretations_owner_all on public.ai_interpretations for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create or replace function public.commit_capture(p_capture_id uuid, p_result jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_owner uuid := auth.uid(); v_entity jsonb; v_edge jsonb; v_follow jsonb; v_id uuid; v_existing uuid;
  v_source uuid; v_target uuid; v_primary uuid; v_temp jsonb := '{}'::jsonb; v_fields jsonb; v_type public.entity_type;
begin
  if v_owner is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_result->'entities') <> 'array' or jsonb_array_length(p_result->'entities') > 30 then raise exception 'Invalid entity result'; end if;
  if jsonb_typeof(p_result->'relationships') <> 'array' or jsonb_array_length(p_result->'relationships') > 60 then raise exception 'Invalid relationship result'; end if;
  perform 1 from public.captures where id = p_capture_id and owner_id = v_owner for update;
  if not found then raise exception 'Capture not found'; end if;
  insert into public.ai_interpretations(owner_id,capture_id,provider,model,schema_version,structured_result) values(v_owner,p_capture_id,'openai_or_demo','validated',1,p_result);
  for v_entity in select value from jsonb_array_elements(p_result->'entities') loop
    v_type := (v_entity->>'type')::public.entity_type;
    v_existing := nullif(v_entity->>'existingEntityId','')::uuid;
    if v_existing is not null then
      perform 1 from public.entities where id = v_existing and owner_id = v_owner;
      if not found then raise exception 'Entity reference not owned by caller'; end if;
    end if;
    if v_entity->>'operation' = 'reference' then
      if v_existing is null then raise exception 'Reference requires existing entity'; end if;
      v_id := v_existing;
    else
      select coalesce(jsonb_agg(jsonb_build_object('key', key, 'label', initcap(replace(key,'_',' ')), 'value', value, 'origin', case when v_entity->>'operation'='update' then 'explicit' else 'inferred' end, 'confidence', (v_entity->>'confidence')::real)), '[]'::jsonb)
      into v_fields from jsonb_each_text(coalesce(v_entity->'attributes','{}'::jsonb));
      if v_existing is not null then
        update public.entities set display_name=coalesce(nullif(v_entity->>'displayName',''),display_name), subtitle=coalesce(v_entity->>'subtitle',subtitle), summary=coalesce(v_entity->>'summary',summary), status=coalesce(v_entity->>'status',status), knowledge_fields=knowledge_fields || v_fields, tags_cache=(select array(select distinct jsonb_array_elements_text(coalesce(v_entity->'tags','[]'::jsonb)))), source_capture_id=p_capture_id, ai_confidence=(v_entity->>'confidence')::real, needs_review=coalesce((v_entity->>'needsReview')::boolean,false) where id=v_existing and owner_id=v_owner returning id into v_id;
        if v_type='contact' then update public.contacts set role=coalesce(v_entity->'attributes'->>'role',role),title=coalesce(v_entity->'attributes'->>'title',title),location=coalesce(v_entity->'attributes'->>'location',location) where entity_id=v_id and owner_id=v_owner;
        elsif v_type='company' then update public.companies set industry=coalesce(v_entity->'attributes'->>'industry',industry),location=coalesce(v_entity->'attributes'->>'location',location),size_label=coalesce(v_entity->'attributes'->>'size',size_label),website=coalesce(v_entity->'attributes'->>'website',website) where entity_id=v_id and owner_id=v_owner;
        elsif v_type='idea' then update public.ideas set hypothesis=coalesce(v_entity->'attributes'->>'hypothesis',hypothesis),stage=coalesce(v_entity->>'status',stage),original_thought=coalesce(v_entity->'attributes'->>'original_thought',original_thought) where entity_id=v_id and owner_id=v_owner;
        elsif v_type='project' then update public.projects set description=coalesce(v_entity->>'summary',description),project_status=coalesce(v_entity->>'status',project_status) where entity_id=v_id and owner_id=v_owner; end if;
      else
        insert into public.entities(owner_id,entity_type,display_name,subtitle,summary,status,knowledge_fields,tags_cache,source_capture_id,ai_confidence,needs_review)
        values(v_owner,v_type,v_entity->>'displayName',v_entity->>'subtitle',v_entity->>'summary',v_entity->>'status',v_fields,array(select jsonb_array_elements_text(coalesce(v_entity->'tags','[]'::jsonb))),p_capture_id,(v_entity->>'confidence')::real,coalesce((v_entity->>'needsReview')::boolean,false)) returning id into v_id;
        if v_type='contact' then insert into public.contacts(entity_id,owner_id,role,location) values(v_id,v_owner,v_entity->'attributes'->>'role',v_entity->'attributes'->>'location');
        elsif v_type='company' then insert into public.companies(entity_id,owner_id,industry,location,size_label) values(v_id,v_owner,v_entity->'attributes'->>'industry',v_entity->'attributes'->>'location',v_entity->'attributes'->>'size');
        elsif v_type='idea' then insert into public.ideas(entity_id,owner_id,description,hypothesis,stage,original_thought) values(v_id,v_owner,v_entity->>'summary',v_entity->'attributes'->>'hypothesis',coalesce(v_entity->>'status','Seed'),v_entity->'attributes'->>'original_thought');
        elsif v_type='project' then insert into public.projects(entity_id,owner_id,description,project_status) values(v_id,v_owner,v_entity->>'summary',coalesce(v_entity->>'status','Planned'));
        elsif v_type='meeting' then insert into public.meetings(entity_id,owner_id,raw_notes) values(v_id,v_owner,v_entity->'attributes'->>'raw_notes');
        elsif v_type='document' then insert into public.documents(entity_id,owner_id,body_text,source,reference_url) values(v_id,v_owner,v_entity->'attributes'->>'text',v_entity->'attributes'->>'source',v_entity->'attributes'->>'reference_url'); end if;
      end if;
      insert into public.timeline_events(owner_id,entity_id,capture_id,event_kind,title,detail,needs_review) values(v_owner,v_id,p_capture_id,case when v_existing is null then 'created' else 'updated' end,v_entity->>'displayName',v_type::text || case when v_existing is null then ' created' else ' updated' end,coalesce((v_entity->>'needsReview')::boolean,false));
      v_primary := coalesce(v_primary,v_id);
    end if;
    v_temp := v_temp || jsonb_build_object(v_entity->>'temporaryId',v_id::text);
  end loop;
  for v_edge in select value from jsonb_array_elements(p_result->'relationships') loop
    v_source := coalesce(nullif(v_edge->>'sourceExistingId','')::uuid, nullif(v_temp->>(v_edge->>'sourceTemporaryId'),'')::uuid);
    v_target := coalesce(nullif(v_edge->>'targetExistingId','')::uuid, nullif(v_temp->>(v_edge->>'targetTemporaryId'),'')::uuid);
    perform 1 from public.entities where id in (v_source,v_target) and owner_id=v_owner having count(*)=2;
    if not found or v_source=v_target then raise exception 'Invalid relationship endpoints'; end if;
    insert into public.relationships(owner_id,source_entity_id,target_entity_id,relationship_type,context,confidence,source_capture_id,created_by) values(v_owner,v_source,v_target,v_edge->>'type',v_edge->>'context',(v_edge->>'confidence')::real,p_capture_id,'ai') on conflict do nothing;
    insert into public.timeline_events(owner_id,entity_id,capture_id,event_kind,title,detail,needs_review) values(v_owner,v_source,p_capture_id,'relationship',(select display_name from public.entities where id=v_source)||' ↔ '||(select display_name from public.entities where id=v_target),replace(v_edge->>'type','_',' '),(v_edge->>'confidence')::real < .8);
  end loop;
  for v_follow in select value from jsonb_array_elements(coalesce(p_result->'followUps','[]'::jsonb)) loop
    insert into public.follow_ups(owner_id,capture_id,description,date_interpretation,due_at) values(v_owner,p_capture_id,v_follow->>'description',v_follow->>'dateInterpretation',nullif(v_follow->>'dueAt','')::timestamptz);
  end loop;
  update public.captures set processing_status='saved',reviewed=true,confidence=(p_result->>'overallConfidence')::real where id=p_capture_id and owner_id=v_owner;
  return jsonb_build_object('primary_entity_id',v_primary,'entity_ids',v_temp);
end $$;
grant execute on function public.commit_capture(uuid,jsonb) to authenticated;
