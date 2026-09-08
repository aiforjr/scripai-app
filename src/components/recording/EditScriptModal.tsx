import { RefreshCw } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatShort } from '@/src/lib/dates';
import { TOPIC_LABELS } from '@/src/lib/topics';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

// Shared vocabulary — the same labels the onboarding and settings pickers offer, so
// a chip here names a topic the user recognises from their own preferences. These
// are passed to the generate-script function as `topic_title`. See src/lib/topics.ts.
const TOPIC_CHIPS = TOPIC_LABELS;

/**
 * Speaking rate used to turn a word count into a spoken estimate — ~78 wpm,
 * the deliberate on-camera delivery this app is coaching, not a silent-reading
 * pace. Calibrated so the mockup's "52 words · about 0:40 spoken" holds.
 */
const WORDS_PER_SECOND = 1.3;

const SKELETON_WIDTHS = ['92%', '78%', '86%', '68%', '82%', '54%'] as const;

interface EditScriptModalProps {
  visible: boolean;
  /** 'YYYY-MM-DD' — the script's day, shown in the card eyebrow. */
  day: string;
  /** Script text as last persisted; the modal seeds its draft from this. */
  scriptText: string;
  /** True while a script is being generated — swaps the input for a skeleton. */
  loading: boolean;
  /** Generation failure reason, shown in the footer with a retry affordance. */
  error?: string | null;
  onClose: () => void;
  onSave: (text: string) => void | Promise<void>;
  /** Called with a topic to steer generation, or undefined for a random one. */
  onRegenerate: (topicTitle?: string) => void | Promise<void>;
}

export function EditScriptModal({
  visible,
  day,
  scriptText,
  loading,
  error,
  onClose,
  onSave,
  onRegenerate,
}: EditScriptModalProps) {
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const inputRef = useRef<TextInput>(null);

  // The draft is local so typing never round-trips through the parent, and
  // Cancel can discard it wholesale. It re-seeds whenever a newly generated
  // script arrives or the sheet is reopened.
  const [draft, setDraft] = useState(scriptText);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setDraft(scriptText);
  }, [visible, scriptText]);

  const { words, spokenLabel } = useMemo(() => {
    const count = draft.trim().split(/\s+/).filter(Boolean).length;
    const seconds = Math.round(count / WORDS_PER_SECOND);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return { words: count, spokenLabel: `${m}:${String(s).padStart(2, '0')}` };
  }, [draft]);

  const dirty = draft !== scriptText;
  const canSave = dirty && !loading && !saving && draft.trim().length > 0;

  // marginBottom (not padding) for the keyboard offset: the card below has a
  // flex height resolved against this view's own height, so the height itself
  // has to shrink for the card to yield — padding would only eat content space
  // and let the card overflow behind the keyboard.
  const animatedStyle = useAnimatedStyle(() => ({ marginBottom: -keyboardHeight.value }));

  function handleClose() {
    // Explicit dismiss before closing: unmounting a focused TextInput doesn't
    // reliably signal iOS to hide the software keyboard, which can leave it
    // stranded over the camera view underneath.
    Keyboard.dismiss();
    onClose();
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(draft);
      Keyboard.dismiss();
    } finally {
      setSaving(false);
    }
  }

  /** Raises the keyboard and drops the caret at the end of the existing text. */
  function focusInput() {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    // focus() alone leaves the caret wherever it last sat, which on a fresh
    // focus can be index 0 — typing would then prepend to the script.
    input.setNativeProps?.({ selection: { start: draft.length, end: draft.length } });
  }

  function handleClear() {
    setDraft('');
    inputRef.current?.focus();
  }

  async function handleRegenerate(topic?: string) {
    Keyboard.dismiss();
    await onRegenerate(topic);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      // The Modal's own backdrop is white by default. The animated view below
      // shrinks via negative marginBottom to clear the keyboard, and margin
      // leaves that reclaimed strip unpainted — so without a dark backdrop the
      // white shows through around the keyboard's rounded top corners.
      backdropColor={colors.neutral[900]}
    >
      {/* Explicit insets rather than <SafeAreaView>: its automatic insets have
          been unreliable inside a freshly presented full-screen Modal, letting
          the top bar and chip row run past the physical screen edge. */}
      <Animated.View
        style={[
          styles.screen,
          { paddingTop: topInset, paddingBottom: bottomInset || spacing.lg },
          animatedStyle,
        ]}
      >
        <View style={styles.topBar}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Text style={styles.topBarLink}>Cancel</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>Edit script</Text>
          <Pressable onPress={handleSave} hitSlop={12} disabled={!canSave}>
            <Text
              style={[styles.topBarLink, styles.topBarSave, !canSave && styles.topBarSaveDisabled]}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>Today · {formatShort(day).replace(',', '')}</Text>

          {loading ? (
            <View style={styles.skeletonWrap}>
              {SKELETON_WIDTHS.map((w, i) => (
                <View key={i} style={[styles.skeletonLine, { width: w }]} />
              ))}
            </View>
          ) : error && !draft ? (
            // Only when there's nothing to edit — with existing text, the error
            // belongs in the footer so the draft stays reachable.
            <View style={styles.errorState}>
              <Text style={styles.errorTitle}>Couldn’t generate a script</Text>
              <Text style={styles.errorDetail}>{error}</Text>
              <Pressable
                style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
                onPress={() => handleRegenerate()}
              >
                <RefreshCw size={16} color={colors.white} />
                <Text style={styles.retryButtonText}>Retry script</Text>
              </Pressable>
            </View>
          ) : (
            // The input only occupies as much of the card as its text needs, so a
            // tap on the empty space below it would otherwise hit dead card and
            // dismiss focus. This wrapper makes the whole remaining area a target
            // that puts the caret at the end, the way a note-taking app behaves.
            <Pressable style={styles.inputArea} onPress={focusInput}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                multiline
                scrollEnabled
                value={draft}
                onChangeText={setDraft}
                autoFocus
                textAlignVertical="top"
                selectionColor={colors.accent.DEFAULT}
                placeholder="Write what you want to say…"
                placeholderTextColor={colors.neutral[400]}
              />
            </Pressable>
          )}

          <View style={styles.cardFooter}>
            {loading ? (
              <View style={styles.generatingRow}>
                <View style={styles.generatingDot} />
                <Text style={styles.generatingText}>Writing your script…</Text>
              </View>
            ) : error ? (
              <Pressable
                style={styles.generatingRow}
                onPress={() => handleRegenerate()}
                hitSlop={8}
              >
                <RefreshCw size={13} color={colors.accent.DEFAULT} />
                <Text style={styles.footerError}>Generation failed · Retry</Text>
              </Pressable>
            ) : (
              <Text style={styles.footerMeta}>
                {words} {words === 1 ? 'word' : 'words'} · about {spokenLabel} spoken
              </Text>
            )}
            <Pressable onPress={handleClear} hitSlop={8} disabled={loading || draft.length === 0}>
              <Text
                style={[
                  styles.clearLink,
                  (loading || draft.length === 0) && styles.clearLinkDisabled,
                ]}
              >
                Clear
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={styles.chipRowContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Pressable's function form gives a real pressed state — a plain
              style array never re-renders on press, so taps had no feedback. */}
          <Pressable
            style={({ pressed }) => [
              styles.chip,
              styles.chipPrimary,
              pressed && styles.chipPrimaryPressed,
            ]}
            onPress={() => handleRegenerate()}
            disabled={loading}
          >
            <RefreshCw size={15} color={colors.white} />
            <Text style={[styles.chipText, styles.chipTextOnAccent]}>
              Generate a different topic
            </Text>
          </Pressable>

          {TOPIC_CHIPS.map((topic) => (
            <Pressable
              key={topic}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              onPress={() => handleRegenerate(topic)}
              disabled={loading}
            >
              <Text style={styles.chipText}>{topic}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.neutral[900],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topBarTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 17,
    color: colors.white,
  },
  topBarLink: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 17,
    color: colors.white,
  },
  topBarSave: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.accent[400],
  },
  topBarSaveDisabled: {
    color: colors.neutral[600],
  },
  card: {
    flex: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.neutral[500],
    marginBottom: spacing.md,
  },
  inputArea: {
    flex: 1,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: 17,
    lineHeight: 25,
    color: colors.text,
    padding: 0,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  footerMeta: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.neutral[500],
  },
  clearLink: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.accent.DEFAULT,
  },
  clearLinkDisabled: {
    color: colors.neutral[400],
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 17,
    color: colors.text,
  },
  errorDetail: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 46,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.sm,
    backgroundColor: colors.accent.DEFAULT,
  },
  retryButtonPressed: {
    backgroundColor: colors.accent[600],
  },
  retryButtonText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.white,
  },
  footerError: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.accent.DEFAULT,
  },
  skeletonWrap: {
    flex: 1,
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  skeletonLine: {
    height: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[200],
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  generatingDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.accent.DEFAULT,
  },
  generatingText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.neutral[600],
  },
  chipRow: {
    flexGrow: 0,
    paddingVertical: spacing.lg,
  },
  chipRowContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    backgroundColor: colors.neutral[800],
  },
  chipPressed: {
    backgroundColor: colors.neutral[700],
  },
  chipPrimary: {
    backgroundColor: colors.accent.DEFAULT,
  },
  chipPrimaryPressed: {
    backgroundColor: colors.accent[600],
  },
  chipText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.white,
  },
  chipTextOnAccent: {
    color: colors.white,
  },
});
