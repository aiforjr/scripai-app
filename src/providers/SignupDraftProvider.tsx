import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type { OAuthIdentity } from '@/src/lib/oauth-mock';

/**
 * Scratch state for the multi-screen account-creation flow (1ca → 1cm).
 *
 * The flow runs in two directions — OAuth-then-phone and phone-then-OAuth — and
 * both arrive at the same "Finish your account" screen needing whatever the other
 * half already collected. Route params can't carry it: the OTP screen sits in the
 * middle of both branches and would have to forward every field blind, and the
 * linked identity is picked up *after* that screen in the phone-first branch.
 *
 * Kept separate from `OnboardingDraftProvider` on purpose. That one holds quiz
 * answers flushed once at `commit()`; this holds identity for the duration of a
 * single signup and is cleared as soon as the account exists.
 */
export interface SignupDraft {
  /** Set once a provider sheet is confirmed — drives the "Signed in with X" chrome. */
  identity: OAuthIdentity | null;
  /** E.164, set once the number is OTP-verified. */
  phone: string | null;
  /** Editable name: seeded from the provider, or from the onboarding quiz. */
  fullName: string;
}

const EMPTY_DRAFT: SignupDraft = { identity: null, phone: null, fullName: '' };

interface SignupDraftContextValue {
  signup: SignupDraft;
  setIdentity: (identity: OAuthIdentity) => void;
  setPhone: (phone: string) => void;
  setFullName: (fullName: string) => void;
  reset: () => void;
}

const SignupDraftContext = createContext<SignupDraftContextValue | undefined>(undefined);

export function SignupDraftProvider({ children }: PropsWithChildren) {
  const [signup, setSignup] = useState<SignupDraft>(EMPTY_DRAFT);

  const setIdentity = useCallback((identity: OAuthIdentity) => {
    setSignup((prev) => ({
      ...prev,
      identity,
      // The provider's name seeds the field only while the user hasn't typed one,
      // so linking an account late (1cf → 1ck) never overwrites what they entered.
      fullName: prev.fullName || identity.name,
    }));
  }, []);

  const setPhone = useCallback((phone: string) => {
    setSignup((prev) => ({ ...prev, phone }));
  }, []);

  const setFullName = useCallback((fullName: string) => {
    setSignup((prev) => ({ ...prev, fullName }));
  }, []);

  const reset = useCallback(() => setSignup(EMPTY_DRAFT), []);

  const value = useMemo(
    () => ({ signup, setIdentity, setPhone, setFullName, reset }),
    [signup, setIdentity, setPhone, setFullName, reset],
  );

  return <SignupDraftContext.Provider value={value}>{children}</SignupDraftContext.Provider>;
}

export function useSignupDraft(): SignupDraftContextValue {
  const ctx = useContext(SignupDraftContext);
  if (!ctx) throw new Error('useSignupDraft must be used within SignupDraftProvider');
  return ctx;
}
