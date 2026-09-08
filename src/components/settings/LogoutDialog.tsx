import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

interface LogoutDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Screens-spec 1mh — confirmation dialog over a dimmed Settings. Rendered as a
 * transparent Modal rather than an Alert so the accent primary button and the
 * "Stay logged in" text link match the design instead of OS alert styling.
 */
export function LogoutDialog({ visible, onConfirm, onCancel }: LogoutDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Tapping the scrim dismisses, matching the design's non-destructive default. */}
      <Pressable style={styles.scrim} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Title and body are one group with tight spacing; the actions sit in
              their own group further down, so the copy reads as a single block
              rather than four evenly-spaced lines. */}
          <View style={styles.copyGroup}>
            <Text style={styles.title}>Log out?</Text>
            <Text style={styles.body}>Your recordings and streak stay saved to your account.</Text>
          </View>

          <View style={styles.actions}>
            <Button title="Log out" variant="primary" onPress={onConfirm} />

            <Pressable onPress={onCancel} hitSlop={8} style={styles.stayButton}>
              <Text style={styles.stayLabel}>Stay logged in</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(32,30,29,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    // Separates the two groups (copy, actions) rather than every child, so the
    // title no longer sits as far from its body text as the body does from the
    // button.
    gap: spacing.xl,
  },
  copyGroup: {
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h3,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
    textAlign: 'center',
    // Wraps to two lines at this width; without an explicit line height the
    // rows crowd each other.
    lineHeight: 22,
  },
  stayButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  stayLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.body,
    color: colors.text,
  },
});
