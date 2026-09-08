import { StyleSheet, View } from 'react-native';

import { CheckIcon } from '@/src/components/ui/icons';
import { colors } from '@/src/theme/theme';

/**
 * A solid green disc with a white tick — the "this value is confirmed" badge on
 * the account-finishing screens (the verified phone and provider-supplied email
 * on 1cf/1ck/1cm, and the linked-provider row below them).
 *
 * Lives here rather than inside `FieldCard` because the linked-provider row isn't
 * a field card and still has to carry the identical badge; a bare `CheckIcon`
 * duplicated at each site had already drifted in size, stroke and colour between
 * the three.
 */
export function VerifiedCheck({ size = 20 }: { size?: number }) {
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
      {/* The drawn tick, not a "✓" character — the glyph varies by platform font
          and wouldn't match the stroke weight used elsewhere in the app. Scaled
          to ~62% of the disc so the strokes clear the circle's edge. */}
      <CheckIcon size={Math.round(size * 0.62)} color={colors.white} strokeWidth={3.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
});
