import { describe, expect, it, vi } from 'vitest';
import { buildExportFiles, deleteAccount } from './account';
import { sendMagicLink, signInWithIdToken, verifyEmailCode } from './auth';
import type { GoalzClient } from './client';
import { createGoalzClient } from './client';
import { toCsv } from './csv';

function fakeClient(result: { error: unknown } = { error: null }) {
  const auth = {
    signInWithOtp: vi.fn().mockResolvedValue(result),
    verifyOtp: vi.fn().mockResolvedValue(result),
    signInWithIdToken: vi.fn().mockResolvedValue(result),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
  const functions = { invoke: vi.fn().mockResolvedValue({ error: null }) };
  return { client: { auth, functions } as unknown as GoalzClient, auth, functions };
}

describe('createGoalzClient', () => {
  it('fails loudly without configuration', () => {
    expect(() => createGoalzClient({ url: '', anonKey: '' })).toThrow(/\.env\.example/);
  });
});

describe('sendMagicLink', () => {
  it('rejects an invalid email without calling the server', async () => {
    const { client, auth } = fakeClient();
    expect(await sendMagicLink(client, 'not-an-email', 'goalz://auth/callback')).toEqual({
      ok: false,
      error: 'invalid_email',
    });
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('passes locale and time zone for the new profile', async () => {
    const { client, auth } = fakeClient();
    const result = await sendMagicLink(client, ' sam@example.com ', 'goalz://auth/callback', {
      locale: 'en-AU',
      timezone: 'Australia/Sydney',
    });
    expect(result).toEqual({ ok: true });
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'sam@example.com',
      options: expect.objectContaining({
        emailRedirectTo: 'goalz://auth/callback',
        shouldCreateUser: true,
        data: expect.objectContaining({ locale: 'en-AU', timezone: 'Australia/Sydney' }),
      }),
    });
  });

  it('maps rate limiting to a friendly code', async () => {
    const { client } = fakeClient({ error: { status: 429, message: 'rate limit' } });
    expect(await sendMagicLink(client, 'sam@example.com', 'x')).toEqual({
      ok: false,
      error: 'rate_limited',
    });
  });

  it('reports network failures', async () => {
    const { client, auth } = fakeClient();
    auth.signInWithOtp.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await sendMagicLink(client, 'sam@example.com', 'x')).toEqual({
      ok: false,
      error: 'network',
    });
  });
});

describe('verifyEmailCode', () => {
  it('accepts a spaced 6-digit code and rejects anything else locally', async () => {
    const { client, auth } = fakeClient();
    expect(await verifyEmailCode(client, 'sam@example.com', '123 456')).toEqual({ ok: true });
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'sam@example.com',
      token: '123456',
      type: 'email',
    });
    expect(await verifyEmailCode(client, 'sam@example.com', '12ab')).toEqual({
      ok: false,
      error: 'invalid_code',
    });
  });

  it('maps an expired code', async () => {
    const { client } = fakeClient({ error: { status: 403, code: 'otp_expired' } });
    expect(await verifyEmailCode(client, 'sam@example.com', '123456')).toEqual({
      ok: false,
      error: 'invalid_code',
    });
  });
});

describe('signInWithIdToken', () => {
  it('forwards the provider token and nonce', async () => {
    const { client, auth } = fakeClient();
    await signInWithIdToken(client, 'apple', 'id-token', 'nonce');
    expect(auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'id-token',
      nonce: 'nonce',
    });
  });
});

describe('toCsv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(toCsv([{ a: 'x,y', b: 'say "hi"', c: 'line\nbreak' }])).toBe(
      'a,b,c\r\n"x,y","say ""hi""","line\nbreak"\r\n',
    );
  });

  it('neutralises spreadsheet formulas in text but keeps negative numbers', () => {
    expect(toCsv([{ note: '=HYPERLINK("http://evil")', value: -5 }])).toBe(
      'note,value\r\n"\'=HYPERLINK(""http://evil"")",-5\r\n',
    );
  });

  it('includes every column across rows and leaves nulls empty', () => {
    expect(toCsv([{ a: 1 }, { b: null, a: 2 }])).toBe('a,b\r\n1,\r\n2,\r\n');
  });

  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('');
  });
});

describe('buildExportFiles', () => {
  it('produces a JSON file plus one CSV per table', () => {
    const files = buildExportFiles({
      exported_at: '2026-11-01T00:00:00Z',
      format_version: 1,
      profile: { id: 'p1', display_name: 'Sam' },
      goals: [{ id: 'g1', title: 'Walk' }],
      check_ins: [],
    });
    expect(Object.keys(files).sort()).toEqual([
      'check_ins.csv',
      'goals.csv',
      'goalz-export.json',
      'profile.csv',
    ]);
    expect(files['goals.csv']).toBe('id,title\r\ng1,Walk\r\n');
    expect(JSON.parse(files['goalz-export.json']!).profile.display_name).toBe('Sam');
  });
});

describe('deleteAccount', () => {
  it('confirms explicitly, then clears the local session', async () => {
    const { client, functions, auth } = fakeClient();
    await deleteAccount(client);
    expect(functions.invoke).toHaveBeenCalledWith('delete-account', {
      body: { confirm: 'DELETE' },
    });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('does not sign out if deletion failed', async () => {
    const { client, functions, auth } = fakeClient();
    functions.invoke.mockResolvedValue({ error: new Error('boom') });
    await expect(deleteAccount(client)).rejects.toThrow('boom');
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
