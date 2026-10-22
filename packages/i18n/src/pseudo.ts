const ACCENTS: Record<string, string> = {
  a: 'á',
  e: 'é',
  i: 'í',
  o: 'ö',
  u: 'ü',
  c: 'ç',
  n: 'ñ',
  y: 'ý',
  A: 'Å',
  E: 'É',
  I: 'Î',
  O: 'Ö',
  U: 'Û',
  C: 'Ç',
  N: 'Ñ',
  Y: 'Ý',
};

const RLM = '‏';

function transform(text: string, rtl: boolean): string {
  // Keep {{placeholders}} and nesting intact; only rewrite literal text.
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  const body = parts
    .map((part) =>
      part.startsWith('{{') ? part : part.replace(/[a-zA-Z]/g, (c) => ACCENTS[c] ?? c),
    )
    .join('');
  // Pad by ~35% so truncation and wrapping bugs show up before real translations arrive.
  const pad = '~'.repeat(Math.ceil(text.length * 0.35));
  const out = `[${body} ${pad}]`;
  return rtl ? `${RLM}${out}${RLM}` : out;
}

type Tree = { [key: string]: string | Tree };

export function pseudoLocalise<T extends Tree>(tree: T, { rtl = false } = {}): T {
  const out: Tree = {};
  for (const [key, value] of Object.entries(tree)) {
    out[key] = typeof value === 'string' ? transform(value, rtl) : pseudoLocalise(value, { rtl });
  }
  return out as T;
}
