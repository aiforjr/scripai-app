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
  function CameraCapture({ facing = 'front', onPermissionDenied }, ref) {
    const videoElRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const stopResolverRef = useRef<((result: { uri: string }) => void) | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [supported, setSupported] = useState(true);

    useEffect(() => {
      if (
        typeof window === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === 'undefined'
      ) {
        setSupported(false);
        onPermissionDenied?.();
        return;
      }

      let cancelled = false;
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: facing === 'front' ? 'user' : 'environment' },
          audio: true,
        })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoElRef.current) {
            videoElRef.current.srcObject = stream;
            videoElRef.current.play().catch(() => {});
          }
        })
        .catch(() => {
          setError('Camera/microphone permission was denied.');
          onPermissionDenied?.();
        });

      return () => {
        cancelled = true;
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facing]);

    useImperativeHandle(ref, () => ({
      startRecording: () => {
        if (!streamRef.current) return;
        chunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm';
        const recorder = new MediaRecorder(streamRef.current, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const uri = URL.createObjectURL(blob);
          stopResolverRef.current?.({ uri });
          stopResolverRef.current = null;
        };
        recorder.start();
        recorderRef.current = recorder;

        // Native belt-and-braces 180s cap (mirrors the JS countdown in the record screen).
        setTimeout(() => {
          if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
        }, 180_000);
      },
      stopRecording: () =>
        new Promise((resolve) => {
          stopResolverRef.current = resolve;
          if (recorderRef.current?.state === 'recording') {
            recorderRef.current.stop();
          }
        }),
    }));

    if (!supported || error) {
      return (
        <View style={styles.permissionFallback}>
          <Text style={styles.permissionText}>
            {error ??
              "Recording isn't supported on this browser — please use the ScripAI mobile app."}
          </Text>
        </View>
      );
    }

    return (
      // eslint-disable-next-line react/no-unknown-property
      <video ref={videoElRef} muted playsInline style={webVideoStyle as any} />
    );
  },
);

const webVideoStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transform: 'scaleX(-1)',
};

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
