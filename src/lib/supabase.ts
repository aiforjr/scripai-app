import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { Database } from '@/src/types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY — set them in .env.local',
  );
}

// SecureStore has a 2048-byte value limit on some platforms; Supabase sessions can
// exceed that, so chunk large values across multiple keys. Web just uses AsyncStorage
// (backed by localStorage) since SecureStore isn't available there.
const CHUNK_LIMIT = 2000;

const secureStoreAdapter = {
  async getItem(key: string) {
    const chunkCountRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!chunkCountRaw) return SecureStore.getItemAsync(key);
    const chunkCount = parseInt(chunkCountRaw, 10);
    const parts: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      parts.push((await SecureStore.getItemAsync(`${key}_${i}`)) ?? '');
    }
    return parts.join('');
  },
  async setItem(key: string, value: string) {
    if (value.length <= CHUNK_LIMIT) {
      await SecureStore.setItemAsync(key, value);
      await SecureStore.deleteItemAsync(`${key}_chunks`);
      return;
    }
    const chunkCount = Math.ceil(value.length / CHUNK_LIMIT);
    for (let i = 0; i < chunkCount; i++) {
      await SecureStore.setItemAsync(
        `${key}_${i}`,
        value.slice(i * CHUNK_LIMIT, (i + 1) * CHUNK_LIMIT),
      );
    }
    await SecureStore.setItemAsync(`${key}_chunks`, String(chunkCount));
    await SecureStore.deleteItemAsync(key);
  },
  async removeItem(key: string) {
    const chunkCountRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (chunkCountRaw) {
      const chunkCount = parseInt(chunkCountRaw, 10);
      for (let i = 0; i < chunkCount; i++) {
        await SecureStore.deleteItemAsync(`${key}_${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? AsyncStorage : secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
