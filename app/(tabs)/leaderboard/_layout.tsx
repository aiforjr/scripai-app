import { Stack } from 'expo-router';

// Nests the "standing" drill-down inside the Leaderboard tab as its own stack,
// instead of expo-router flattening it into a sibling tab on the parent <Tabs>.
export default function LeaderboardLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
