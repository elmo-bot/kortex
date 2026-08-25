import { Capture, CaptureInterpretation, Entity, KnowledgeSnapshot } from '@/domain/models';

export interface CommitResult { snapshot: KnowledgeSnapshot; primaryEntityId?: string }
export interface KnowledgeRepository {
  load(): Promise<KnowledgeSnapshot>;
  createPendingCapture(rawText: string, inputType: Capture['inputType']): Promise<Capture>;
  markCaptureReady(captureId: string, interpretation: CaptureInterpretation): Promise<void>;
  commitCapture(interpretation: CaptureInterpretation): Promise<CommitResult>;
  updateEntity(entity: Entity): Promise<void>;
  resetDemo?(): Promise<KnowledgeSnapshot>;
}
