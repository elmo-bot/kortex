import { Entity, KnowledgeSnapshot, Relationship, TimelineEvent } from '@/domain/models';

const ownerId = '00000000-0000-4000-8000-000000000001';
const now = '2026-08-24T09:00:00.000Z';

const entities: Entity[] = [
  { id: '10000000-0000-4000-8000-000000000001', ownerId, type: 'project', displayName: 'Monitora', subtitle: 'Project intelligence for field teams', summary: 'An active product exploring clearer operational visibility for service and construction teams.', status: 'Active', tags: ['Product', 'B2B'], fields: [{ key: 'focus', label: 'Focus', value: 'Project management', origin: 'explicit' }], confidence: 1, needsReview: false, createdAt: '2026-06-10T08:00:00.000Z', updatedAt: now },
  { id: '10000000-0000-4000-8000-000000000002', ownerId, type: 'contact', displayName: 'Ahmed Hassan', subtitle: 'Founder · Hassan Construction AB', summary: 'Ahmed runs a growing construction company in Kalmar and is exploring a better way to coordinate projects.', tags: ['Construction', 'Entrepreneur', 'Potential customer'], fields: [{ key: 'location', label: 'Location', value: 'Kalmar, Sweden', origin: 'explicit' }, { key: 'company_size', label: 'Company size', value: 'About 15 people', origin: 'explicit' }], confidence: .96, needsReview: false, createdAt: '2026-08-08T10:00:00.000Z', updatedAt: now },
  { id: '10000000-0000-4000-8000-000000000003', ownerId, type: 'company', displayName: 'Hassan Construction AB', subtitle: 'Construction · Kalmar', summary: 'A fifteen-person construction company evaluating project management options.', tags: ['Construction'], fields: [{ key: 'location', label: 'Location', value: 'Kalmar', origin: 'explicit' }, { key: 'size', label: 'Team', value: '~15', origin: 'explicit' }], confidence: .94, needsReview: false, createdAt: '2026-08-08T10:00:00.000Z', updatedAt: now },
  { id: '10000000-0000-4000-8000-000000000004', ownerId, type: 'contact', displayName: 'Mahmoud Al Mokdad', subtitle: 'Business advisor', summary: 'Mahmoud works across growth and employment initiatives in Småland.', tags: ['Advisor', 'Småland'], fields: [{ key: 'location', label: 'Region', value: 'Småland', origin: 'explicit' }], confidence: 1, needsReview: false, createdAt: '2026-07-02T12:00:00.000Z', updatedAt: '2026-08-22T12:00:00.000Z' },
  { id: '10000000-0000-4000-8000-000000000005', ownerId, type: 'company', displayName: 'Småland Solution', subtitle: 'Business services', summary: 'A regional partner connected to founders and employer networks.', tags: ['Partner'], fields: [], confidence: 1, needsReview: false, createdAt: '2026-07-02T12:00:00.000Z', updatedAt: '2026-08-19T12:00:00.000Z' },
  { id: '10000000-0000-4000-8000-000000000006', ownerId, type: 'idea', displayName: 'Business Twin', subtitle: 'Seed', summary: 'A living intelligence layer that understands the state and context of a business.', status: 'Exploring', tags: ['AI', 'Intelligence'], fields: [{ key: 'hypothesis', label: 'Hypothesis', value: 'Context compounds when knowledge stays connected.', origin: 'explicit' }], confidence: 1, needsReview: false, createdAt: '2026-07-18T09:00:00.000Z', updatedAt: '2026-08-20T09:00:00.000Z' },
  { id: '10000000-0000-4000-8000-000000000007', ownerId, type: 'meeting', displayName: 'Bridge Legal · product review', subtitle: '21 Aug', summary: 'Discussed data provenance, client permissions and the first pilot shape.', tags: ['Legal', 'Pilot'], fields: [{ key: 'decisions', label: 'Decisions', value: '3 decisions extracted', origin: 'system' }], confidence: .91, needsReview: false, createdAt: '2026-08-21T14:00:00.000Z', updatedAt: '2026-08-21T15:00:00.000Z' },
  { id: '10000000-0000-4000-8000-000000000008', ownerId, type: 'project', displayName: 'Kortex', subtitle: 'Personal intelligence system', summary: 'An AI-first second brain that turns natural capture into structured, connected memory.', status: 'Active', tags: ['AI', 'Knowledge'], fields: [], confidence: 1, needsReview: false, createdAt: '2026-05-12T08:00:00.000Z', updatedAt: now },
  { id: '10000000-0000-4000-8000-000000000009', ownerId, type: 'document', displayName: 'Monitora pilot notes', subtitle: 'Working document', summary: 'Pilot assumptions, target companies and open product questions.', tags: ['Pilot'], fields: [], confidence: 1, needsReview: false, createdAt: '2026-08-17T08:00:00.000Z', updatedAt: '2026-08-23T08:00:00.000Z' },
];

function relation(id: string, sourceEntityId: string, targetEntityId: string, type: string, context?: string): Relationship {
  return { id, ownerId, sourceEntityId, targetEntityId, type, context, confidence: .92, createdBy: 'ai', createdAt: now, updatedAt: now };
}

const relationships = [
  relation('20000000-0000-4000-8000-000000000001', entities[1].id, entities[2].id, 'works_at'),
  relation('20000000-0000-4000-8000-000000000002', entities[1].id, entities[0].id, 'potential_customer_for', 'Interested in better project coordination.'),
  relation('20000000-0000-4000-8000-000000000003', entities[3].id, entities[4].id, 'works_with'),
  relation('20000000-0000-4000-8000-000000000004', entities[3].id, entities[0].id, 'could_support'),
  relation('20000000-0000-4000-8000-000000000005', entities[5].id, entities[7].id, 'related_to'),
  relation('20000000-0000-4000-8000-000000000006', entities[6].id, entities[7].id, 'discussed'),
  relation('20000000-0000-4000-8000-000000000007', entities[8].id, entities[0].id, 'documents'),
];

const timeline: TimelineEvent[] = [
  { id: '30000000-0000-4000-8000-000000000001', ownerId, entityId: entities[6].id, kind: 'decision', title: 'Bridge Legal', detail: '3 decisions extracted', occurredAt: '2026-08-21T15:00:00.000Z', needsReview: false },
  { id: '30000000-0000-4000-8000-000000000002', ownerId, entityId: entities[1].id, kind: 'relationship', title: 'Ahmed ↔ Monitora', detail: 'Potential relationship found', occurredAt: '2026-08-20T12:00:00.000Z', needsReview: false },
  { id: '30000000-0000-4000-8000-000000000003', ownerId, entityId: entities[3].id, kind: 'review', title: 'Mahmoud', detail: 'Role needs confirmation', occurredAt: '2026-08-19T12:00:00.000Z', needsReview: true },
];

export function createDemoSeed(): KnowledgeSnapshot {
  return { entities, relationships, timeline, captures: [] };
}
