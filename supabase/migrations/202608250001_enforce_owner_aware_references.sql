alter table public.captures
  add constraint captures_id_owner_id_key unique (id, owner_id);

alter table public.tags
  add constraint tags_id_owner_id_key unique (id, owner_id);

alter table public.entities
  drop constraint entities_source_capture_id_fkey,
  add constraint entities_source_capture_id_owner_id_fkey
    foreign key (source_capture_id, owner_id)
    references public.captures (id, owner_id)
    on delete set null (source_capture_id)
    not valid;

alter table public.relationships
  drop constraint relationships_source_capture_id_fkey,
  add constraint relationships_source_capture_id_owner_id_fkey
    foreign key (source_capture_id, owner_id)
    references public.captures (id, owner_id)
    on delete set null (source_capture_id)
    not valid;

alter table public.entity_tags
  drop constraint entity_tags_tag_id_fkey,
  add constraint entity_tags_tag_id_owner_id_fkey
    foreign key (tag_id, owner_id)
    references public.tags (id, owner_id)
    on delete cascade
    not valid;

alter table public.timeline_events
  drop constraint timeline_events_capture_id_fkey,
  add constraint timeline_events_capture_id_owner_id_fkey
    foreign key (capture_id, owner_id)
    references public.captures (id, owner_id)
    on delete set null (capture_id)
    not valid;

alter table public.follow_ups
  drop constraint follow_ups_capture_id_fkey,
  add constraint follow_ups_capture_id_owner_id_fkey
    foreign key (capture_id, owner_id)
    references public.captures (id, owner_id)
    on delete set null (capture_id)
    not valid;

alter table public.ai_interpretations
  drop constraint ai_interpretations_capture_id_fkey,
  add constraint ai_interpretations_capture_id_owner_id_fkey
    foreign key (capture_id, owner_id)
    references public.captures (id, owner_id)
    on delete cascade
    not valid;

alter table public.entities
  validate constraint entities_source_capture_id_owner_id_fkey;

alter table public.relationships
  validate constraint relationships_source_capture_id_owner_id_fkey;

alter table public.entity_tags
  validate constraint entity_tags_tag_id_owner_id_fkey;

alter table public.timeline_events
  validate constraint timeline_events_capture_id_owner_id_fkey;

alter table public.follow_ups
  validate constraint follow_ups_capture_id_owner_id_fkey;

alter table public.ai_interpretations
  validate constraint ai_interpretations_capture_id_owner_id_fkey;
