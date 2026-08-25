import { StyleSheet, Text, View } from 'react-native';
import { EntityType } from '@/domain/models';
import { colors, type } from '@/design/tokens';
import { KortexSymbol } from './KortexSymbol';

const symbols = { contact: 'person.fill', company: 'building.2.fill', idea: 'sparkles', project: 'hexagon.fill', meeting: 'circle.dotted.circle.fill', document: 'doc.text.fill' } as const;
export function EntityGlyph({ entityType, size = 38 }: { entityType: EntityType; size?: number }) {
  const shape = entityType === 'company' ? styles.square : entityType === 'project' ? styles.hexLike : styles.circle;
  return <View style={[styles.base, shape, { width: size, height: size }]} accessibilityElementsHidden><KortexSymbol name={symbols[entityType]} size={size * .42} tint={entityType === 'idea' ? colors.warning : colors.cyan} /></View>;
}
export function EntityTypeLabel({ entityType }: { entityType: EntityType }) { return <Text style={styles.label}>{entityType.toUpperCase()}</Text>; }
const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.white04 },
  circle: { borderRadius: 999 }, square: { borderRadius: 11 }, hexLike: { borderRadius: 14, transform: [{ rotate: '8deg' }] }, label: { ...type.metadata, color: colors.textMuted },
});
