import AsyncStorage from '@react-native-async-storage/async-storage';

import * as haptics from '@/src/lib/haptics';

const KEY = 'scripai.haptics_enabled';

/**
 * Device-local, not a `profiles` column: haptics describe this handset's hardware,
 * the toggle must respond with no network round-trip, and it must work before a
 * session exists. AsyncStorage rather than SecureStore — this is a preference, not
 * a secret, and it needs to be readable on web where SecureStore is unavailable.
 *
 * Kept in its own file so `haptics.ts` stays dependency-free (no storage import,
 * no async) and remains trivially callable anywhere.
 */
export async function loadHapticsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw === null ? true : raw === 'true'; // default ON for a fresh install
  } catch {
    return true; // a read failure must not silently disable feedback
  }
}

export async function setHapticsEnabled(next: boolean): Promise<void> {
  haptics.setEnabled(next); // update the live gate first, so the UI responds instantly
  try {
    await AsyncStorage.setItem(KEY, String(next));
  } catch {
    // Preference is decorative; a failed write must never break the toggle.
  }
}
