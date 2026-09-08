// Type-resolution shim only. Metro always prefers `CameraCapture.native.tsx` /
// `CameraCapture.web.tsx` over this extensionless file when bundling for those
// platforms, so this re-export never actually runs — it exists purely so
// `@/src/components/recording/CameraCapture` resolves for `tsc`.
export * from './CameraCapture.native';
