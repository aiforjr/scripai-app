import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import * as haptics from '@/src/lib/haptics';
import { colors, typography } from '@/src/theme/theme';

interface StepHeaderProps {
  title?: string;
  onSkip?: () => void;
  showBack?: boolean;
}

/** Back-chevron / centered title / optional Skip link — the recurring onboarding & settings header row. */
export function StepHeader({ title, onSkip, showBack = true }: StepHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {showBack && (
          <Pressable
            onPress={() => {
              haptics.tap();
              router.back();
            }}
            hitSlop={8}
            style={styles.backButton}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="m15 18-6-6 6-6"
                stroke={colors.text}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
        )}
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.side}>
        {onSkip && (
          <Pressable
            onPress={() => {
              haptics.tap();
              onSkip();
            }}
            hitSlop={8}
          >
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // No paddingTop here: the enclosing screen owns the gap below the safe
    // area. Adding one here stacked a third source of top spacing on top of
    // the inset and the screen's own paddingTop.
    marginBottom: 18,
  },
  side: {
    width: 70,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  skip: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.neutral[600],
    textAlign: 'right',
    width: 70,
  },
});
