/**
 * Stand-in for Sign in with Apple / Google until developer credentials exist.
 *
 * The account-creation flow (1cg / 1cg3 / 1ci / 1ck / 1cm) is fully built out and
 * needs a name+email to move through, so this returns a fixed identity instead of
 * running a real OAuth handshake. Nothing here touches `supabase.auth` — the
 * session still comes from phone OTP; the provider only supplies the email that
 * gets written to `profiles.email` and the "linked with" chrome on 1cm/1ck.
 *
 * Swapping in the real thing means replacing `authorize()` with
 * `expo-apple-authentication` / `@react-native-google-signin` and calling
 * `supabase.auth.signInWithIdToken()`; every consumer reads only the returned
 * `OAuthIdentity`, so no screen has to change.
 */

export type OAuthProvider = 'apple' | 'google';

export interface OAuthIdentity {
  provider: OAuthProvider;
  name: string;
  email: string;
}

/** The single mocked account both providers resolve to. */
const MOCK_IDENTITY = {
  name: 'Sagar Jaid',
  email: 'sagarjaid321@gmail.com',
} as const;

export const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  apple: 'Apple',
  google: 'Google',
};

/** How the email's origin is described once linked — 1cm says "Apple", 1ck says "Gmail". */
export const PROVIDER_EMAIL_SOURCE: Record<OAuthProvider, string> = {
  apple: 'Apple ID',
  google: 'Google',
};

/**
 * Resolves the identity the provider sheet would hand back. Kept async and
 * artificially slow so callers already handle the pending state that a real
 * Face ID / account-chooser round trip will introduce.
 */
export async function authorize(provider: OAuthProvider): Promise<OAuthIdentity> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { provider, ...MOCK_IDENTITY };
}
