import AsyncStorage from '@react-native-async-storage/async-storage';
import { Capture } from '@/domain/models';
import { makeId } from '@/lib/id';

const storageKey = 'kortex.pending-captures.v1';

export interface PendingLocalCapture {
  id: string;
  ownerId: string;
  rawText: string;
  inputType: Capture['inputType'];
  remoteCaptureId?: string;
  createdAt: string;
  lastError?: string;
}

async function readAll(): Promise<PendingLocalCapture[]> {
  const stored = await AsyncStorage.getItem(storageKey);
  if (!stored) return [];
  try { return JSON.parse(stored) as PendingLocalCapture[]; }
  catch { return []; }
}

async function writeAll(items: PendingLocalCapture[]) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(items));
}

export const pendingCaptureQueue = {
  async list(ownerId: string) { return (await readAll()).filter(item => item.ownerId === ownerId); },
  async add(ownerId: string, rawText: string, inputType: Capture['inputType']) {
    const item: PendingLocalCapture = { id: makeId(), ownerId, rawText, inputType, createdAt: new Date().toISOString() };
    const items = await readAll(); await writeAll([item, ...items]); return item;
  },
  async update(id: string, patch: Partial<PendingLocalCapture>) {
    const items = await readAll(); await writeAll(items.map(item => item.id === id ? { ...item, ...patch } : item));
  },
  async removeForCapture(ownerId: string, remoteCaptureId?: string) {
    if (!remoteCaptureId) return;
    const items = await readAll(); await writeAll(items.filter(item => !(item.ownerId === ownerId && item.remoteCaptureId === remoteCaptureId)));
  },
};
