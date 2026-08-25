import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { KortexSymbol } from '@/components/KortexSymbol';
import { colors, radius, spacing, type } from '@/design/tokens';
import { haptics } from '@/design/haptics';

export interface CaptureComposerHandle { toggleVoice(): void }
interface Props {
  busy: boolean;
  onSubmit(text: string, kind: 'text' | 'voice'): void;
  onListeningChange(active: boolean): void;
  onAmplitudeChange(value: number): void;
}

export const CaptureComposer = forwardRef<CaptureComposerHandle, Props>(function CaptureComposer({ busy, onSubmit, onListeningChange, onAmplitudeChange }, ref) {
  const [text, setText] = useState('');
  const [liveText, setLiveText] = useState('');
  const [message, setMessage] = useState<string>();
  const [listening, setListening] = useState(false);
  const [permissionPrompt, setPermissionPrompt] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const transcript = useRef('');
  const stopRequested = useRef(false);
  const submitted = useRef(false);

  const finish = () => {
    if (submitted.current) return;
    const finalText = transcript.current.trim();
    setListening(false); onListeningChange(false); onAmplitudeChange(0);
    if (!stopRequested.current || !finalText) {
      if (stopRequested.current) setMessage('I didn’t catch that. Try again or type your thought.');
      return;
    }
    submitted.current = true;
    onSubmit(finalText, 'voice');
  };

  useSpeechRecognitionEvent('result', event => {
    const value = event.results[0]?.transcript?.trim() ?? '';
    if (value) { transcript.current = value; setLiveText(value); }
    if (event.isFinal && stopRequested.current) finish();
  });
  useSpeechRecognitionEvent('volumechange', event => onAmplitudeChange(Math.max(0, Math.min(1, (event.value + 1) / 9))));
  useSpeechRecognitionEvent('error', event => {
    setListening(false); onListeningChange(false); onAmplitudeChange(0);
    if (event.error === 'aborted') return;
    setMessage(event.error === 'not-allowed' ? 'Microphone access is off. You can still type.' : 'Voice is unavailable right now. Your words were not stored.');
  });
  useSpeechRecognitionEvent('end', finish);

  const startRecognition = () => {
    transcript.current = ''; stopRequested.current = false; submitted.current = false;
    setLiveText(''); setMessage(undefined); setExpanded(false); Keyboard.dismiss();
    ExpoSpeechRecognitionModule.start({
      lang: Intl.DateTimeFormat().resolvedOptions().locale || 'en-US', interimResults: true, continuous: true,
      addsPunctuation: true, maxAlternatives: 1, contextualStrings: ['Kortex', 'Monitora'], iosTaskHint: 'dictation',
      recordingOptions: { persist: false }, volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
    });
    setListening(true); onListeningChange(true); haptics.beginCapture();
  };
  const begin = async () => {
    if (busy || listening) return;
    const permission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) { setPermissionPrompt(true); return; }
    if (!permission.granted) { setMessage('Microphone access is off. Open Settings to enable it.'); return; }
    startRecognition();
  };
  const allowAndBegin = async () => {
    setPermissionPrompt(false);
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (permission.granted) startRecognition();
    else setMessage('Microphone access is off. You can still type your thought.');
  };
  const stop = () => {
    if (!listening) return;
    stopRequested.current = true; haptics.endCapture();
    ExpoSpeechRecognitionModule.stop();
  };
  const toggleVoice = () => listening ? stop() : void begin();
  useImperativeHandle(ref, () => ({ toggleVoice }));
  const submitText = () => { const trimmed = text.trim(); if (!trimmed || busy) return; onSubmit(trimmed, 'text'); setText(''); Keyboard.dismiss(); };

  return <View style={styles.root}>
    <Text style={styles.prompt}>{listening ? 'Listening' : busy ? 'Understanding' : "What’s on your mind?"}</Text>
    {listening ? <Pressable onPress={() => setExpanded(value => !value)} style={styles.transcript} accessibilityRole="button" accessibilityLabel="Show full live transcript">
      <Text numberOfLines={expanded ? undefined : 3} style={styles.transcriptText}>{liveText || 'Start speaking…'}</Text>
      {liveText ? <Text style={styles.transcriptHint}>{expanded ? 'Show less' : 'Tap for full transcript'}</Text> : null}
    </Pressable> : <View style={styles.inputRow}>
      <TextInput value={text} onChangeText={setText} placeholder="Type a thought" placeholderTextColor={colors.textFaint} multiline maxLength={4000} editable={!busy} style={styles.input} accessibilityLabel="Text capture" returnKeyType="send" blurOnSubmit onSubmitEditing={submitText} />
      {text.trim() ? <Pressable onPress={submitText} style={styles.send} accessibilityRole="button" accessibilityLabel="Interpret text"><KortexSymbol name="arrow.up" tint={colors.ink} size={18} /></Pressable> : null}
    </View>}
    <Pressable disabled={busy} onPress={toggleVoice} style={({ pressed }) => [styles.voice, listening && styles.voiceActive, pressed && styles.voicePressed, busy && styles.disabled]} accessibilityRole="button" accessibilityLabel={listening ? 'Stop voice capture' : 'Start voice capture'}>
      <View style={[styles.voiceInner, listening && styles.voiceInnerActive]}>{listening ? <View style={styles.stop} /> : <KortexSymbol name="waveform" size={23} tint={colors.ink} />}</View>
    </Pressable>
    <Text style={styles.hint}>{listening ? 'Tap to finish' : busy ? 'Forming your memory' : 'Tap the Kortex or speak here'}</Text>
    {permissionPrompt ? <View style={styles.permission}>
      <Text style={styles.permissionText}>Kortex listens only while you capture a thought.</Text>
      <Pressable onPress={() => void allowAndBegin()} style={styles.permissionAction}><Text style={styles.permissionActionText}>Allow microphone</Text></Pressable>
    </View> : null}
    {message ? <View style={styles.notice}><Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>{message.includes('Settings') ? <Pressable onPress={() => void Linking.openSettings()}><Text style={styles.openSettings}>Open Settings</Text></Pressable> : null}</View> : null}
  </View>;
});

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: spacing.xl },
  prompt: { ...type.title, color: colors.text, marginBottom: spacing.lg },
  inputRow: { width: '100%', minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong, flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.lg },
  input: { flex: 1, maxHeight: 92, minHeight: 48, color: colors.text, ...type.body, paddingVertical: 12 },
  send: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ice, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  transcript: { width: '100%', minHeight: 74, justifyContent: 'flex-end', paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong, marginBottom: spacing.lg },
  transcriptText: { ...type.body, color: colors.text, textAlign: 'center' }, transcriptHint: { ...type.metadata, color: colors.textFaint, textAlign: 'center', marginTop: spacing.xs },
  voice: { width: 70, height: 70, borderRadius: 35, padding: 6, borderWidth: 1, borderColor: 'rgba(126,221,244,.28)' },
  voiceActive: { borderColor: 'rgba(126,221,244,.65)', shadowColor: colors.cyan, shadowOpacity: .26, shadowRadius: 18 },
  voiceInner: { flex: 1, borderRadius: radius.pill, backgroundColor: colors.ice, alignItems: 'center', justifyContent: 'center' }, voiceInnerActive: { backgroundColor: colors.cyan },
  voicePressed: { transform: [{ scale: .96 }] }, stop: { width: 16, height: 16, borderRadius: 4, backgroundColor: colors.ink }, disabled: { opacity: .4 },
  hint: { ...type.metadata, color: colors.textMuted, marginTop: spacing.sm },
  permission: { width: '100%', alignItems: 'center', marginTop: spacing.lg }, permissionText: { ...type.callout, color: colors.textMuted, textAlign: 'center' },
  permissionAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.sm }, permissionActionText: { ...type.callout, color: colors.cyan },
  notice: { alignItems: 'center', marginTop: spacing.md }, message: { ...type.callout, color: colors.warning, textAlign: 'center' }, openSettings: { ...type.callout, color: colors.cyan, marginTop: spacing.sm },
});
