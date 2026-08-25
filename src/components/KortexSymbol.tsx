import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';
import { colors } from '@/design/tokens';

export function KortexSymbol({ name, size = 20, tint = colors.text, style }: { name: SymbolViewProps['name']; size?: number; tint?: string; style?: StyleProp<ViewStyle> }) {
  return <SymbolView name={name} tintColor={tint} size={size} resizeMode="scaleAspectFit" style={style} />;
}
