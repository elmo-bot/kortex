export interface TranscriptionService { transcribe(recordingUri: string): Promise<string> }
