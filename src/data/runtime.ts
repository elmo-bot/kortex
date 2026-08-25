import { DemoAIService } from '@/services/ai/DemoAIService';
import { RemoteAIService } from '@/services/ai/RemoteAIService';
import { AIService } from '@/services/ai/AIService';
import { LocalDemoRepository } from './LocalDemoRepository';
import { SupabaseRepository } from './SupabaseRepository';
import { KnowledgeRepository } from './KnowledgeRepository';

interface Runtime { mode: 'demo' | 'supabase'; repository: KnowledgeRepository; ai: AIService }
const demoMode = process.env.EXPO_PUBLIC_KORTEX_MODE === 'demo';
export const runtime: Runtime = demoMode ? { mode: 'demo', repository: new LocalDemoRepository(), ai: new DemoAIService() } : { mode: 'supabase', repository: new SupabaseRepository(), ai: new RemoteAIService() };
