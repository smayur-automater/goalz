import { emailSchema } from '@goalz/schemas';
import type { GoalzClient } from './client';

/** Maps to i18n keys under auth.error.* so screens can show friendly copy. */
export type AuthErrorCode =
  'invalid_email' | 'invalid_code' | 'rate_limited' | 'network' | 'cancelled' | 'unknown';

export type AuthResult = { ok: true } | { ok: false; error: AuthErrorCode };

function toAuthError(error: { status?: number; code?: string; message?: string }): AuthErrorCode {
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') return 'rate_limited';
  if (error.code === 'otp_expired' || error.code === 'invalid_otp' || error.status === 403) {
    return 'invalid_code';
  }
  if (error.code === 'validation_failed' || error.code === 'email_address_invalid') {
    return 'invalid_email';
  }
  if (error.message?.toLowerCase().includes('fetch')) return 'network';
  return 'unknown';
}

async function run(fn: () => Promise<{ error: unknown }>): Promise<AuthResult> {
  try {
    const { error } = await fn();
    return error ? { ok: false, error: toAuthError(error as never) } : { ok: true };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export interface SignUpDetails {
  /** Saved to the new profile on first sign-in. */
  locale?: string;
  timezone?: string;
  displayName?: string;
}

/**
 * Emails a sign-in link that also contains a 6-digit code. The code path matters on
 * mobile (links can open the wrong browser) and for anyone who finds links hard to use.
 */
export async function sendMagicLink(
  client: GoalzClient,
  email: string,
  redirectTo: string,
  details: SignUpDetails = {},
): Promise<AuthResult> {
  const parsed = emailSchema.safeParse(email.trim());
  if (!parsed.success) return { ok: false, error: 'invalid_email' };
  return run(() =>
    client.auth.signInWithOtp({
      email: parsed.data,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
        data: {
          locale: details.locale,
          timezone: details.timezone,
          display_name: details.displayName,
        },
      },
    }),
  );
}

export function verifyEmailCode(
  client: GoalzClient,
  email: string,
  code: string,
): Promise<AuthResult> {
  const token = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(token)) return Promise.resolve({ ok: false, error: 'invalid_code' });
  return run(() => client.auth.verifyOtp({ email: email.trim(), token, type: 'email' }));
}

/** Native Sign in with Apple / Google: pass the ID token from the platform SDK. */
export function signInWithIdToken(
  client: GoalzClient,
  provider: 'apple' | 'google',
  idToken: string,
  nonce?: string,
): Promise<AuthResult> {
  return run(() => client.auth.signInWithIdToken({ provider, token: idToken, nonce }));
}

/** Web: redirects to Apple or Google, then back to `redirectTo`. */
export function signInWithOAuth(
  client: GoalzClient,
  provider: 'apple' | 'google',
  redirectTo: string,
): Promise<AuthResult> {
  return run(() => client.auth.signInWithOAuth({ provider, options: { redirectTo } }));
}

/** Completes a PKCE redirect (magic link or OAuth) using the `code` query parameter. */
export function completeRedirect(client: GoalzClient, code: string): Promise<AuthResult> {
  return run(() => client.auth.exchangeCodeForSession(code));
}

export function signOut(client: GoalzClient): Promise<AuthResult> {
  return run(() => client.auth.signOut());
}
