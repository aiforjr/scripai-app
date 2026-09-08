import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import * as haptics from '@/src/lib/haptics';
import { colors, typography } from '@/src/theme/theme';

/** Header content height below the status bar — identical on every page. */
const ROW_HEIGHT = 52;

interface ScreenHeaderProps {
  title: string;
  /** Renders the circular back chevron ahead of the title. */
  showBack?: boolean;
  /** Trailing content, e.g. the home screen's streak pill. */
  right?: React.ReactNode;
}

/**
 * The tab-level page header: a white bar that carries up behind the status bar
 * and sits on a 1px rule above the gray body.
 *
 * Design spec (`Home A`, `Leaderboard locked`, `Premium tab`, `Settings A`):
 * `background:#fff; padding:60px 20px 16px; border-bottom:1px neutral-200`
 * with a 20px/700 title — 18px alongside a back button, per `Leaderboard you`.
 * The 60px top is the status bar plus breathing room, so the safe-area inset
 * replaces it here rather than adding to it.
 */
export function ScreenHeader({ title, showBack = false, right }: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {showBack && (
          <Pressable
            onPress={() => {
              haptics.tap();
              router.back();
            }}
            hitSlop={8}
            style={styles.backCircle}
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
          </Pressable>
        )}
        <Text style={[styles.title, showBack && styles.titleWithBack]} numberOfLines={1}>
          {title}
        </Text>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  // Fixed height below the safe-area inset, so the bar measures the same on
  // every page whether it holds a bare title, a back circle (34px) or the
  // home screen's streak pill (32px). Without this the tallest child sets the
  // height and the pages disagree.
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 20,
    lineHeight: 22,
    color: colors.text,
  },
  titleWithBack: {
    fontSize: 18,
  },
  right: {
    flexShrink: 0,
  },
});
