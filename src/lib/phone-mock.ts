import { parseE164 } from '@/src/lib/phone';
import { supabase } from '@/src/lib/supabase';

/**
 * A single test number that bypasses Twilio, so the account-creation flow can be
 * demoed end to end without a real SMS round trip. Sibling of `oauth-mock`.
 *
 * The bypass skips Twilio, but NOT Supabase auth. `verifyOtp()` is what mints a
 * session for a real signup, and a fixed OTP can't produce one — so instead this
 * module signs the demo number into a fixed email/password account
 * (`signInToMockAccount`). The demo path therefore ends up with a genuine session
 * and a real `auth.uid()`, which is what lets the authenticated half of the app
 * (settings, streaks, recordings, the day-completion RPC) be exercised at all.
 *
 * Earlier this bypass minted no session, and every RLS-scoped write after it was
 * silently skipped — which read as "settings is empty" and as the create-account
 * screen reappearing after a completed signup, since a sessionless user fails the
 * gate in `app/index.tsx`.
 *
 * The demo account is created on first use and reused afterwards, so no manual
 * seeding or service-role key is needed: `signIn` is tried first and a signup
 * only happens when the account isn't there yet. It is still scoped to one
 * hardcoded number rather than a general "accept 123456 anywhere" switch, which
 * would silently break every real signup.
 *
 * Delete this module (and its call sites) once Twilio Verify is live.
 */

/** The demo number, E.164. Matches how every other phone value is stored. */
export const MOCK_PHONE = '+918898720799';

/** The code `MOCK_PHONE` accepts. Any other code is still rejected. */
export const MOCK_OTP = '123456';

/**
 * Credentials for the account the demo number resolves to. Phone auth can't be
 * used here (that's the whole point of the bypass), so the session comes from
 * email/password — the one other first-party method that needs no external
 * provider. The address is deliberately an `example.com` one: it must never
 * collide with a real user's, and nothing is ever sent to it.
 */
const MOCK_ACCOUNT_EMAIL = 'demo+scripai@example.com';
const MOCK_ACCOUNT_PASSWORD = 'scripai-demo-8898720799';

/** True when this number should skip the real SMS/verify round trip entirely. */
export function isMockPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  // Compared as parsed E.164 rather than as raw strings so the same number typed
  // with different spacing, or reached via a different country selection, matches.
  const a = parseE164(phone);
  const b = parseE164(MOCK_PHONE);
  return !!a && !!b && a.country === b.country && a.nationalNumber === b.nationalNumber;
}

/** True when `code` is the accepted OTP for the mock number. */
export function isMockOtp(code: string): boolean {
  return code === MOCK_OTP;
}

/**
 * Signs the demo number into its fixed account, returning the new user's id.
 *
 * Sign-in is attempted before signup so repeat demo runs land on the same account
 * (and keep the streak/history built up on it) instead of failing on a duplicate.
 * Only a genuine "no such account" is allowed to fall through to signup — any
 * other failure is surfaced, so a real outage doesn't get mistaken for a
 * first run and reported as a confusing signup error.
 *
 * `handle_new_user` (owned by the other app sharing `profiles`) creates the
 * profile row on signup, but it knows nothing about ScripAI's `phone` column, and
 * migration 0002's trigger only mirrors `auth.users.phone` — which an
 * email/password signup never sets. So the demo number is written onto the
 * profile here; without it, every screen reading `profile.phone` would show
 * "Not set" for an account whose entire purpose is that number.
 */
export async function signInToMockAccount(): Promise<{ userId: string }> {
  const credentials = { email: MOCK_ACCOUNT_EMAIL, password: MOCK_ACCOUNT_PASSWORD };

  const signIn = await supabase.auth.signInWithPassword(credentials);
  let user = signIn.data.user;

  if (signIn.error) {
    // Supabase reports both "no such user" and "wrong password" as
    // `invalid_credentials`; for an account only this module ever writes to, that
    // means it hasn't been created in this project yet.
    if (signIn.error.code !== 'invalid_credentials') throw signIn.error;

    const signUp = await supabase.auth.signUp(credentials);
    if (signUp.error) throw signUp.error;
    // With email confirmations on, `signUp` returns a user but no session, and
    // nothing RLS-scoped would work. Better to say so than to continue into a
    // flow that will fail one write at a time.
    if (!signUp.data.session) {
      throw new Error(
        'The demo account needs email confirmation disabled on this Supabase project.',
      );
    }
    user = signUp.data.user;
  }

  if (!user) throw new Error('Demo sign-in returned no user.');

  await supabase.from('profiles').update({ phone: MOCK_PHONE }).eq('id', user.id);

  return { userId: user.id };
}
