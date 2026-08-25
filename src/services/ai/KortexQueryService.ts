import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const answerSchema = z.object({
  answer: z.string().min(1).max(1600), entityIds: z.array(z.string().uuid()).max(12),
  evidence: z.array(z.object({ text: z.string().min(1).max(400), source: z.enum(['memory', 'inference']), entityIds: z.array(z.string().uuid()).max(8) }).strict()).max(12),
}).strict();
export type KortexAnswer = z.infer<typeof answerSchema>;

export async function askKortex(question: string, contextEntityId?: string): Promise<KortexAnswer> {
  if (!supabase) throw new Error('Kortex intelligence is not configured.');
  const { data, error } = await supabase.functions.invoke('ask-kortex', { body: { question, contextEntityId } });
  if (error) throw new Error('Kortex could not reason over your memory right now.');
  return answerSchema.parse(data);
}
