import { Capture, CaptureInterpretation, Entity, KnowledgeSnapshot } from '@/domain/models';
import { makeId } from '@/lib/id';
import { supabase } from '@/lib/supabase';
import { CommitResult, KnowledgeRepository } from './KnowledgeRepository';

function requireClient() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase; }
function dbEntity(row: Record<string, unknown>): Entity {
  return { id: String(row.id), ownerId: String(row.owner_id), type: row.entity_type as Entity['type'], displayName: String(row.display_name), subtitle: row.subtitle ? String(row.subtitle) : undefined, summary: row.summary ? String(row.summary) : undefined, status: row.status ? String(row.status) : undefined, tags: Array.isArray(row.tags_cache) ? row.tags_cache.map(String) : [], fields: Array.isArray(row.knowledge_fields) ? row.knowledge_fields as Entity['fields'] : [], sourceCaptureId: row.source_capture_id ? String(row.source_capture_id) : undefined, confidence: typeof row.ai_confidence === 'number' ? row.ai_confidence : undefined, needsReview: Boolean(row.needs_review), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

export class SupabaseRepository implements KnowledgeRepository {
  async load(): Promise<KnowledgeSnapshot> {
    const client = requireClient();
    const [entities, relationships, timeline, captures] = await Promise.all([
      client.from('entities').select('*').order('updated_at', { ascending: false }),
      client.from('relationships').select('*').order('updated_at', { ascending: false }),
      client.from('timeline_events').select('*').order('occurred_at', { ascending: false }).limit(200),
      client.from('captures').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    const error = entities.error ?? relationships.error ?? timeline.error ?? captures.error;
    if (error) throw error;
    return {
      entities: (entities.data ?? []).map(row => dbEntity(row)),
      relationships: (relationships.data ?? []).map(row => ({ id: row.id, ownerId: row.owner_id, sourceEntityId: row.source_entity_id, targetEntityId: row.target_entity_id, type: row.relationship_type, context: row.context ?? undefined, confidence: row.confidence ?? undefined, sourceCaptureId: row.source_capture_id ?? undefined, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at })),
      timeline: (timeline.data ?? []).map(row => ({ id: row.id, ownerId: row.owner_id, entityId: row.entity_id ?? undefined, captureId: row.capture_id ?? undefined, kind: row.event_kind, title: row.title, detail: row.detail ?? undefined, occurredAt: row.occurred_at, needsReview: row.needs_review })),
      captures: (captures.data ?? []).map(row => ({ id: row.id, ownerId: row.owner_id, inputType: row.input_type, rawText: row.raw_text, transcript: row.transcript ?? undefined, status: row.processing_status, confidence: row.confidence ?? undefined, reviewed: row.reviewed, createdAt: row.created_at, updatedAt: row.updated_at })),
    };
  }

  async createPendingCapture(rawText: string, inputType: Capture['inputType']): Promise<Capture> {
    const client = requireClient();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) throw new Error('Sign in before saving to Kortex.');
    const id = makeId();
    const { data, error } = await client.from('captures').insert({ id, owner_id: auth.user.id, input_type: inputType, raw_text: rawText, transcript: inputType === 'voice' ? rawText : null, processing_status: 'interpreting' }).select().single();
    if (error) throw error;
    return { id: data.id, ownerId: data.owner_id, inputType: data.input_type, rawText: data.raw_text, transcript: data.transcript ?? undefined, status: data.processing_status, confidence: data.confidence ?? undefined, reviewed: data.reviewed, createdAt: data.created_at, updatedAt: data.updated_at };
  }

  async markCaptureReady(captureId: string, interpretation: CaptureInterpretation): Promise<void> {
    const { error } = await requireClient().from('captures').update({ processing_status: 'ready', confidence: interpretation.overallConfidence }).eq('id', captureId);
    if (error) throw error;
  }

  async commitCapture(interpretation: CaptureInterpretation): Promise<CommitResult> {
    const { data, error } = await requireClient().rpc('commit_capture', { p_capture_id: interpretation.captureId, p_result: interpretation });
    if (error) throw error;
    const snapshot = await this.load();
    return { snapshot, primaryEntityId: typeof data?.primary_entity_id === 'string' ? data.primary_entity_id : undefined };
  }

  async updateEntity(entity: Entity): Promise<void> {
    const { error } = await requireClient().from('entities').update({ display_name: entity.displayName, subtitle: entity.subtitle, summary: entity.summary, status: entity.status, knowledge_fields: entity.fields, needs_review: entity.needsReview }).eq('id', entity.id);
    if (error) throw error;
  }
}
