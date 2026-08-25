import { Platform } from 'react-native';

export const colors = {
  ink: '#061018', inkRaised: '#0A1721', surface: '#0E1D28', surfaceSoft: '#122632',
  line: 'rgba(183, 223, 238, 0.13)', lineStrong: 'rgba(179, 231, 247, 0.26)',
  text: '#F2F7F8', textMuted: '#91A7B2', textFaint: '#607680',
  cyan: '#7EDDF4', cyanStrong: '#38B9DA', ice: '#D7F7FF', success: '#8AD8BC',
  warning: '#E9C987', danger: '#EE9B9B', inferred: '#A7B7F1',
  white08: 'rgba(255,255,255,0.08)', white04: 'rgba(255,255,255,0.04)',
} as const;

export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, xxl: 44 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const motion = {
  micro: 150, interface: 300, spatial: 480,
  quick: 150, standard: 300, resolved: 480,
  spring: { damping: 24, stiffness: 220, mass: 0.82 },
} as const;
export const type = {
  hero: { fontSize: 31, lineHeight: 36, fontWeight: '600' as const, letterSpacing: -0.8 },
  title: { fontSize: 23, lineHeight: 29, fontWeight: '600' as const, letterSpacing: -0.35 },
  section: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  callout: { fontSize: 14, lineHeight: 19, fontWeight: '500' as const },
  metadata: { fontFamily: Platform.select({ ios: 'SFMono-Medium', default: 'monospace' }), fontSize: 11, lineHeight: 15, fontWeight: '500' as const, letterSpacing: 0.7 },
} as const;
