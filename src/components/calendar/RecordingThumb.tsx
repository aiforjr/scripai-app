import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';

import { useRecordingSignedUrl } from '@/src/hooks/useRecordingSignedUrl';

interface RecordingThumbProps {
  storagePath: string;
  radius: number;
}

/**
 * A day tile's video still: the recording's first frame, held paused and muted
 * behind the day number. `expo-video` has no poster/thumbnail API, so the frame
 * comes from a real player that is simply never played — cheap enough because
 * the clip is only ~60s and at most a month's worth are mounted at a time.
 */
export function RecordingThumb({ storagePath, radius }: RecordingThumbProps) {
  const signedUrl = useRecordingSignedUrl(storagePath);
  const player = useVideoPlayer(signedUrl ?? '', (p) => {
    p.muted = true;
    p.loop = false;
    // Nudging off 0 makes the decoder surface a frame; some encoders give a
    // black frame at exactly 0.
    p.currentTime = 0.1;
  });

  return (
    <View style={[styles.fill, { borderRadius: radius }]} pointerEvents="none">
      {signedUrl ? (
        <VideoView
          player={player}
          style={styles.fill}
          nativeControls={false}
          contentFit="cover"
          // A still has nothing to fullscreen or pop out.
          fullscreenOptions={{ enable: false }}
          allowsPictureInPicture={false}
        />
      ) : null}
      {/* Scrim so the white day number stays legible over a bright frame. */}
      <View style={[styles.scrim, { borderRadius: radius }]} />
    </View>
  );
}

const ABSOLUTE_FILL = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

const styles = StyleSheet.create({
  fill: {
    ...ABSOLUTE_FILL,
    overflow: 'hidden',
  },
  scrim: {
    ...ABSOLUTE_FILL,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
