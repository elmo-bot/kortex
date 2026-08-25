import { useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Entity, EntityType, entityTypes } from '@/domain/models';
import { useKortex } from '@/store/KortexStore';
import { colors, radius, spacing, type } from '@/design/tokens';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EntityGlyph, EntityTypeLabel } from '@/components/EntityGlyph';
import { KortexSymbol } from '@/components/KortexSymbol';

const plural: Record<EntityType, string> = { contact: 'People', company: 'Companies', idea: 'Ideas', project: 'Projects', meeting: 'Meetings', document: 'Documents' };
export function BrainBrowserScreen() {
  const { search, snapshot, loading } = useKortex();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<EntityType>();
  const data = useMemo(() => search(query, filter).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [search, query, filter]);
  return <SafeAreaView style={styles.safe}>
    <ScreenHeader eyebrow="YOUR KNOWLEDGE" title="Brain" />
    <View style={styles.search}><KortexSymbol name="magnifyingglass" tint={colors.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Find what you know" placeholderTextColor={colors.textFaint} style={styles.searchInput} accessibilityLabel="Search your Kortex" clearButtonMode="while-editing" /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      <Filter label="Recent" selected={!filter} onPress={() => setFilter(undefined)} />
      {entityTypes.map(item => <Filter key={item} label={plural[item]} selected={filter === item} onPress={() => setFilter(item)} />)}
    </ScrollView>
    <View style={styles.listHeader}><Text style={styles.result}>{loading ? 'LOADING' : query ? `${data.length} FOUND` : filter ? plural[filter].toUpperCase() : 'RECENTLY REMEMBERED'}</Text>{!query && !filter ? <Text style={styles.sort}>{snapshot.entities.length} total</Text> : null}</View>
    <FlatList data={data} keyExtractor={item => item.id} contentContainerStyle={styles.list} renderItem={({ item, index }) => <EntityRow entity={item} divided={index > 0} />} ListEmptyComponent={<View style={styles.empty}><KortexSymbol name="brain.head.profile" size={36} tint={colors.textFaint} /><Text style={styles.emptyTitle}>Nothing found</Text><Text style={styles.emptyText}>Try a name, a tag, or what the memory is about.</Text></View>} />
  </SafeAreaView>;
}
function Filter({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) { return <Pressable onPress={onPress} style={[styles.filter, selected && styles.filterSelected]}><Text style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text></Pressable>; }
function EntityRow({ entity, divided }: { entity: Entity; divided: boolean }) { return <Pressable onPress={() => router.push(`/entity/${entity.id}`)} style={({ pressed }) => [styles.row, divided && styles.rowDivider, pressed && { opacity: .6 }]} accessibilityRole="button" accessibilityLabel={`Open ${entity.displayName}, ${entity.type}`}>
  <EntityGlyph entityType={entity.type} size={42} /><View style={styles.rowText}><Text style={styles.name}>{entity.displayName}</Text><Text numberOfLines={1} style={styles.subtitle}>{entity.subtitle ?? entity.summary ?? 'Captured in Kortex'}</Text><View style={styles.meta}><EntityTypeLabel entityType={entity.type} />{entity.needsReview ? <Text style={styles.review}>NEEDS REVIEW</Text> : null}</View></View><KortexSymbol name="chevron.right" size={15} tint={colors.textFaint} />
</Pressable>; }
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink }, search: { marginHorizontal: spacing.lg, minHeight: 52, borderRadius: radius.md, backgroundColor: colors.white04, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 }, searchInput: { flex: 1, color: colors.text, ...type.body }, filters: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.lg }, filter: { height: 34, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' }, filterSelected: { borderBottomColor: colors.cyan }, filterText: { ...type.callout, fontSize: 13, color: colors.textFaint }, filterTextSelected: { color: colors.text }, listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }, result: { ...type.metadata, color: colors.cyan }, sort: { ...type.callout, fontSize: 12, color: colors.textFaint }, list: { paddingHorizontal: spacing.lg, paddingBottom: 120 }, row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 13 }, rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }, rowText: { flex: 1 }, name: { ...type.section, color: colors.text }, subtitle: { ...type.callout, color: colors.textMuted, marginTop: 2 }, meta: { flexDirection: 'row', gap: 9, marginTop: 5 }, review: { ...type.metadata, color: colors.warning }, empty: { alignItems: 'center', padding: spacing.xxl }, emptyTitle: { ...type.section, color: colors.text, marginTop: spacing.md }, emptyText: { ...type.callout, color: colors.textMuted, textAlign: 'center', marginTop: 5 },
});
