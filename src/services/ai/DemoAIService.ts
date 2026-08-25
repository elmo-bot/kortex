import { captureInterpretationSchema } from '@/domain/captureSchema';
import { CaptureInterpretation, Entity } from '@/domain/models';
import { AIService, InterpretRequest } from './AIService';

const find = (entities: Entity[], type: Entity['type'], name: string) => entities.find(entity => entity.type === type && entity.displayName.toLocaleLowerCase().includes(name));
const titleFromIdea = (text: string) => text.toLocaleLowerCase().includes('customer meeting') ? 'Meeting Intelligence' : text.replace(/^i (have an idea|was thinking)( for| about)?/i, '').trim().split(/\s+/).slice(0, 5).join(' ').replace(/^./, value => value.toUpperCase());

export class DemoAIService implements AIService {
  async interpret({ rawText, snapshot }: InterpretRequest): Promise<CaptureInterpretation> {
    await new Promise(resolve => setTimeout(resolve, 1050));
    const text = rawText.toLocaleLowerCase();
    let result: CaptureInterpretation;
    if (text.includes('sarah') && text.includes('north studio')) result = this.existingSarah(snapshot.entities);
    else if (text.includes('sarah')) result = this.newSarah(snapshot.entities);
    else if (text.includes('idea') || text.includes('tool that')) result = this.idea(rawText);
    else if (text.includes('mahmoud')) result = this.possibleMahmoud(snapshot.entities);
    else result = this.genericIdea(rawText);
    return captureInterpretationSchema.parse(result);
  }

  private newSarah(entities: Entity[]): CaptureInterpretation {
    const monitora = find(entities, 'project', 'monitora');
    return { schemaVersion: 1, summary: 'I understood 5 things', entities: [
      { temporaryId: 'sarah', type: 'contact', displayName: 'Sarah', subtitle: 'Design agency founder · Stockholm', summary: 'Sarah runs a Stockholm design agency serving several restaurant chains and may be relevant to Monitora.', attributes: { location: 'Stockholm', role: 'Design agency founder', context: 'Works with several restaurant chains' }, tags: ['Design', 'Stockholm', 'Potential collaborator'], confidence: .94, operation: 'create', needsReview: false },
      { temporaryId: 'agency', type: 'company', displayName: 'Design agency', subtitle: 'Stockholm', attributes: { location: 'Stockholm', clients: 'Several restaurant chains' }, tags: ['Design agency'], confidence: .62, operation: 'create', needsReview: true },
      ...(monitora ? [{ temporaryId: 'monitora', type: 'project' as const, displayName: monitora.displayName, attributes: {}, tags: monitora.tags, confidence: .99, existingEntityId: monitora.id, matchReason: 'Exact project name', operation: 'reference' as const, needsReview: false }] : []),
    ], relationships: [
      { sourceTemporaryId: 'sarah', targetTemporaryId: 'agency', type: 'runs', context: 'Sarah runs a design agency in Stockholm.', confidence: .89 },
      ...(monitora ? [{ sourceTemporaryId: 'sarah', targetExistingId: monitora.id, type: 'potential_collaborator_for', context: 'May be useful for the Monitora project.', confidence: .88 }] : []),
    ], followUps: [{ description: 'Call Sarah', dateInterpretation: 'next Tuesday' }], clarifications: [{ id: 'company-name', question: "What is Sarah’s company called?", entityTemporaryId: 'agency', optional: true }], overallConfidence: .9 };
  }

  private existingSarah(entities: Entity[]): CaptureInterpretation {
    const sarah = find(entities, 'contact', 'sarah');
    if (!sarah) return this.newSarah(entities);
    const placeholderAgency = find(entities, 'company', 'design agency');
    return { schemaVersion: 1, summary: 'I think this belongs to Sarah', entities: [
      { temporaryId: 'sarah', type: 'contact', displayName: sarah.displayName, subtitle: 'Founder · North Studio', attributes: { company: 'North Studio' }, tags: sarah.tags, confidence: .96, existingEntityId: sarah.id, matchReason: 'Same first name and matching design-agency context', operation: 'update', needsReview: false },
      { temporaryId: 'north-studio', type: 'company', displayName: 'North Studio', subtitle: 'Design agency · Stockholm', summary: 'Sarah’s Stockholm design agency, working with several restaurant chains.', attributes: { location: 'Stockholm', industry: 'Design' }, tags: ['Design agency', 'Stockholm'], confidence: .94, existingEntityId: placeholderAgency?.id, matchReason: placeholderAgency ? 'Fills the missing company name from the earlier capture' : undefined, operation: placeholderAgency ? 'update' : 'create', needsReview: false },
    ], relationships: [{ sourceExistingId: sarah.id, targetTemporaryId: 'north-studio', type: 'runs', context: 'Sarah confirmed the company name.', confidence: .98 }], followUps: [], clarifications: [], overallConfidence: .96 };
  }

  private idea(rawText: string): CaptureInterpretation {
    return { schemaVersion: 1, summary: 'A new idea', entities: [{ temporaryId: 'idea', type: 'idea', displayName: titleFromIdea(rawText), subtitle: 'Seed', summary: rawText.trim(), status: 'Seed', attributes: { original_thought: rawText.trim(), hypothesis: 'Meeting preparation improves when private context and public information are combined.' }, tags: ['AI', 'Meetings'], confidence: .93, operation: 'create', needsReview: false }], relationships: [], followUps: [], clarifications: [], overallConfidence: .93 };
  }

  private possibleMahmoud(entities: Entity[]): CaptureInterpretation {
    const mahmoud = find(entities, 'contact', 'mahmoud');
    if (!mahmoud) return this.genericIdea('Mahmoud');
    return { schemaVersion: 1, summary: 'Possible match', entities: [{ temporaryId: 'mahmoud', type: 'contact', displayName: mahmoud.displayName, attributes: {}, tags: mahmoud.tags, confidence: .87, existingEntityId: mahmoud.id, matchReason: 'First name matches an existing contact', operation: 'reference', needsReview: true }], relationships: [], followUps: [], clarifications: [{ id: 'mahmoud-match', question: `Do you mean ${mahmoud.displayName}?`, entityTemporaryId: 'mahmoud', optional: false }], overallConfidence: .76 };
  }

  private genericIdea(rawText: string): CaptureInterpretation {
    const title = rawText.trim().split(/\s+/).slice(0, 5).join(' ').replace(/[.!?]+$/, '');
    return { schemaVersion: 1, summary: 'One new memory', entities: [{ temporaryId: 'idea', type: 'idea', displayName: title || 'Untitled thought', subtitle: 'Seed', summary: rawText.trim(), status: 'Seed', attributes: { original_thought: rawText.trim() }, tags: [], confidence: .7, operation: 'create', needsReview: true }], relationships: [], followUps: [], clarifications: [], overallConfidence: .7 };
  }
}
