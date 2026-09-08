export const RECORDINGS_BUCKET = 'recordings';

export function recordingStoragePath(userId: string, day: string): string {
  return `${userId}/${day}/video.mp4`;
}
