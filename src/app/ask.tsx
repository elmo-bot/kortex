import { useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useKortex } from '@/store/KortexStore';
import { colors, radius, spacing, type } from '@/design/tokens';
import { EntityGlyph } from '@/components/EntityGlyph';
import { KortexSymbol } from '@/components/KortexSymbol';
import { askKortex, KortexAnswer } from '@/services/ai/KortexQueryService';

export default function AskKortexScreen() {
  const { entityId } = useLocalSearchParams<{ entityId?: string }>();
  const { entity } = useKortex(); const context = entityId ? entity(entityId) : undefined;
  const [question, setQuestion] = useState(''); const [answer, setAnswer] = useState<KortexAnswer>(); const [searching, setSearching] = useState(false); const [message, setMessage] = useState<string>();
  const references = useMemo(() => answer?.entityIds.map(id => entity(id)).filter((item): item is NonNullable<typeof item> => Boolean(item)) ?? [], [answer, entity]);
  const submit = async () => {
    const value = question.trim(); if (!value || searching) return;
    Keyboard.dismiss(); setSearching(true); setAnswer(undefined); setMessage(undefined);
    try { setAnswer(await askKortex(value, context?.id)); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Kortex could not answer right now.'); }
    finally { setSearching(false); }
  };
  return <SafeAreaView style={styles.safe}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>YOUR KNOWLEDGE</Text><Text style={styles.title}>Ask Kortex</Text></View><Pressable onPress={() => router.back()} style={styles.close} accessibilityLabel="Close"><KortexSymbol name="xmark" tint={colors.textMuted} /></Pressable></View>
    {context ? <View style={styles.context}><EntityGlyph entityType={context.type} size={34} /><View style={{ flex: 1 }}><Text style={styles.contextLabel}>IN CONTEXT</Text><Text style={styles.contextName}>{context.displayName}</Text></View></View> : null}
    <View style={styles.inputWrap}><TextInput autoFocus value={question} onChangeText={setQuestion} multiline style={styles.input} placeholder={context ? `What do you want to know about ${context.displayName.split(' ')[0]}?` : 'Ask about what you know'} placeholderTextColor={colors.textFaint} accessibilityLabel="Question for Kortex" /><Pressable onPress={() => void submit()} disabled={!question.trim() || searching} style={[styles.send, (!question.trim() || searching) && styles.disabled]} accessibilityLabel="Ask Kortex"><KortexSymbol name="arrow.up" tint={colors.ink} /></Pressable></View>
    {searching ? <View style={styles.progress}><ActivityIndicator color={colors.cyan} /><Text style={styles.progressText}>Searching your Kortex</Text></View> : null}
    {message ? <View style={styles.notice}><Text style={styles.noticeTitle}>Couldn’t search right now</Text><Text style={styles.noticeText}>{message}</Text><Pressable onPress={() => void submit()}><Text style={styles.retry}>Try again</Text></Pressable></View> : null}
    {answer ? <View style={styles.answer}>
      <Text style={styles.found}>{references.length ? `${references.length} MEMORIES FOUND` : 'KORTEX MEMORY'}</Text>
      {references.map(item => <Pressable key={item.id} onPress={() => router.push(`/entity/${item.id}`)} style={styles.reference}><EntityGlyph entityType={item.type} size={34} /><View style={{ flex: 1 }}><Text style={styles.referenceName}>{item.displayName}</Text><Text numberOfLines={1} style={styles.referenceSub}>{item.subtitle ?? item.type}</Text></View><KortexSymbol name="chevron.right" size={14} tint={colors.textFaint} /></Pressable>)}
      <Text style={styles.answerText}>{answer.answer}</Text>
      {answer.evidence.map((item, index) => <View key={`${item.text}-${index}`} style={styles.evidence}><Text style={item.source === 'memory' ? styles.memory : styles.inference}>{item.source === 'memory' ? 'KORTEX MEMORY' : 'INFERENCE'}</Text><Text style={styles.evidenceText}>{item.text}</Text></View>)}
    </View> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.inkRaised }, content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center' }, eyebrow: { ...type.metadata, color: colors.cyan }, title: { ...type.hero, color: colors.text, marginTop: 4 }, close: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  context: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.xl, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, contextLabel: { ...type.metadata, color: colors.success }, contextName: { ...type.callout, color: colors.text, marginTop: 2 },
  inputWrap: { minHeight: 100, flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.lineStrong, paddingBottom: spacing.sm }, input: { flex: 1, ...type.body, color: colors.text, maxHeight: 140 }, send: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.ice, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: .38 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.xl }, progressText: { ...type.callout, color: colors.textMuted },
  notice: { paddingVertical: spacing.xl }, noticeTitle: { ...type.section, color: colors.text }, noticeText: { ...type.callout, color: colors.textMuted, marginTop: 4 }, retry: { ...type.callout, color: colors.cyan, marginTop: spacing.md },
  answer: { marginTop: spacing.xl }, found: { ...type.metadata, color: colors.cyan, marginBottom: spacing.sm }, reference: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, referenceName: { ...type.callout, color: colors.text }, referenceSub: { ...type.callout, fontSize: 12, color: colors.textMuted },
  answerText: { ...type.body, fontSize: 17, lineHeight: 26, color: colors.text, marginTop: spacing.xl }, evidence: { marginTop: spacing.md }, memory: { ...type.metadata, color: colors.success }, inference: { ...type.metadata, color: colors.inferred }, evidenceText: { ...type.callout, color: colors.textMuted, marginTop: 3 },
});
