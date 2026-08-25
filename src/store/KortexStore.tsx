import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Capture, CaptureInterpretation, Entity, EntityType, KnowledgeSnapshot } from '@/domain/models';
import { runtime } from '@/data/runtime';
import { supabase } from '@/lib/supabase';
import { pendingCaptureQueue, PendingLocalCapture } from '@/services/capture/PendingCaptureQueue';

const empty: KnowledgeSnapshot = { entities: [], relationships: [], timeline: [], captures: [] };
interface StoreValue {
  snapshot: KnowledgeSnapshot;
  loading: boolean;
  error?: string;
  mode: 'demo' | 'supabase';
  pendingCaptures: PendingLocalCapture[];
  interpret(rawText: string, inputType: Capture['inputType']): Promise<CaptureInterpretation>;
  retryPending(capture: PendingLocalCapture): Promise<CaptureInterpretation>;
  commit(interpretation: CaptureInterpretation): Promise<string | undefined>;
  updateEntity(entity: Entity): Promise<void>;
  resetDemo(): Promise<void>;
  entity(id: string): Entity | undefined;
  related(id: string): Entity[];
  search(query: string, type?: EntityType): Entity[];
}
const StoreContext = createContext<StoreValue | null>(null);

export function KortexProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [pendingCaptures, setPendingCaptures] = useState<PendingLocalCapture[]>([]);
  const [ownerId, setOwnerId] = useState('local-demo');

  const refreshPending = useCallback(async (id = ownerId) => setPendingCaptures(await pendingCaptureQueue.list(id)), [ownerId]);

  const load = useCallback(async () => {
    try { setSnapshot(await runtime.repository.load()); setError(undefined); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Kortex could not load.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void supabase?.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? 'local-demo';
      if (active) { setOwnerId(id); void pendingCaptureQueue.list(id).then(setPendingCaptures); }
    });
    runtime.repository.load().then(data => { if (active) { setSnapshot(data); setError(undefined); } }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Kortex could not load.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const performInterpretation = useCallback(async (rawText: string, inputType: Capture['inputType'], queued: PendingLocalCapture) => {
    setError(undefined);
    try {
      let captureId = queued.remoteCaptureId;
      if (!captureId) {
        const capture = await runtime.repository.createPendingCapture(rawText, inputType);
        captureId = capture.id;
        await pendingCaptureQueue.update(queued.id, { remoteCaptureId: captureId, lastError: undefined });
      }
      const result = await runtime.ai.interpret({ rawText, inputType, snapshot });
      const withCapture = { ...result, captureId };
      await runtime.repository.markCaptureReady(captureId, withCapture);
      await refreshPending();
      return withCapture;
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : 'Kortex could not organize this yet.';
      await pendingCaptureQueue.update(queued.id, { lastError: reason });
      await refreshPending();
      throw new Error('Saved on this iPhone. Kortex will organize it when you’re online.');
    }
  }, [refreshPending, snapshot]);

  const interpret = useCallback(async (rawText: string, inputType: Capture['inputType']) => {
    const queued = await pendingCaptureQueue.add(ownerId, rawText, inputType);
    await refreshPending();
    return performInterpretation(rawText, inputType, queued);
  }, [ownerId, performInterpretation, refreshPending]);

  const retryPending = useCallback(async (capture: PendingLocalCapture) => performInterpretation(capture.rawText, capture.inputType, capture), [performInterpretation]);

  const commit = useCallback(async (interpretation: CaptureInterpretation) => {
    const result = await runtime.repository.commitCapture(interpretation);
    setSnapshot(result.snapshot);
    await pendingCaptureQueue.removeForCapture(ownerId, interpretation.captureId);
    await refreshPending();
    return result.primaryEntityId;
  }, [ownerId, refreshPending]);

  const updateEntity = useCallback(async (entity: Entity) => { await runtime.repository.updateEntity(entity); await load(); }, [load]);
  const resetDemo = useCallback(async () => { if (runtime.repository.resetDemo) setSnapshot(await runtime.repository.resetDemo()); }, []);
  const value = useMemo<StoreValue>(() => ({
    snapshot, loading, error, mode: runtime.mode, pendingCaptures, interpret, retryPending, commit, updateEntity, resetDemo,
    entity: id => snapshot.entities.find(item => item.id === id),
    related: id => {
      const ids = new Set(snapshot.relationships.flatMap(edge => edge.sourceEntityId === id ? [edge.targetEntityId] : edge.targetEntityId === id ? [edge.sourceEntityId] : []));
      return snapshot.entities.filter(item => ids.has(item.id));
    },
    search: (query, filterType) => {
      const needle = query.trim().toLocaleLowerCase();
      return snapshot.entities.filter(item => (!filterType || item.type === filterType) && (!needle || [item.displayName, item.subtitle, item.summary, ...item.tags, ...item.fields.map(field => field.value)].filter(Boolean).join(' ').toLocaleLowerCase().includes(needle)));
    },
  }), [snapshot, loading, error, pendingCaptures, interpret, retryPending, commit, updateEntity, resetDemo]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useKortex() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useKortex must be used inside KortexProvider.');
  return value;
}
