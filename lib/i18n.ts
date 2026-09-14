import { english as messages } from './translations.mjs';
const english = messages as Record<string, string>;
export const locale = () =>
  typeof document !== 'undefined' && document.documentElement.lang === 'en'
    ? 'en-GB'
    : 'de-DE';
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.entries(english)
  .filter(([key]) => key.includes('{'))
  .map(([key, value]) => ({
    regex: new RegExp(
      '^' +
        key
          .split(/\{\d+\}/)
          .map(escape)
          .join('(.*?)') +
        '$',
    ),
    value,
  }));
const fragments = Object.entries(english)
  .filter(([key]) => !key.includes('{'))
  .sort((a, b) => b[0].length - a[0].length);
const fragmentPattern = new RegExp(
  '(?<![\\p{L}])(?:' +
    fragments.map(([key]) => escape(key)).join('|') +
    ')(?![\\p{L}])',
  'gu',
);
export function t<T>(value: T): T {
  if (locale() !== 'en-GB') return value;
  if (Array.isArray(value)) return value.map(t) as T;
  if (typeof value !== 'string') return value;
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return value;
  const pad = (s: string) =>
    (value.match(/^\s*/)?.[0] || '') + s + (value.match(/\s*$/)?.[0] || '');
  if (Object.hasOwn(english, text)) return pad(english[text]) as T;
  for (const { regex, value: translated } of patterns) {
    const m = text.match(regex);
    if (m)
      return pad(
        translated.replace(/\{(\d+)\}/g, (_, n) => t(m[Number(n) + 1])),
      ) as T;
  }
  // Composed status and accessible labels combine translated fragments with numbers.
  const result = text.replace(fragmentPattern, (source) => english[source]);
  return pad(result) as T;
}
