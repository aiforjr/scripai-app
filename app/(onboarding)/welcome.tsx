import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlameIcon } from '@/src/components/ui/icons';
import { Button } from '@/src/components/ui/Button';
import * as haptics from '@/src/lib/haptics';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.spacer} />
      <View style={[styles.card, shadows.card]}>
        <View style={styles.iconBadge}>
          <FlameIcon size={40} color={colors.white} />
        </View>
        <Text style={styles.heading}>Hey, I'm ScripAI.</Text>
        <Text style={styles.subhead}>One minute a day, on camera.</Text>
        <Text style={styles.body}>
          We hand you a topic, you hit record, then you watch it back three ways. Thirty days later
          the camera is just a camera.
        </Text>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          title="Get started"
          variant="white"
          onPress={() => router.push('/(onboarding)/how-it-works')}
        />
        <Pressable
          onPress={() => {
            haptics.tap();
            router.push('/(auth)/login');
          }}
          style={styles.loginLink}
        >
          <Text style={styles.loginText}>I already have an account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.accent.DEFAULT,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  spacer: { flex: 1 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 28,
    gap: spacing.lg,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: radii.xl - 6,
    // Accent tile with a white glyph — inverted from the other onboarding
    // badges so it carries the brand color into the white card.
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h2,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subhead: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 17,
    color: colors.neutral[800],
    marginTop: -12,
  },
  body: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.neutral[700],
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[300],
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.accent.DEFAULT,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  loginLink: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
});
