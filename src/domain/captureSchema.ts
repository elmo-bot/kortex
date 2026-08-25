import { z } from 'zod';
import { entityTypes } from './models';

const proposedEntitySchema = z.object({
  temporaryId: z.string().min(1).max(80), type: z.enum(entityTypes), displayName: z.string().min(1).max(180),
  subtitle: z.string().max(240).optional(), summary: z.string().max(800).optional(), status: z.string().max(80).optional(),
  attributes: z.record(z.string(), z.string().max(1200)), tags: z.array(z.string().max(60)).max(20),
  confidence: z.number().min(0).max(1), existingEntityId: z.string().uuid().optional(), matchReason: z.string().max(300).optional(),
  operation: z.enum(['create', 'update', 'reference']), needsReview: z.boolean(),
}).strict();

export const captureInterpretationSchema = z.object({
  schemaVersion: z.literal(1), summary: z.string().min(1).max(500), entities: z.array(proposedEntitySchema).max(30),
  relationships: z.array(z.object({
    sourceTemporaryId: z.string().max(80).optional(), sourceExistingId: z.string().uuid().optional(),
    targetTemporaryId: z.string().max(80).optional(), targetExistingId: z.string().uuid().optional(),
    type: z.string().regex(/^[a-z][a-z0-9_]{1,79}$/), context: z.string().max(800).optional(), confidence: z.number().min(0).max(1),
  }).strict().superRefine((value, ctx) => {
    if (!(value.sourceTemporaryId || value.sourceExistingId) || !(value.targetTemporaryId || value.targetExistingId)) {
      ctx.addIssue({ code: 'custom', message: 'Relationship endpoints are required' });
    }
  })).max(60),
  followUps: z.array(z.object({
    description: z.string().min(1).max(300), dateInterpretation: z.string().min(1).max(120),
    dueAt: z.string().datetime().optional(), relatedEntityId: z.string().uuid().optional(),
  }).strict()).max(20),
  clarifications: z.array(z.object({
    id: z.string().min(1).max(80), question: z.string().min(1).max(300), entityTemporaryId: z.string().max(80).optional(), optional: z.boolean(),
  }).strict()).max(20),
  overallConfidence: z.number().min(0).max(1),
}).strict();

export type CaptureInterpretationInput = z.infer<typeof captureInterpretationSchema>;
