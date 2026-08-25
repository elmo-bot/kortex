import { useMemo } from 'react';
import { Pressable, SafeAreaView, SectionList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { TimelineEvent } from '@/domain/models';
import { useKortex } from '@/store/KortexStore';
import { colors, spacing, type } from '@/design/tokens';
import { ScreenHeader } from '@/components/ScreenHeader';
import { KortexSymbol } from '@/components/KortexSymbol';

export function ActivityScreen() {
  const { snapshot, pendingCaptures } = useKortex();
  const review = snapshot.timeline.filter(item => item.needsReview);
  const pending = pendingCaptures.filter(item => item.lastError);
  const sections = useMemo(() => groupEvents(snapshot.timeline), [snapshot.timeline]);
  return <SafeAreaView style={styles.safe}>
    <ScreenHeader eyebrow="MEMORY FORMING" title="Activity" />
    <SectionList sections={sections} keyExtractor={item => item.id} stickySectionHeadersEnabled={false} contentContainerStyle={styles.list}
      ListHeaderComponent={(review.length || pending.length) ? <View style={styles.attention}>
        <Text style={styles.attentionLabel}>NEEDS YOUR ATTENTION</Text>
        {pending.map(item => <View key={item.id} style={styles.reviewRow}><KortexSymbol name="iphone" size={18} tint={colors.warning} /><View style={{ flex: 1 }}><Text style={styles.reviewTitle}>Saved on this iPhone</Text><Text numberOfLines={1} style={styles.reviewDetail}>{item.rawText}</Text></View></View>)}
        {review.slice(0, 3).map(item => <Pressable key={item.id} onPress={() => item.entityId && router.push(`/entity/${item.entityId}`)} style={styles.reviewRow}><KortexSymbol name="questionmark" size={16} tint={colors.warning} /><View style={{ flex: 1 }}><Text style={styles.reviewTitle}>{item.title}</Text>{item.detail ? <Text style={styles.reviewDetail}>{item.detail}</Text> : null}</View><KortexSymbol name="chevron.right" size={14} tint={colors.textFaint} /></Pressable>)}
      </View> : null}
      renderSectionHeader={({ section }) => <Text style={styles.day}>{section.title.toUpperCase()}</Text>}
      renderItem={({ item, index }) => <MemoryEvent item={item} divided={index > 0} />}
      ListEmptyComponent={<View style={styles.empty}><KortexSymbol name="clock" size={28} tint={colors.textFaint} /><Text style={styles.emptyTitle}>Quiet for now</Text><Text style={styles.emptyText}>New memories and connections will form here.</Text></View>}
    />
  </SafeAreaView>;
}

function MemoryEvent({ item, divided }: { item: TimelineEvent; divided: boolean }) {
  const relation = item.kind === 'relationship';
  return <Pressable disabled={!item.entityId} onPress={() => item.entityId && router.push(`/entity/${item.entityId}`)} style={[styles.event, divided && styles.divider]}>
    <View style={styles.rail}><View style={[styles.dot, relation && styles.dotConnection, item.needsReview && styles.dotReview]} /></View>
    <View style={styles.eventBody}><Text style={styles.eventTitle}>{humanTitle(item)}</Text>{item.detail ? <Text style={styles.eventDetail}>{item.detail}</Text> : null}</View>
    <KortexSymbol name={relation ? 'link' : item.kind === 'decision' ? 'checkmark.seal' : item.kind === 'updated' ? 'arrow.triangle.2.circlepath' : 'plus'} size={16} tint={item.needsReview ? colors.warning : colors.textFaint} />
  </Pressable>;
}

function humanTitle(item: TimelineEvent) {
  if (item.kind === 'relationship' && !/connection/i.test(item.title)) return `${item.title} connected`;
  if (item.kind === 'created' && !/added|created/i.test(item.title)) return `${item.title} added`;
  return item.title;
}

function groupEvents(events: TimelineEvent[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const groups: Record<string, TimelineEvent[]> = { Today: [], Yesterday: [], Earlier: [] };
  events.forEach(item => { const date = new Date(item.occurredAt); const key = date >= today ? 'Today' : date >= yesterday ? 'Yesterday' : 'Earlier'; groups[key].push(item); });
  return Object.entries(groups).filter(([, data]) => data.length).map(([title, data]) => ({ title, data }));
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink }, list: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  attention: { marginBottom: spacing.xl, borderLeftWidth: 2, borderLeftColor: colors.warning, paddingLeft: spacing.md }, attentionLabel: { ...type.metadata, color: colors.warning, marginBottom: spacing.sm },
  reviewRow: { minHeight: 62, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, flexDirection: 'row', gap: 12, alignItems: 'center' }, reviewTitle: { ...type.section, color: colors.text }, reviewDetail: { ...type.callout, color: colors.textMuted, marginTop: 2 },
  day: { ...type.metadata, color: colors.cyan, marginTop: spacing.sm, marginBottom: spacing.sm }, event: { minHeight: 82, flexDirection: 'row', alignItems: 'center' }, divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  rail: { width: 24 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textFaint }, dotConnection: { backgroundColor: colors.cyan, shadowColor: colors.cyan, shadowOpacity: .65, shadowRadius: 5 }, dotReview: { backgroundColor: colors.warning },
  eventBody: { flex: 1 }, eventTitle: { ...type.section, color: colors.text }, eventDetail: { ...type.callout, color: colors.textMuted, marginTop: 3 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl }, emptyTitle: { ...type.section, color: colors.text, marginTop: spacing.md }, emptyText: { ...type.callout, color: colors.textMuted, marginTop: spacing.xs },
});
