import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/theme';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.accent.DEFAULT} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (!profile?.onboarding_complete) {
    return <Redirect href="/(onboarding)/name" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
