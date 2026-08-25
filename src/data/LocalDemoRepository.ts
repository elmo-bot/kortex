import AsyncStorage from '@react-native-async-storage/async-storage';
import { Capture, CaptureInterpretation, Entity, KnowledgeField, KnowledgeSnapshot } from '@/domain/models';
import { makeId } from '@/lib/id';
import { createDemoSeed } from './demoSeed';
import { CommitResult, KnowledgeRepository } from './KnowledgeRepository';

const storageKey = 'kortex.demo.snapshot.v2';

export class LocalDemoRepository implements KnowledgeRepository {
  private snapshot: KnowledgeSnapshot = createDemoSeed();

  async load(): Promise<KnowledgeSnapshot> {
    const stored = await AsyncStorage.getItem(storageKey);
    this.snapshot = stored ? JSON.parse(stored) as KnowledgeSnapshot : createDemoSeed();
    if (!stored) await this.persist();
    return this.snapshot;
  }

  async createPendingCapture(rawText: string, inputType: Capture['inputType']): Promise<Capture> {
    const timestamp = new Date().toISOString();
    const capture: Capture = { id: makeId(), ownerId: this.snapshot.entities[0]?.ownerId ?? makeId(), inputType, rawText, transcript: inputType === 'voice' ? rawText : undefined, status: 'interpreting', reviewed: false, createdAt: timestamp, updatedAt: timestamp };
    this.snapshot = { ...this.snapshot, captures: [capture, ...this.snapshot.captures] };
    await this.persist();
    return capture;
  }

  async markCaptureReady(captureId: string, interpretation: CaptureInterpretation): Promise<void> {
    this.snapshot = { ...this.snapshot, captures: this.snapshot.captures.map(capture => capture.id === captureId ? { ...capture, status: 'ready', confidence: interpretation.overallConfidence, updatedAt: new Date().toISOString() } : capture) };
    await this.persist();
  }

  async commitCapture(interpretation: CaptureInterpretation): Promise<CommitResult> {
    if (!interpretation.captureId) throw new Error('Capture provenance is missing.');
    const timestamp = new Date().toISOString();
    const ownerId = this.snapshot.entities[0]?.ownerId ?? makeId();
    const temporaryIds = new Map<string, string>();
    let primaryEntityId: string | undefined;
    let nextEntities = [...this.snapshot.entities];

    interpretation.entities.forEach(proposed => {
      if (proposed.operation === 'reference' && proposed.existingEntityId) {
        temporaryIds.set(proposed.temporaryId, proposed.existingEntityId);
        return;
      }
      const existingIndex = proposed.existingEntityId ? nextEntities.findIndex(item => item.id === proposed.existingEntityId) : -1;
      const fields: KnowledgeField[] = Object.entries(proposed.attributes).map(([key, value]) => ({ key, label: key.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()), value, origin: proposed.operation === 'update' ? 'explicit' : 'inferred', confidence: proposed.confidence }));
      if (existingIndex >= 0) {
        const existing = nextEntities[existingIndex];
        nextEntities[existingIndex] = { ...existing, displayName: proposed.displayName || existing.displayName, subtitle: proposed.subtitle ?? existing.subtitle, summary: proposed.summary ?? existing.summary, status: proposed.status ?? existing.status, tags: [...new Set([...existing.tags, ...proposed.tags])], fields: [...existing.fields.filter(field => !fields.some(next => next.key === field.key)), ...fields], confidence: proposed.confidence, needsReview: proposed.needsReview, sourceCaptureId: interpretation.captureId, updatedAt: timestamp };
        temporaryIds.set(proposed.temporaryId, existing.id);
        primaryEntityId ??= existing.id;
      } else {
        const id = makeId();
        nextEntities.push({ id, ownerId, type: proposed.type, displayName: proposed.displayName, subtitle: proposed.subtitle, summary: proposed.summary, status: proposed.status, tags: proposed.tags, fields, sourceCaptureId: interpretation.captureId, confidence: proposed.confidence, needsReview: proposed.needsReview, createdAt: timestamp, updatedAt: timestamp });
        temporaryIds.set(proposed.temporaryId, id);
        primaryEntityId ??= id;
      }
    });

    const newRelationships = interpretation.relationships.flatMap(proposed => {
      const sourceEntityId = proposed.sourceExistingId ?? (proposed.sourceTemporaryId ? temporaryIds.get(proposed.sourceTemporaryId) : undefined);
      const targetEntityId = proposed.targetExistingId ?? (proposed.targetTemporaryId ? temporaryIds.get(proposed.targetTemporaryId) : undefined);
      if (!sourceEntityId || !targetEntityId || sourceEntityId === targetEntityId) return [];
      const duplicate = this.snapshot.relationships.some(item => item.sourceEntityId === sourceEntityId && item.targetEntityId === targetEntityId && item.type === proposed.type);
      if (duplicate) return [];
      return [{ id: makeId(), ownerId, sourceEntityId, targetEntityId, type: proposed.type, context: proposed.context, confidence: proposed.confidence, sourceCaptureId: interpretation.captureId, createdBy: 'ai' as const, createdAt: timestamp, updatedAt: timestamp }];
    });

    const activity = interpretation.entities.filter(entity => entity.operation !== 'reference').map(entity => ({ id: makeId(), ownerId, entityId: temporaryIds.get(entity.temporaryId), captureId: interpretation.captureId, kind: entity.operation === 'update' ? 'updated' as const : 'created' as const, title: entity.displayName, detail: entity.operation === 'update' ? `${entity.type} updated` : `${entity.type} created`, occurredAt: timestamp, needsReview: entity.needsReview }));
    const relationshipActivity = newRelationships.map(item => ({ id: makeId(), ownerId, entityId: item.sourceEntityId, captureId: interpretation.captureId, kind: 'relationship' as const, title: `${nextEntities.find(entity => entity.id === item.sourceEntityId)?.displayName} ↔ ${nextEntities.find(entity => entity.id === item.targetEntityId)?.displayName}`, detail: item.type.replaceAll('_', ' '), occurredAt: timestamp, needsReview: (item.confidence ?? 1) < .8 }));
    this.snapshot = { entities: nextEntities, relationships: [...newRelationships, ...this.snapshot.relationships], timeline: [...activity, ...relationshipActivity, ...this.snapshot.timeline], captures: this.snapshot.captures.map(capture => capture.id === interpretation.captureId ? { ...capture, status: 'saved', reviewed: true, updatedAt: timestamp } : capture) };
    await this.persist();
    return { snapshot: this.snapshot, primaryEntityId };
  }

  async updateEntity(entity: Entity): Promise<void> {
    this.snapshot = { ...this.snapshot, entities: this.snapshot.entities.map(item => item.id === entity.id ? { ...entity, updatedAt: new Date().toISOString() } : item) };
    await this.persist();
  }

  async resetDemo(): Promise<KnowledgeSnapshot> {
    this.snapshot = createDemoSeed();
    await this.persist();
    return this.snapshot;
  }

  private async persist() { await AsyncStorage.setItem(storageKey, JSON.stringify(this.snapshot)); }
}
