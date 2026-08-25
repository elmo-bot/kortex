import { PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import { Session } from '@supabase/supabase-js';
import { KortexMark } from '@/components/KortexMark';
import { colors, radius, spacing, type } from '@/design/tokens';
import { haptics } from '@/design/haptics';
import { isDemoMode, isSupabaseConfigured, supabase } from '@/lib/supabase';

const introKey = 'kortex.first-launch.seen.v1';
type AuthMode = 'sign-in' | 'create';

export function AuthGate({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(isSupabaseConfigured);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    void client.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false); });
    const auth = client.auth.onAuthStateChange((_event, next) => setSession(next));
    const consumeLink = async (url: string) => {
      const code = new URL(url).searchParams.get('code');
      if (code) await client.auth.exchangeCodeForSession(code);
    };
    void Linking.getInitialURL().then(async url => { if (url) await consumeLink(url); });
    const links = Linking.addEventListener('url', event => void consumeLink(event.url));
    return () => { auth.data.subscription.unsubscribe(); links.remove(); };
  }, []);
  if (isDemoMode) return children;
  if (!isSupabaseConfigured) return <View style={styles.configuration}><KortexMark size={58} /><Text style={styles.configurationTitle}>Kortex isn’t configured</Text><Text style={styles.configurationText}>Add the public Supabase URL and publishable key to the app environment.</Text></View>;
  if (checking) return <View style={styles.center}><KortexMark size={58} /><ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.cyan} /></View>;
  if (!session) return <AuthExperience />;
  return children;
}

function AuthExperience() {
  const [introSeen, setIntroSeen] = useState<boolean>();
  const [mode, setMode] = useState<AuthMode>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const appleEnabled = process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === 'true';

  useEffect(() => { void AsyncStorage.getItem(introKey).then(value => setIntroSeen(value === 'true')); }, []);
  if (introSeen === undefined) return <View style={styles.center}><KortexMark size={58} /></View>;
  if (!introSeen) return <View style={styles.introPage}>
    <View style={styles.introHalo}><KortexMark size={76} /></View>
    <Text style={styles.brand}>KORTEX</Text>
    <Text style={styles.introTitle}>Your second memory starts here.</Text>
    <Pressable onPress={() => { void AsyncStorage.setItem(introKey, 'true'); setIntroSeen(true); haptics.wake(); }} style={({ pressed }) => [styles.primary, pressed && styles.pressed]} accessibilityRole="button">
      <Text style={styles.primaryText}>Continue</Text>
    </Pressable>
  </View>;

  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!supabase || !cleanEmail.includes('@')) return setMessage('Enter a valid email.');
    if (password.length < 8) return setMessage('Use at least 8 characters.');
    setBusy(true); setMessage(undefined);
    try {
      if (mode === 'create') {
        const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password, options: { emailRedirectTo: Linking.createURL('auth/callback') } });
        if (error) throw error;
        if (!data.session) setMessage('Check your email to confirm your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      }
    } catch (cause) { setMessage(readableAuthError(cause)); }
    finally { setBusy(false); }
  };
  const signInWithApple = async () => {
    if (!supabase) return;
    setBusy(true); setMessage(undefined);
    try {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
      if (error) throw error;
    } catch (cause) {
      if ((cause as { code?: string }).code !== 'ERR_REQUEST_CANCELED') setMessage(readableAuthError(cause));
    } finally { setBusy(false); }
  };
  const resetPassword = async () => {
    if (!supabase || !email.trim().includes('@')) return setMessage('Enter your email first.');
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL('auth/reset') });
    setMessage(error ? readableAuthError(error) : 'Password reset sent.'); setBusy(false);
  };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}>
    <View style={styles.authHeader}><KortexMark size={46} /><Text style={styles.brand}>KORTEX</Text></View>
    <Text style={styles.title}>{mode === 'create' ? 'Start your Kortex' : 'Welcome back'}</Text>
    <Text style={styles.subtle}>{mode === 'create' ? 'Your knowledge is private to your account.' : 'Continue where your memory left off.'}</Text>
    <View style={styles.fields}>
      <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" placeholder="Email" placeholderTextColor={colors.textFaint} style={styles.input} accessibilityLabel="Email address" />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} placeholder="Password" placeholderTextColor={colors.textFaint} style={styles.input} accessibilityLabel="Password" onSubmitEditing={() => void submit()} />
    </View>
    {message ? <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text> : null}
    <Pressable disabled={busy} onPress={() => void submit()} style={({ pressed }) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]} accessibilityRole="button">
      {busy ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.primaryText}>{mode === 'create' ? 'Create account' : 'Sign in'}</Text>}
    </Pressable>
    {appleEnabled && Platform.OS === 'ios' ? <AppleAuthentication.AppleAuthenticationButton buttonType={mode === 'create' ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE} cornerRadius={27} style={styles.apple} onPress={() => void signInWithApple()} /> : null}
    {mode === 'sign-in' ? <Pressable onPress={() => void resetPassword()} hitSlop={12}><Text style={styles.link}>Forgot password?</Text></Pressable> : null}
    <Pressable onPress={() => { setMode(value => value === 'create' ? 'sign-in' : 'create'); setMessage(undefined); }} hitSlop={12}>
      <Text style={styles.switch}>{mode === 'create' ? 'Already have a Kortex?  Sign in' : 'New to Kortex?  Create account'}</Text>
    </Pressable>
  </KeyboardAvoidingView>;
}

function readableAuthError(cause: unknown) {
  const raw = cause instanceof Error ? cause.message : 'Could not continue.';
  if (/invalid login/i.test(raw)) return 'Email or password is incorrect.';
  if (/already registered/i.test(raw)) return 'This email already has an account.';
  if (/network|fetch/i.test(raw)) return 'No connection. Try again when you’re online.';
  return raw;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  configuration: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.ink }, configurationTitle: { ...type.title, color: colors.text, marginTop: spacing.lg }, configurationText: { ...type.callout, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  introPage: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.xl, paddingBottom: 58, backgroundColor: colors.ink },
  introHalo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, backgroundColor: colors.ink },
  authHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxl },
  brand: { ...type.metadata, color: colors.cyan, letterSpacing: 2 },
  introTitle: { ...type.hero, fontSize: 34, lineHeight: 40, color: colors.text, maxWidth: 310, marginBottom: spacing.xxl },
  title: { ...type.hero, color: colors.text }, subtle: { ...type.body, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl },
  fields: { marginBottom: spacing.md }, input: { minHeight: 57, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong, color: colors.text, ...type.body },
  message: { ...type.callout, color: colors.warning, marginBottom: spacing.md },
  primary: { minHeight: 56, borderRadius: radius.pill, backgroundColor: colors.ice, alignItems: 'center', justifyContent: 'center' }, primaryText: { ...type.callout, fontWeight: '600', color: colors.ink },
  apple: { width: '100%', height: 56, marginTop: spacing.sm },
  link: { ...type.callout, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  switch: { ...type.callout, color: colors.text, textAlign: 'center', marginTop: spacing.xl },
  pressed: { opacity: .84, transform: [{ scale: .99 }] }, disabled: { opacity: .55 },
});
