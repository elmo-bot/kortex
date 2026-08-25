import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '@/design/tokens';

export function KortexMark({ size = 42, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const core = Math.max(6, Math.round(size * .16));
  return <View style={[styles.mark, { width: size, height: size, borderRadius: size / 2 }, style]} accessible={false}>
    <View style={[styles.orbit, { width: size * .64, height: size * .42, borderRadius: size / 2 }]} />
    <View style={[styles.orbit, styles.orbitTurned, { width: size * .64, height: size * .42, borderRadius: size / 2 }]} />
    <View style={[styles.core, { width: core, height: core, borderRadius: core / 2 }]} />
  </View>;
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', borderWidth: 1, borderColor: colors.lineStrong, transform: [{ rotate: '28deg' }] },
  orbitTurned: { transform: [{ rotate: '-28deg' }], borderColor: 'rgba(126,221,244,.35)' },
  core: { backgroundColor: colors.cyan, shadowColor: colors.cyan, shadowOpacity: .75, shadowRadius: 9 },
});
