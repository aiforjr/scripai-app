import { useRouter } from 'expo-router';
import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';

import { useAuth } from '@/src/providers/AuthProvider';

// Stub today, backed by `profiles.is_premium`. Swap the implementation here for the
// real RevenueCat SDK (Purchases.getCustomerInfo()) once keys are available — no
// consumer screen should need to change.
interface EntitlementsContextValue {
  isPremium: boolean;
  presentPaywall: () => void;
}

const EntitlementsContext = createContext<EntitlementsContextValue | undefined>(undefined);

export function EntitlementsProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const router = useRouter();

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      isPremium: profile?.is_premium ?? false,
      presentPaywall: () => router.push('/(paywall)/trial-offer'),
    }),
    [profile?.is_premium, router],
  );

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

export function useEntitlements(): EntitlementsContextValue {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) throw new Error('useEntitlements must be used within EntitlementsProvider');
  return ctx;
}
