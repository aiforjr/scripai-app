import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/src/theme/theme';

export interface CameraCaptureHandle {
  startRecording: () => void;
  stopRecording: () => Promise<{ uri: string }>;
}

interface CameraCaptureProps {
  zoom?: number;
  facing?: 'front' | 'back';
  onPermissionDenied?: () => void;
}

export const CameraCapture = forwardRef<CameraCaptureHandle, CameraCaptureProps>(
  function CameraCapture({ zoom = 0, facing = 'front', onPermissionDenied }, ref) {
    const cameraRef = useRef<CameraView>(null);
    const pendingRecording = useRef<Promise<{ uri: string } | undefined> | null>(null);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();
    const [ready, setReady] = useState(false);

    useEffect(() => {
      (async () => {
        const cam = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
        const mic = micPermission?.granted ? micPermission : await requestMicPermission();
        if (!cam.granted || !mic.granted) {
          onPermissionDenied?.();
        }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      startRecording: () => {
        if (!cameraRef.current) return;
        pendingRecording.current = cameraRef.current.recordAsync({ maxDuration: 180 });
      },
      stopRecording: async () => {
        cameraRef.current?.stopRecording();
        const result = await pendingRecording.current;
        pendingRecording.current = null;
        if (!result?.uri) throw new Error('Recording did not produce a file');
        return { uri: result.uri };
      },
    }));

    if (!cameraPermission?.granted || !micPermission?.granted) {
      return (
        <View style={styles.permissionFallback}>
          <Text style={styles.permissionText}>
            Camera and microphone access are needed to record.
          </Text>
        </View>
      );
    }

    return (
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        zoom={zoom}
        mode="video"
        videoQuality="720p"
        onCameraReady={() => setReady(true)}
      />
    );
  },
);

const styles = StyleSheet.create({
  permissionFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[900],
    padding: 24,
  },
  permissionText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.white,
    textAlign: 'center',
  },
});
