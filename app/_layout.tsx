import {
  Archivo_400Regular,
  Archivo_600SemiBold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as haptics from '@/src/lib/haptics';
import { loadHapticsEnabled } from '@/src/lib/haptics-preference';
import { AuthProvider } from '@/src/providers/AuthProvider';
import { EntitlementsProvider } from '@/src/providers/EntitlementsProvider';
import { OnboardingDraftProvider } from '@/src/providers/OnboardingDraftProvider';
import { SignupDraftProvider } from '@/src/providers/SignupDraftProvider';
import { colors } from '@/src/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Hydrate the device-local haptics preference into the wrapper's module-level
  // gate. Deliberately does not block rendering: the flag defaults to `true`, so
  // the only risk is one tap in the first few milliseconds feeling enabled when
  // the user had disabled it — a better trade than holding the splash on a
  // preference read.
  useEffect(() => {
    loadHapticsEnabled().then(haptics.setEnabled);
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <EntitlementsProvider>
              <OnboardingDraftProvider>
                <SignupDraftProvider>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.background },
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(onboarding)" />
                    <Stack.Screen name="(auth)" />
                    {/* Not a modal: auth `router.replace`s into the paywall, so it is the
                      main flow's destination after signup, not a sheet over content.
                      As a modal it rendered as an inset card, leaving a gray gap above
                      every paywall screen. `trial-sheet` is still a modal, declared in
                      the group's own layout. */}
                    <Stack.Screen name="(paywall)" />
                    {/* The trial sheet is reachable two ways, and both must render it
                      as a sheet. `(paywall)/_layout` only covers navigation that is
                      already inside the group; pushing `/(paywall)/trial-sheet`
                      from the Premium tab pushes the *group* onto this stack, where
                      it would inherit the non-modal `(paywall)` entry above and
                      render full-screen under the status bar. Declaring the nested
                      route here makes the root-level entry a sheet too. */}
                    <Stack.Screen
                      name="(paywall)/trial-sheet"
                      options={{ presentation: 'modal' }}
                    />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                      name="record/[date]"
                      options={{ presentation: 'fullScreenModal' }}
                    />
                    <Stack.Screen
                      name="review/[recordingId]"
                      options={{ presentation: 'fullScreenModal' }}
                    />
                    {/* Read-only replay of a past day, opened from the home calendar.
                      A sheet rather than a fullScreenModal: it is a quick look back,
                      dismissed by swipe, not a flow to complete. */}
                    <Stack.Screen
                      name="playback/[recordingId]"
                      options={{ presentation: 'modal' }}
                    />
                  </Stack>
                </SignupDraftProvider>
              </OnboardingDraftProvider>
            </EntitlementsProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
