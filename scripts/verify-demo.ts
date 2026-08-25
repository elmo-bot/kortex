import assert from 'node:assert/strict';
import { createDemoSeed } from '../src/data/demoSeed';
import { Entity } from '../src/domain/models';
import { DemoAIService } from '../src/services/ai/DemoAIService';

async function verify() {
const ai = new DemoAIService();
const snapshot = createDemoSeed();
const sarahText = 'I met Sarah today. She runs a design agency in Stockholm and works with several restaurant chains. She might be useful for the Monitora project. I should call her next Tuesday.';
const first = await ai.interpret({ rawText: sarahText, inputType: 'voice', snapshot });
assert.equal(first.entities.find(item => item.temporaryId === 'sarah')?.type, 'contact');
assert.equal(first.entities.find(item => item.temporaryId === 'monitora')?.operation, 'reference');
assert.equal(first.relationships.some(item => item.type === 'potential_collaborator_for'), true);
assert.equal(first.followUps[0]?.dateInterpretation, 'next Tuesday');

const timestamp = new Date().toISOString();
const sarah: Entity = { id: '40000000-0000-4000-8000-000000000001', ownerId: snapshot.entities[0].ownerId, type: 'contact', displayName: 'Sarah', subtitle: 'Design agency founder · Stockholm', tags: ['Design'], fields: [], needsReview: false, createdAt: timestamp, updatedAt: timestamp };
const agency: Entity = { id: '40000000-0000-4000-8000-000000000002', ownerId: snapshot.entities[0].ownerId, type: 'company', displayName: 'Design agency', subtitle: 'Stockholm', tags: ['Design agency'], fields: [], needsReview: true, createdAt: timestamp, updatedAt: timestamp };
const second = await ai.interpret({ rawText: 'I spoke to Sarah again. Her company is called North Studio.', inputType: 'text', snapshot: { ...snapshot, entities: [...snapshot.entities, sarah, agency] } });
assert.equal(second.entities.find(item => item.temporaryId === 'sarah')?.existingEntityId, sarah.id);
assert.equal(second.entities.find(item => item.temporaryId === 'north-studio')?.existingEntityId, agency.id);
assert.equal(second.entities.find(item => item.temporaryId === 'north-studio')?.operation, 'update');

const ideaText = 'I have an idea for an AI tool that automatically prepares companies before customer meetings by combining CRM data, email history and public information.';
const idea = await ai.interpret({ rawText: ideaText, inputType: 'text', snapshot });
assert.equal(idea.entities[0].displayName, 'Meeting Intelligence');
assert.equal(idea.entities[0].attributes.original_thought, ideaText);
assert.equal(idea.entities[0].status, 'Seed');
console.log('Verified: Sarah capture, Sarah entity resolution, and idea capture.');
}

void verify();
