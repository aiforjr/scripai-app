import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { supabase } from '@/src/lib/supabase';
import type { AgeBracket, Gender } from '@/src/types/database.types';

// The onboarding quiz (name/age/gender/fear-trigger/topics/reminders) runs BEFORE an
// account exists (per the design's flow: onboarding -> phone/OTP signup -> paywall).
// Answers are held here in-memory for the duration of the onboarding session, then
// flushed into `profiles` in one update once the account is created (see commit()).
export interface OnboardingDraft {
  fullName: string;
  ageBracket: AgeBracket | null;
  gender: Gender;
  cameraFearSituation: string | null;
  topicPreferences: string[];
  reminderTime: string; // 'HH:mm'
  notificationsEnabled: boolean;
  aiCallEnabled: boolean;
}

const DEFAULT_DRAFT: OnboardingDraft = {
  fullName: '',
  ageBracket: null,
  gender: null,
  cameraFearSituation: null,
  topicPreferences: [],
  reminderTime: '20:00',
  notificationsEnabled: true,
  aiCallEnabled: false,
};

interface OnboardingDraftContextValue {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  commit: (userId: string) => Promise<void>;
}

const OnboardingDraftContext = createContext<OnboardingDraftContextValue | undefined>(undefined);

export function OnboardingDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<OnboardingDraft>(DEFAULT_DRAFT);

  const update = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const commit = useCallback(
    async (userId: string) => {
      await supabase
        .from('profiles')
        .update({
          name: draft.fullName || null,
          age_bracket: draft.ageBracket,
          gender: draft.gender,
          camera_fear_situation: draft.cameraFearSituation,
          topic_preferences: draft.topicPreferences,
          reminder_time: draft.reminderTime,
          notifications_enabled: draft.notificationsEnabled,
          ai_call_enabled: draft.aiCallEnabled,
          onboarding_complete: true,
        })
        .eq('id', userId);
    },
    [draft],
  );

  const value = useMemo(() => ({ draft, update, commit }), [draft, update, commit]);

  return (
    <OnboardingDraftContext.Provider value={value}>{children}</OnboardingDraftContext.Provider>
  );
}

export function useOnboardingDraft(): OnboardingDraftContextValue {
  const ctx = useContext(OnboardingDraftContext);
  if (!ctx) throw new Error('useOnboardingDraft must be used within OnboardingDraftProvider');
  return ctx;
}
