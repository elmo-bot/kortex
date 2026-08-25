import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CaptureInterpretation, ProposedRelationship } from '@/domain/models';
import { colors, motion, radius, spacing, type } from '@/design/tokens';
import { EntityGlyph, EntityTypeLabel } from '@/components/EntityGlyph';
import { KortexSymbol } from '@/components/KortexSymbol';

export function CaptureReceipt({ interpretation, saving, onSave, onChange, onDismiss }: { interpretation: CaptureInterpretation; saving: boolean; onSave(): void; onChange(value: CaptureInterpretation): void; onDismiss(): void }) {
  const [editing, setEditing] = useState(false);
  const [translateY] = useState(() => new Animated.Value(32));
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => { Animated.parallel([
    Animated.spring(translateY, { toValue: 0, damping: 24, stiffness: 230, mass: .86, useNativeDriver: true }),
    Animated.timing(opacity, { toValue: 1, duration: motion.standard, useNativeDriver: true }),
  ]).start(); }, [opacity, translateY]);
  const found = interpretation.entities.length + interpretation.followUps.length;
  const nameFor = (id?: string) => interpretation.entities.find(item => item.temporaryId === id || item.existingEntityId === id)?.displayName;
  const relationshipCopy = (edge: ProposedRelationship) => {
    const source = nameFor(edge.sourceTemporaryId ?? edge.sourceExistingId) ?? 'Related memory';
    const target = nameFor(edge.targetTemporaryId ?? edge.targetExistingId) ?? 'Existing knowledge';
    return `${source}  →  ${edge.type.replaceAll('_', ' ')}  →  ${target}`;
  };
  return <View style={styles.overlay} accessibilityViewIsModal>
    <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Close capture result" />
    <Animated.View style={[styles.sheet, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.handle} />
      <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>UNDERSTOOD</Text><Text style={styles.title}>I found {found} {found === 1 ? 'thing' : 'things'}</Text>{interpretation.summary ? <Text style={styles.summary}>{interpretation.summary}</Text> : null}</View><Pressable onPress={onDismiss} style={styles.close} accessibilityLabel="Close"><KortexSymbol name="xmark" tint={colors.textMuted} /></Pressable></View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {interpretation.entities.map((entity, index) => <View key={entity.temporaryId} style={[styles.entity, index > 0 && styles.divider]}>
          <EntityGlyph entityType={entity.type} />
          <View style={styles.entityText}>
            {editing && entity.operation !== 'reference' ? <TextInput value={entity.displayName} onChangeText={displayName => onChange({ ...interpretation, entities: interpretation.entities.map(item => item.temporaryId === entity.temporaryId ? { ...item, displayName } : item) })} style={styles.entityInput} accessibilityLabel={`Correct ${entity.type} name`} /> : <Text style={styles.entityName}>{entity.displayName}</Text>}
            <View style={styles.meta}><EntityTypeLabel entityType={entity.type} /><Text style={[styles.operation, entity.needsReview && styles.review]}>{entity.needsReview ? 'POSSIBLE MATCH' : entity.operation === 'reference' ? 'RELATED' : entity.operation === 'update' ? 'UPDATED' : 'NEW'}</Text></View>
            {entity.needsReview && entity.matchReason ? <Text style={styles.match}>{entity.matchReason}</Text> : null}
          </View>
        </View>)}
        {interpretation.relationships.length ? <View style={styles.relationships}>
          <View style={styles.relationshipHeader}><KortexSymbol name="point.3.connected.trianglepath.dotted" tint={colors.cyan} /><Text style={styles.relationshipLabel}>{interpretation.relationships.length} CONNECTION{interpretation.relationships.length === 1 ? '' : 'S'} FOUND</Text></View>
          {interpretation.relationships.map((edge, index) => <Text key={`${edge.type}-${index}`} style={styles.relationshipText}>{relationshipCopy(edge)}</Text>)}
        </View> : null}
        {interpretation.followUps.map(follow => <View key={follow.description} style={styles.follow}><KortexSymbol name="calendar.badge.clock" tint={colors.warning} /><View><Text style={styles.followTitle}>{follow.description}</Text><Text style={styles.followDate}>{follow.dateInterpretation}</Text></View></View>)}
        {interpretation.clarifications.map(item => <View key={item.id} style={styles.clarification}><Text style={styles.clarificationLabel}>NEEDS YOUR INPUT</Text><Text style={styles.question}>{item.question}</Text><Text style={styles.ignore}>{item.optional ? 'You can finish this later.' : 'Adjust before saving.'}</Text></View>)}
      </ScrollView>
      <Pressable onPress={onSave} disabled={saving} style={({ pressed }) => [styles.save, pressed && styles.pressed, saving && styles.disabled]} accessibilityRole="button"><Text style={styles.saveText}>{saving ? 'Saving' : 'Save to Kortex'}</Text></Pressable>
      <Pressable onPress={() => setEditing(value => !value)} style={styles.adjust} accessibilityRole="button"><Text style={styles.adjustText}>{editing ? 'Done' : 'Adjust'}</Text></Pressable>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, zIndex: 40, backgroundColor: 'rgba(2,8,12,.64)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.inkRaised, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong },
  handle: { width: 34, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center', marginTop: 9, marginBottom: spacing.lg },
  header: { flexDirection: 'row', marginBottom: spacing.md }, eyebrow: { ...type.metadata, color: colors.cyan, marginBottom: 4 }, title: { ...type.title, color: colors.text }, summary: { ...type.callout, color: colors.textMuted, marginTop: 5 },
  close: { marginLeft: spacing.sm, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, scroll: { flexGrow: 0 }, scrollContent: { paddingBottom: spacing.md },
  entity: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 13 }, divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }, entityText: { flex: 1 },
  entityName: { ...type.section, color: colors.text, marginBottom: 4 }, entityInput: { ...type.section, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.cyan, paddingVertical: 3, marginBottom: 4 },
  meta: { flexDirection: 'row', gap: 8 }, operation: { ...type.metadata, color: colors.success }, review: { color: colors.warning }, match: { ...type.callout, color: colors.textMuted, marginTop: 5 },
  relationships: { paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }, relationshipHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.sm }, relationshipLabel: { ...type.metadata, color: colors.cyan }, relationshipText: { ...type.callout, color: colors.text, marginLeft: 28, marginBottom: spacing.xs, textTransform: 'capitalize' },
  follow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }, followTitle: { ...type.callout, color: colors.text }, followDate: { ...type.metadata, color: colors.warning, marginTop: 3 },
  clarification: { marginVertical: spacing.sm, borderLeftWidth: 2, borderLeftColor: colors.warning, paddingLeft: spacing.md, paddingVertical: spacing.xs }, clarificationLabel: { ...type.metadata, color: colors.warning }, question: { ...type.body, color: colors.text, marginTop: 5 }, ignore: { ...type.callout, color: colors.textMuted, marginTop: 3 },
  save: { minHeight: 54, borderRadius: radius.pill, backgroundColor: colors.ice, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md }, saveText: { ...type.callout, fontWeight: '600', color: colors.ink },
  adjust: { minHeight: 46, alignItems: 'center', justifyContent: 'center' }, adjustText: { ...type.callout, color: colors.textMuted }, pressed: { opacity: .82, transform: [{ scale: .99 }] }, disabled: { opacity: .5 },
});
