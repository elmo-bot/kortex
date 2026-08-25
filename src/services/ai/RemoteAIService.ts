import { captureInterpretationSchema } from '@/domain/captureSchema';
import { supabase } from '@/lib/supabase';
import { AIService, InterpretRequest } from './AIService';

export class RemoteAIService implements AIService {
  async interpret({ rawText, inputType, snapshot }: InterpretRequest) {
    if (!supabase) throw new Error('Secure AI service is unavailable. Your capture is still saved.');
    const knownEntities = snapshot.entities.slice(0, 250).map(({ id, type, displayName, subtitle, tags }) => ({ id, type, displayName, subtitle, tags }));
    const { data, error } = await supabase.functions.invoke('interpret-capture', { body: { rawText, inputType, knownEntities } });
    if (error) throw new Error('Kortex could not interpret this yet. Your original capture is safe.');
    return captureInterpretationSchema.parse(data);
  }
}
