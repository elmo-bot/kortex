import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, type } from '@/design/tokens';
import { KortexSymbol } from './KortexSymbol';

export function ScreenHeader({ eyebrow, title, action = true }: { eyebrow?: string; title: string; action?: boolean }) {
  return <View style={styles.row}><View style={styles.text}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text></View>{action ? <Pressable onPress={() => router.push('/settings')} style={styles.profile} accessibilityRole="button" accessibilityLabel="Profile and settings"><KortexSymbol name="person.crop.circle" size={28} tint={colors.textMuted} /></Pressable> : null}</View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md }, text: { flex: 1 }, eyebrow: { ...type.metadata, color: colors.cyan, marginBottom: 3 }, title: { ...type.title, color: colors.text }, profile: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' } });
