/**
 * RFC 4180 CSV with protection against spreadsheet formula injection (OWASP):
 * text cells that start with = + - @ or a control character are prefixed with '.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text: string;
  if (typeof value === 'string') {
    text = FORMULA_START.test(value) ? `'${value}` : value;
  } else if (typeof value === 'object') {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [headers.map(cell).join(',')];
  for (const row of rows) lines.push(headers.map((h) => cell(row[h])).join(','));
  return lines.join('\r\n') + '\r\n';
}
