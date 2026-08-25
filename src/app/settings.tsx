import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { User } from '@supabase/supabase-js';
import { useKortex } from '@/store/KortexStore';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing, type } from '@/design/tokens';
import { KortexSymbol } from '@/components/KortexSymbol';

export default function SettingsScreen() {
  const { mode, resetDemo, snapshot } = useKortex();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const identity = useMemo(() => {
    if (mode === 'demo') return { name: 'Demo workspace', detail: 'Local development data' };
    const metadataName = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
    return { name: typeof metadataName === 'string' && metadataName.trim() ? metadataName : 'Your Kortex', detail: user?.email ?? 'Private workspace' };
  }, [mode, user]);

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Text style={styles.eyebrow}>KORTEX</Text><Text style={styles.title}>Profile & settings</Text>
    <View style={styles.identity}><View style={styles.avatar}><KortexSymbol name="person.fill" size={25} tint={colors.cyan} /></View><View style={styles.identityText}><Text style={styles.name} numberOfLines={1}>{identity.name}</Text><Text style={styles.accountDetail} numberOfLines={1}>{identity.detail}</Text><Text style={styles.meta}>{snapshot.entities.length} memories · {snapshot.relationships.length} connections</Text></View></View>
    <Text style={styles.section}>PRIVACY</Text><Setting icon="lock.shield" title="Owner-isolated knowledge" detail="Every Supabase row is protected by Row Level Security." /><Setting icon="waveform.badge.mic" title="Voice retention" detail="Recordings stay in temporary OS cache and are not kept by Kortex." /><Setting icon="eye.slash" title="Minimal diagnostics" detail="Transcripts and personal knowledge are excluded from logs." />
    <Text style={styles.section}>EXPERIENCE</Text><Setting icon="figure.walk.motion" title="Reduced Motion" detail="Kortex follows the iOS accessibility setting automatically." /><Setting icon="list.bullet" title="Accessible graph" detail="Connections includes a complete structured list alternative." />
    {__DEV__ ? <><Text style={styles.section}>DEVELOPMENT</Text><Pressable onPress={() => router.push('/debug')} style={styles.action}><Text style={styles.actionText}>Inspect capture pipeline</Text><KortexSymbol name="chevron.right" size={14} tint={colors.textFaint} /></Pressable>{mode === 'demo' ? <Pressable onPress={() => void resetDemo()} style={styles.action}><Text style={[styles.actionText, { color: colors.warning }]}>Reset demo fixture</Text></Pressable> : null}</> : null}
    {mode === 'supabase' ? <Pressable onPress={() => void supabase?.auth.signOut()} style={styles.signOut}><Text style={styles.signOutText}>Sign out</Text></Pressable> : null}
  </ScrollView></SafeAreaView>;
}
function Setting({ icon, title, detail }: { icon: Parameters<typeof KortexSymbol>[0]['name']; title: string; detail: string }) { return <View style={styles.setting}><KortexSymbol name={icon} tint={colors.textMuted} /><View style={{ flex: 1 }}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingDetail}>{detail}</Text></View></View>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.inkRaised }, content: { padding: spacing.lg, paddingBottom: spacing.xxl }, eyebrow: { ...type.metadata, color: colors.cyan }, title: { ...type.hero, color: colors.text, marginTop: 4 }, identity: { flexDirection: 'row', gap: 13, alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg }, identityText: { flex: 1 }, avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.white04, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' }, name: { ...type.section, color: colors.text }, accountDetail: { ...type.callout, color: colors.textMuted, marginTop: 2 }, meta: { ...type.metadata, color: colors.textFaint, marginTop: 4 }, section: { ...type.metadata, color: colors.textFaint, marginTop: spacing.xl, marginBottom: spacing.sm }, setting: { flexDirection: 'row', gap: 13, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, settingTitle: { ...type.callout, color: colors.text }, settingDetail: { ...type.callout, color: colors.textMuted, marginTop: 3 }, action: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, actionText: { ...type.callout, color: colors.text }, signOut: { height: 50, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl }, signOutText: { ...type.callout, color: colors.text } });
