import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { colors } from '@/design/tokens';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={colors.inkRaised}
      tintColor={colors.cyan}
      indicatorColor="rgba(126,221,244,.08)"
      labelStyle={{ default: { color: colors.textFaint }, selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Kortex</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'brain.head.profile', selected: 'brain.head.profile.fill' }} md={{ default: 'neurology', selected: 'neurology' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="brain">
        <NativeTabs.Trigger.Label>Brain</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.stack.3d.up', selected: 'square.stack.3d.up.fill' }} md={{ default: 'stacks', selected: 'stacks' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="connections">
        <NativeTabs.Trigger.Label>Connections</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'point.3.connected.trianglepath.dotted', selected: 'point.3.filled.connected.trianglepath.dotted' }} md={{ default: 'hub', selected: 'hub' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} md={{ default: 'history', selected: 'history' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
