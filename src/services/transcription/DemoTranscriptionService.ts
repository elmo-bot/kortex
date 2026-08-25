import { sarahDemoCapture } from '@/data/demoJourneys';
import { TranscriptionService } from './TranscriptionService';
export class DemoTranscriptionService implements TranscriptionService { async transcribe() { return sarahDemoCapture; } }
