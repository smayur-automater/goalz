import type { GoalzClient } from './client';
import { toCsv } from './csv';

export interface MyData {
  exported_at: string;
  format_version: number;
  profile: Record<string, unknown>;
  [table: string]: unknown;
}

/** Everything the user owns, straight from the database (RLS limits it to them). */
export async function fetchMyData(client: GoalzClient): Promise<MyData> {
  const { data, error } = await client.rpc('export_my_data');
  if (error) throw error;
  return data as MyData;
}

/** Turns an export into downloadable files: one full JSON file plus a CSV per table. */
export function buildExportFiles(data: MyData): Record<string, string> {
  const files: Record<string, string> = {
    'goalz-export.json': JSON.stringify(data, null, 2),
    'profile.csv': toCsv([data.profile]),
  };
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) files[`${key}.csv`] = toCsv(value as Record<string, unknown>[]);
  }
  return files;
}

/**
 * Permanently deletes the account and all its data (Edge Function), then clears the
 * local session. The caller must have shown a clear confirmation first.
 */
export async function deleteAccount(client: GoalzClient): Promise<void> {
  const { error } = await client.functions.invoke('delete-account', {
    body: { confirm: 'DELETE' },
  });
  if (error) throw error;
  await client.auth.signOut({ scope: 'local' });
}
