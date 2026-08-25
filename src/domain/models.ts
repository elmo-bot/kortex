export const entityTypes = ['contact', 'company', 'idea', 'project', 'meeting', 'document'] as const;
export type EntityType = (typeof entityTypes)[number];
export type KnowledgeOrigin = 'explicit' | 'inferred' | 'system';

export interface KnowledgeField { key: string; label: string; value: string; origin: KnowledgeOrigin; confidence?: number }

export interface Entity {
  id: string;
  ownerId: string;
  type: EntityType;
  displayName: string;
  subtitle?: string;
  summary?: string;
  status?: string;
  tags: string[];
  fields: KnowledgeField[];
  sourceCaptureId?: string;
  confidence?: number;
  needsReview: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RelationshipCreator = 'user' | 'ai' | 'system';
export interface Relationship {
  id: string;
  ownerId: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  context?: string;
  confidence?: number;
  sourceCaptureId?: string;
  createdBy: RelationshipCreator;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  ownerId: string;
  entityId?: string;
  captureId?: string;
  kind: 'created' | 'updated' | 'relationship' | 'meeting' | 'decision' | 'review';
  title: string;
  detail?: string;
  occurredAt: string;
  needsReview: boolean;
}

export interface Capture {
  id: string;
  ownerId: string;
  inputType: 'text' | 'voice';
  rawText: string;
  transcript?: string;
  status: 'pending' | 'interpreting' | 'ready' | 'saved' | 'failed';
  confidence?: number;
  reviewed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp { id: string; description: string; dateInterpretation: string; dueAt?: string; relatedEntityId?: string }
export interface KnowledgeSnapshot { entities: Entity[]; relationships: Relationship[]; timeline: TimelineEvent[]; captures: Capture[] }

export interface ProposedEntity {
  temporaryId: string;
  type: EntityType;
  displayName: string;
  subtitle?: string;
  summary?: string;
  status?: string;
  attributes: Record<string, string>;
  tags: string[];
  confidence: number;
  existingEntityId?: string;
  matchReason?: string;
  operation: 'create' | 'update' | 'reference';
  needsReview: boolean;
}

export interface ProposedRelationship {
  sourceTemporaryId?: string;
  sourceExistingId?: string;
  targetTemporaryId?: string;
  targetExistingId?: string;
  type: string;
  context?: string;
  confidence: number;
}

export interface Clarification { id: string; question: string; entityTemporaryId?: string; optional: boolean }

export interface CaptureInterpretation {
  schemaVersion: 1;
  summary: string;
  entities: ProposedEntity[];
  relationships: ProposedRelationship[];
  followUps: Omit<FollowUp, 'id'>[];
  clarifications: Clarification[];
  overallConfidence: number;
  captureId?: string;
}
