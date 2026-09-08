import { File } from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraCapture, type CameraCaptureHandle } from '@/src/components/recording/CameraCapture';
import { EditScriptModal } from '@/src/components/recording/EditScriptModal';
import { ScriptAreaFade } from '@/src/components/recording/ScriptAreaFade';
import {
  DEFAULT_TELEPROMPTER_SPEED,
  DEFAULT_TELEPROMPTER_TEXT_SIZE,
  DEFAULT_TELEPROMPTER_ZOOM,
  TELEPROMPTER_SPEEDS,
  TELEPROMPTER_TEXT_SIZES,
  Teleprompter,
  type TeleprompterSpeed,
  type TeleprompterTextSize,
} from '@/src/components/recording/Teleprompter';
import { CheckIcon, ChevronLeft } from '@/src/components/ui/icons';
import { useTodayScript } from '@/src/hooks/useTodayScript';
import * as haptics from '@/src/lib/haptics';
import { supabase } from '@/src/lib/supabase';
import { RECORDING_DURATION_MS } from '@/src/lib/recording';
import { RECORDINGS_BUCKET, recordingStoragePath } from '@/src/lib/storage-paths';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

// Shared vocabulary, so this picker offers exactly what settings can store.
const SPEEDS = TELEPROMPTER_SPEEDS;
const SIZES = TELEPROMPTER_TEXT_SIZES;

export default function RecordScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { script, loading: scriptLoading, error: scriptError, regenerate } = useTodayScript(date);
  const cameraRef = useRef<CameraCaptureHandle>(null);
  // Explicit inset values rather than relying solely on <SafeAreaView>: on this
  // screen (a fullScreenModal reached via direct navigation) the automatic top
  // inset has been observed to report 0 for a beat before settling, which left
  // the top controls rendered under the Dynamic Island/status bar — visually
  // overlapping AND untappable, since that area doesn't receive touches. The
  // floor values keep controls clear of the notch/home-indicator even then.
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 50);
  const bottomInset = Math.max(insets.bottom, 16);

  const [speed, setSpeed] = useState<TeleprompterSpeed>(
    (profile?.teleprompter_speed as TeleprompterSpeed) ?? DEFAULT_TELEPROMPTER_SPEED,
  );
  const [textSize, setTextSize] = useState<TeleprompterTextSize>(
    (profile?.teleprompter_text_size as TeleprompterTextSize) ?? DEFAULT_TELEPROMPTER_TEXT_SIZE,
  );
  // Seeded from the 1mf "Default zoom" preference; adjusting it here is per-session
  // and deliberately does not write back to the profile.
  const [zoom, setZoom] = useState(profile?.teleprompter_zoom ?? DEFAULT_TELEPROMPTER_ZOOM);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState<string | null>(null);

  // 10 trailing blank lines so there's room to scroll the text area past the
  // end of the script. Appended once here (not on every re-render) so it
  // doesn't compound as the user types — once they edit anything, editedText
  // takes over and already carries these lines, so this fallback is skipped.
  const displayScriptText = editedText ?? `${script?.script_text ?? ''}${'\n'.repeat(10)}`;

  useEffect(() => {
    if (!isRecording) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const ms = Date.now() - start;
      setElapsedMs(ms);
      if (ms >= RECORDING_DURATION_MS) {
        // Fired here rather than inside `handleStop`: the manual path already
        // buzzes in `handleRecordPress`, and `handleStop` is shared between the
        // two, so putting it there would double-fire on a manual stop.
        haptics.heavy();
        void handleStop();
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  async function handleRecordPress() {
    // NOTE: on iOS the Taptic Engine is disabled while an AVCaptureSession runs,
    // so every haptic on this screen may silently do nothing on device while the
    // preview is live. That's OS policy, not a broken call — the wrapper already
    // swallows it, and it still fires on Android and wherever the engine is
    // available. Don't "fix" this by reaching for Vibration.vibrate().
    haptics.heavy();
    if (!isRecording) {
      setElapsedMs(0);
      cameraRef.current?.startRecording();
      setIsRecording(true);
    } else {
      await handleStop();
    }
  }

  async function handleStop() {
    setIsRecording(false);
    setUploading(true);
    try {
      // Always tell the native camera to stop first — regardless of whether we can
      // upload afterward — so a missing session/script never leaves an orphaned
      // recording running in the background (the camera stays "busy" until this
      // resolves, which previously looked like a frozen screen).
      const stopResult = await Promise.race([
        cameraRef.current?.stopRecording(),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 8000)),
      ]);

      if (!user || !script) return;

      const { uri } = stopResult ?? {};
      if (!uri) throw new Error('No recording produced');

      const path = recordingStoragePath(user.id, date);
      let body: Blob | ArrayBuffer;
      if (Platform.OS === 'web') {
        body = await (await fetch(uri)).blob();
      } else {
        // expo-file-system's old readAsStringAsync/base64 round-trip is hard-deprecated
        // in this SDK (it throws, not just warns) — the new File API reads bytes directly.
        body = await new File(uri).arrayBuffer();
      }

      const { error: uploadError } = await supabase.storage
        .from(RECORDINGS_BUCKET)
        .upload(path, body, {
          contentType: 'video/mp4',
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: recording, error: upsertError } = await supabase
        .from('recordings')
        .upsert(
          {
            user_id: user.id,
            daily_script_id: script.id,
            day: date,
            storage_path: path,
            duration_seconds: elapsedMs / 1000,
          },
          { onConflict: 'user_id,day' },
        )
        .select('*')
        .single();
      if (upsertError) throw upsertError;

      router.replace(`/review/${recording.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isSimulatorLimitation = /SimulatorNotSupported|not supported on the simulator/i.test(
        message,
      );
      if (isSimulatorLimitation) {
        // Expected: Simulators have no camera hardware, so expo-camera refuses to
        // actually record — not a bug, just untestable here. Everything else on
        // this screen (script, teleprompter, controls) still works fine.
        Alert.alert(
          'Not available in Simulator',
          'The iOS Simulator has no camera hardware, so video recording only works on a physical device. Everything else here is testable in the simulator.',
        );
      } else {
        // Fires after the capture session has stopped, so unlike the record
        // impact above this one genuinely lands on iOS. No haptic on the
        // simulator branch — that's an expected dev condition, not a failure
        // the user caused.
        haptics.error();
        console.error('Recording upload failed', err);
        Alert.alert(
          'Recording failed',
          'Something went wrong saving your recording. Please try again.',
        );
      }
    } finally {
      setUploading(false);
    }
  }

  // Clamped, and silent at the rails: `Math.max`/`Math.min` mean a press at 0%
  // or 100% still registers but changes nothing, so firing unconditionally would
  // tick forever against the stop. Mirrors `nudgeZoom` in settings/teleprompter.
  function nudgeZoom(delta: number) {
    const next = Math.min(1, Math.max(0, zoom + delta));
    if (next === zoom) return;
    haptics.select();
    setZoom(next);
  }

  async function handleRegenerate(topicTitle?: string) {
    setEditedText(null);
    await regenerate(topicTitle);
  }

  function closeEditModal() {
    // Explicit dismiss before closing: unmounting the Modal's focused TextInput
    // doesn't always signal iOS to hide the software keyboard on its own, which
    // can leave it stuck on screen over the camera view underneath.
    Keyboard.dismiss();
    setEditing(false);
  }

  async function handleSaveEdit(text: string) {
    if (script && text !== script.script_text) {
      await supabase.from('daily_scripts').update({ script_text: text }).eq('id', script.id);
      // Keep the teleprompter in sync with what was just persisted, so closing
      // the sheet doesn't scroll the pre-edit script.
      setEditedText(`${text}${'\n'.repeat(10)}`);
    }
    closeEditModal();
  }

  const secondsLeft = Math.max(
    0,
    Math.round(RECORDING_DURATION_MS / 1000) - Math.floor(elapsedMs / 1000),
  );
  const words = displayScriptText.trim().split(/\s+/).filter(Boolean).length;
  const spokenSeconds = Math.max(1, Math.round(words / 2.5));

  return (
    <View style={styles.root}>
      <CameraCapture ref={cameraRef} zoom={zoom} facing="front" />

      <View style={styles.overlay} pointerEvents="box-none">
        {/* The safe-area inset is padding *inside* topBar/bottomArea (not on
            `overlay`) so each bar's scrim paints all the way to the screen
            edge, behind the notch/home-indicator strip too — otherwise that
            strip falls back to bare camera and creates a visible seam where
            the scrim starts. */}
        <View style={[styles.topBar, { paddingTop: topInset }]} pointerEvents="box-none">
          <View style={styles.topRow} pointerEvents="box-none">
            <View style={styles.timerGroup}>
              <Pressable
                onPress={() => {
                  haptics.tap();
                  router.canGoBack() ? router.back() : router.replace('/(tabs)/home');
                }}
                style={styles.homeButton}
              >
                <ChevronLeft size={18} color={colors.white} />
              </Pressable>
              <View style={styles.timerPill}>
                <View style={styles.recordDot} />
                <Text style={styles.timerText}>{formatTime(Math.floor(elapsedMs / 1000))}</Text>
              </View>
            </View>
            <View style={styles.segmentGroup}>
              {SPEEDS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => {
                    if (speed === s) return; // re-tapping the active pill isn't a change
                    haptics.select();
                    setSpeed(s);
                  }}
                  style={[styles.segment, speed === s && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, speed === s && styles.segmentTextActive]}>
                    {s === 'slow' ? 'Slow' : s === 'medium' ? 'Med' : 'Fast'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.segmentGroup}>
              {SIZES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => {
                    if (textSize === s) return;
                    haptics.select();
                    setTextSize(s);
                  }}
                  style={[styles.segment, textSize === s && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, textSize === s && styles.segmentTextActive]}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.zoomRow} pointerEvents="box-none">
            <View style={styles.zoomControls}>
              <Pressable onPress={() => nudgeZoom(-0.1)} style={styles.zoomBtn}>
                <Text style={styles.zoomBtnText}>−</Text>
              </Pressable>
              <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
              <Pressable onPress={() => nudgeZoom(0.1)} style={styles.zoomBtn}>
                <Text style={styles.zoomBtnText}>+</Text>
              </Pressable>
            </View>
            <View style={styles.scriptActions}>
              <Pressable
                onPress={() => {
                  haptics.tap();
                  setEditing(true);
                }}
                style={styles.newScriptBtn}
              >
                <Text style={styles.newScriptText}>Edit</Text>
              </Pressable>
              {/* The haptic sits on the press, not in `handleRegenerate`: the edit
                  modal calls that same function and fires its own feedback, so a
                  haptic inside it would double up on that path. */}
              <Pressable
                onPress={() => {
                  haptics.heavy();
                  handleRegenerate();
                }}
                style={[styles.newScriptBtn, scriptError && styles.newScriptBtnError]}
                disabled={scriptLoading}
              >
                <RefreshCw size={14} color={colors.white} />
                <Text style={styles.newScriptText}>
                  {scriptError ? 'Retry script' : 'New script'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Every branch renders <ScriptAreaFade> so the scrim bridging the
            control bars into the camera view is present no matter what state
            the script is in — without it, a failure left the middle of the
            screen as bare, unscrimmed camera with a hard edge at each bar. */}
        {scriptLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={colors.white} />
            <ScriptAreaFade />
          </View>
        ) : scriptError && !script ? (
          <View style={styles.centerLoading}>
            <Text style={styles.errorText}>We couldn&apos;t generate today&apos;s script.</Text>
            {/* The reason from the function itself, not just a generic failure —
                it distinguishes an expired session from a service outage. */}
            <Text style={styles.errorDetail}>{scriptError}</Text>
            <Pressable
              onPress={() => {
                haptics.heavy();
                handleRegenerate();
              }}
              style={styles.retryScriptBtn}
              disabled={scriptLoading}
            >
              <RefreshCw size={16} color={colors.white} />
              <Text style={styles.retryScriptText}>Retry script</Text>
            </Pressable>
            <ScriptAreaFade />
          </View>
        ) : (
          <Teleprompter
            scriptText={displayScriptText}
            speed={speed}
            textSize={textSize}
            isScrolling={isRecording}
          />
        )}

        <View style={[styles.bottomArea, { paddingBottom: bottomInset }]} pointerEvents="box-none">
          <Pressable
            onPress={handleRecordPress}
            disabled={uploading || scriptLoading}
            style={styles.recordButtonRing}
          >
            {uploading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <View
                style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerActive]}
              />
            )}
          </Pressable>
          {!isRecording && (
            <Text style={styles.hint}>Drag the script up &amp; down for finer manual control</Text>
          )}
        </View>
      </View>

      <EditScriptModal
        visible={editing}
        day={date}
        scriptText={script?.script_text ?? ''}
        loading={scriptLoading}
        error={scriptError}
        onClose={closeEditModal}
        onSave={handleSaveEdit}
        onRegenerate={handleRegenerate}
      />
    </View>
  );
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutral[900] },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { backgroundColor: 'rgba(0,0,0,0.45)', paddingBottom: 8 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexWrap: 'wrap',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    height: 32,
  },
  recordDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent.DEFAULT },
  timerText: { color: colors.white, fontFamily: typography.fontFamily.semibold, fontSize: 12 },
  segmentGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  segment: { paddingHorizontal: 10, height: 32, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.accent.DEFAULT },
  segmentText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: typography.fontFamily.semibold,
    fontSize: 11,
  },
  segmentTextActive: { color: colors.white },
  timerGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  homeButton: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginTop: 8,
  },
  zoomControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scriptActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: { color: colors.white, fontSize: 16, fontFamily: typography.fontFamily.semibold },
  zoomLabel: { color: colors.white, fontFamily: typography.fontFamily.semibold, fontSize: 12 },
  newScriptBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newScriptBtnError: { backgroundColor: colors.accent.DEFAULT },
  newScriptText: { color: colors.white, fontFamily: typography.fontFamily.semibold, fontSize: 12 },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: typography.fontFamily.semibold,
    fontSize: 14,
    textAlign: 'center',
  },
  errorDetail: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
  retryScriptBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: radii.md,
    paddingHorizontal: 20,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryScriptText: {
    color: colors.white,
    fontFamily: typography.fontFamily.semibold,
    fontSize: 14,
  },
  bottomArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  hint: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
  },
  recordButtonRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent.DEFAULT,
  },
  recordButtonInnerActive: {
    borderRadius: 10,
    width: 32,
    height: 32,
  },
});
