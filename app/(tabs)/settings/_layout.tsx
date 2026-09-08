import { Stack } from 'expo-router';

// Nests settings' sub-screens (profile, change-phone, reminders) inside the
// Settings tab as their own stack, instead of expo-router flattening them into
// sibling tabs on the parent <Tabs> navigator.
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
