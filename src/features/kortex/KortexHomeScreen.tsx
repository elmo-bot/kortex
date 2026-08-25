import { useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { KortexMark } from '@/components/KortexMark';
import { KortexSymbol } from '@/components/KortexSymbol';
import { colors, spacing, type } from '@/design/tokens';
import { haptics } from '@/design/haptics';
import { CaptureInterpretation } from '@/domain/models';
import { useKortex } from '@/store/KortexStore';
import { BrainScene, BrainState } from './BrainScene';
import { CaptureComposer, CaptureComposerHandle } from '../capture/CaptureComposer';
import { CaptureReceipt } from '../capture/CaptureReceipt';

export function KortexHomeScreen() {
  const { height, width } = useWindowDimensions();
  const { interpret, retryPending, commit, pendingCaptures } = useKortex();
  const composer = useRef<CaptureComposerHandle>(null);
  const [brainState, setBrainState] = useState<BrainState>('idle');
  const [amplitude, setAmplitude] = useState(0);
  const [result, setResult] = useState<CaptureInterpretation>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string>();
  const waiting = useMemo(() => pendingCaptures.filter(item => item.lastError), [pendingCaptures]);
  const brainHeight = Math.max(275, Math.min(370, height * .39, width * .92));

  const showInterpretation = (interpretation: CaptureInterpretation) => {
    setBrainState(interpretation.relationships.length ? 'connecting' : 'complete');
    if (interpretation.relationships.length) setTimeout(() => setBrainState('complete'), 620);
    setResult(interpretation); setNotice(undefined);
  };
  const submit = async (text: string, inputType: 'text' | 'voice') => {
    setBrainState('understanding'); setNotice(undefined);
    try { showInterpretation(await interpret(text, inputType)); }
    catch (cause) { setBrainState('idle'); setNotice(cause instanceof Error ? cause.message : 'Saved on this iPhone.'); haptics.warning(); }
  };
  const retry = async () => {
    const capture = waiting[0]; if (!capture) return;
    setBrainState('understanding'); setNotice(undefined);
    try { showInterpretation(await retryPending(capture)); }
    catch (cause) { setBrainState('idle'); setNotice(cause instanceof Error ? cause.message : 'Still saved on this iPhone.'); }
  };
  const save = async () => {
    if (!result) return;
    setSaving(true); setNotice(undefined);
    try {
      const id = await commit(result); haptics.saved(); setResult(undefined); setBrainState('idle');
      if (id) router.push(`/entity/${id}`);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Not saved yet. Your capture is still safe.'); }
    finally { setSaving(false); }
  };

  return <SafeAreaView style={styles.safe}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={styles.header}>
        <View style={styles.identity}><KortexMark size={28} /><Text style={styles.wordmark}>KORTEX</Text></View>
        <Pressable onPress={() => router.push('/settings')} style={styles.profile} accessibilityRole="button" accessibilityLabel="Profile and settings"><KortexSymbol name="person.crop.circle" size={27} tint={colors.textMuted} /></Pressable>
      </View>
      <BrainScene state={brainState} amplitude={amplitude} height={brainHeight} onTap={() => composer.current?.toggleVoice()} />
      <CaptureComposer ref={composer} busy={brainState === 'understanding' || brainState === 'connecting'} onSubmit={submit} onListeningChange={active => setBrainState(active ? 'listening' : 'idle')} onAmplitudeChange={setAmplitude} />
      {(notice || waiting.length) ? <View style={styles.offlineNotice}>
        <View style={styles.noticeLine}><KortexSymbol name="checkmark" size={14} tint={colors.warning} /><Text style={styles.noticeTitle}>{notice ?? 'Saved on this iPhone'}</Text></View>
        {waiting.length ? <Pressable onPress={() => void retry()} disabled={brainState !== 'idle'} hitSlop={10}><Text style={styles.retry}>Try organizing now</Text></Pressable> : null}
      </View> : null}
      <View style={styles.bottomSpace} />
    </ScrollView>
    {result ? <CaptureReceipt interpretation={result} saving={saving} onSave={save} onChange={setResult} onDismiss={() => { setResult(undefined); setBrainState('idle'); }} /> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink }, content: { minHeight: '100%' },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, wordmark: { ...type.metadata, color: colors.text, letterSpacing: 1.8 },
  profile: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  offlineNotice: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.lg }, noticeLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  noticeTitle: { ...type.callout, color: colors.warning, textAlign: 'center' }, retry: { ...type.callout, color: colors.cyan, marginTop: spacing.sm },
  bottomSpace: { height: 118 },
});
