import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/design/tokens';
import { AuthGate } from '@/features/auth/AuthGate';
import { KortexProvider } from '@/store/KortexStore';

SplashScreen.preventAutoHideAsync();

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, primary: colors.cyan, background: colors.ink, card: colors.inkRaised, text: colors.text, border: colors.line, notification: colors.warning } };
export default function RootLayout() {
  useEffect(() => { void SplashScreen.hideAsync(); }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ink }}>
      <ThemeProvider value={theme}><StatusBar style="light" /><AuthGate><KortexProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink }, animation: 'fade_from_bottom' }}><Stack.Screen name="(tabs)" /><Stack.Screen name="entity/[id]" options={{ animation: 'slide_from_right' }} /><Stack.Screen name="ask" options={{ presentation: 'formSheet', sheetGrabberVisible: true }} /><Stack.Screen name="settings" options={{ presentation: 'formSheet', sheetGrabberVisible: true }} /><Stack.Screen name="debug" options={{ presentation: 'modal' }} /></Stack></KortexProvider></AuthGate></ThemeProvider>
    </GestureHandlerRootView>
  );
}
