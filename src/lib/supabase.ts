import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const isDemoMode = process.env.EXPO_PUBLIC_KORTEX_MODE === 'demo';
export const isSupabaseConfigured = Boolean(url && key && process.env.EXPO_PUBLIC_KORTEX_MODE === 'supabase');
export const supabase = url && key ? createClient(url, key, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
  global: { headers: { 'x-kortex-client': 'ios-expo' } },
}) : null;
