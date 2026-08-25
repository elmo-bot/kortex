import { supabase } from '@/lib/supabase';
import { TranscriptionService } from './TranscriptionService';

export class RemoteTranscriptionService implements TranscriptionService {
  async transcribe(recordingUri: string): Promise<string> {
    if (!supabase) throw new Error('Transcription is unavailable.');
    const form = new FormData();
    form.append('audio', { uri: recordingUri, name: 'capture.m4a', type: 'audio/m4a' } as unknown as Blob);
    const { data, error } = await supabase.functions.invoke('transcribe-capture', { body: form });
    if (error || typeof data?.text !== 'string' || !data.text.trim()) throw new Error('Transcription is unavailable. Your recording was not retained.');
    return data.text.trim();
  }
}
