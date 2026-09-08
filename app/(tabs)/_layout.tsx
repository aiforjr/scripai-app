import { Tabs } from 'expo-router';
import { Crown, House, Settings, Trophy } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import * as haptics from '@/src/lib/haptics';
import { colors, typography } from '@/src/theme/theme';

const ICON_SIZE = 24;
const ICON_STROKE = 2;

/**
 * Tab bar buttons are rendered by react-navigation, not by us, so a tap on one
 * never passes through any of our own Pressables — this `tabBarButton` override
 * is the only place a tab switch can be felt. Declared once in `screenOptions`
 * so all four tabs get it.
 *
 * `Pressable` replaces the default button rather than wrapping it, because the
 * default already *is* the touchable; nesting two would double-handle the tap.
 *
 * Props are typed structurally rather than with `BottomTabBarButtonProps`: in
 * SDK 57, expo-router vendors its own copy of bottom-tabs, so that type is only
 * reachable through a deep build path (`expo-router/build/react-navigation/...`)
 * and `@react-navigation/bottom-tabs` isn't an installed package at all. This
 * is the subset the tab bar actually passes and we actually use.
 */
function HapticTabButton({
  children,
  onPress,
  ...rest
}: {
  children?: React.ReactNode;
  onPress?: (e: any) => void;
} & Record<string, any>) {
  // Tapping the tab you are already on is not a selection change, so it stays
  // silent — the same guard the segmented controls elsewhere use. The tab bar
  // passes the focused state through `accessibilityState.selected`.
  const isFocused = rest['accessibilityState']?.selected === true;

  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        if (!isFocused) haptics.select();
        onPress?.(e);
      }}
    >
      {children}
    </Pressable>
  );
}

// The Premium tab is the one deliberate departure from the red-accent active-state
// convention (see screens-spec 1qa) — it always renders gold, regardless of the
// `color` react-navigation would otherwise pass in, as a defensive fallback in case
// the per-screen `tabBarActiveTintColor` override below isn't respected by the
// installed react-navigation/bottom-tabs version.
function PremiumTabIcon() {
  return <Crown size={ICON_SIZE} strokeWidth={ICON_STROKE} color={colors.gold.button} />;
}

function PremiumTabLabel({ focused }: { focused: boolean }) {
  return (
    <Text style={[styles.label, { color: focused ? colors.gold.button : colors.neutral[500] }]}>
      Premium
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.DEFAULT,
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.icon,
        tabBarButton: (props) => <HapticTabButton {...props} />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <House size={ICON_SIZE} strokeWidth={ICON_STROKE} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          tabBarLabel: 'Leaderboard',
          tabBarIcon: ({ color }) => (
            <Trophy size={ICON_SIZE} strokeWidth={ICON_STROKE} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          tabBarActiveTintColor: colors.gold.button,
          tabBarLabel: ({ focused }) => <PremiumTabLabel focused={focused} />,
          tabBarIcon: () => <PremiumTabIcon />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <Settings size={ICON_SIZE} strokeWidth={ICON_STROKE} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    // Breathing room between the border and the icon row; the bar grows to fit
    // rather than squeezing the icons up against the divider.
    paddingTop: 10,
    height: 92,
  },
  icon: {
    marginTop: 2,
  },
  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 11,
  },
});
