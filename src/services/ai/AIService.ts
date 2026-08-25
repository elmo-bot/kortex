import { Capture, CaptureInterpretation, KnowledgeSnapshot } from '@/domain/models';
export interface InterpretRequest { rawText: string; inputType: Capture['inputType']; snapshot: KnowledgeSnapshot }
export interface AIService { interpret(request: InterpretRequest): Promise<CaptureInterpretation> }
