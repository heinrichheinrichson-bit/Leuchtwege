import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { english } from './lib/translations.mjs';
import {
  preferences,
  resolveLanguage,
  applyPreferences,
} from './lib/preferences.mjs';
const source = fs
  .readFileSync('lib/i18n.ts', 'utf8')
  .replace(
    './translations.mjs',
    new URL('./lib/translations.mjs', import.meta.url).href,
  );
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
globalThis.document = { documentElement: { lang: 'de' } };
const { t, locale } = await import(
  'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')
);
assert.equal(t('Einstellungen'), 'Einstellungen');
assert.equal(preferences(null).theme, 'dark');
assert.equal(preferences({ theme: 'auto' }).theme, 'dark');
assert.equal(preferences(null).language, 'system');
assert.equal(preferences(null).reminderEnabled, false);
assert.equal(preferences(null).streakReminderEnabled, false);
assert.equal(preferences({reminderTime:'25:00'}).reminderTime,'18:00');
assert.equal(preferences({streakReminderTime:'21:45'}).streakReminderTime,'21:45');
assert.equal(preferences({ language: 'de' }).language, 'de');
assert.equal(preferences({ language: 'en' }).language, 'en');
assert.equal(resolveLanguage('system', ['de-AT']), 'de');
assert.equal(resolveLanguage('system', ['en-US', 'de-DE']), 'en');
assert.equal(resolveLanguage('system', ['fr-FR', 'de-DE']), 'de');
assert.equal(resolveLanguage('system', ['fr-FR']), 'en');
assert.equal(resolveLanguage('system', []), 'en');
assert.equal(resolveLanguage('de', ['en-US']), 'de');
assert.equal(resolveLanguage('en', ['de-AT']), 'en');
document.documentElement.lang = 'en';
assert.equal(locale(), 'en-GB');
assert.equal(t('Einstellungen'), 'Settings');
assert.equal(t('  Rückgängig '), '  Undo ');
assert.equal(t(' '), ' ');
assert.equal(
  t('3 von 9 verbunden · 4 offene Anschlüsse'),
  '3 of 9 connected · 4 open connections',
);
assert.equal(t('Mittel · Rätsel 05 / 30'), 'Medium · Puzzle 05 / 30');
assert.equal(t('Rätsel 05'), 'Puzzle 05');
assert.equal(t('Fortschritt zu Level 3'), 'Progress towards level 3');
assert.equal(t('3 Tipps'), '3 hints');
assert.equal(t('1 Tipp'), '1 hint');
assert.equal(t(3), 3);
const el = { type: 'button', props: {} };
assert.equal(t(el), el);
for (const file of ['lib/levels.json', 'lib/sliding-levels.json'])
  for (const l of JSON.parse(fs.readFileSync(file)))
    assert.ok(english[l.name], l.name);
const { tutorials } = await import('./lib/tutorial.mjs');
for (const l of Object.values(tutorials))
  for (const text of [
    l.title,
    l.takeaway,
    ...l.steps.flatMap((s) => [s.title, s.text]),
  ])
    assert.ok(english[text], text);
const missing = new Set();
for (const file of [
  'app/page.tsx',
  ...fs
    .readdirSync('components')
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => 'components/' + f),
]) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function visit(n) {
    if (
      ts.isCallExpression(n) &&
      n.expression.getText(source) === 'tr' &&
      n.arguments[0] &&
      ts.isStringLiteral(n.arguments[0])
    ) {
      const text = n.arguments[0].text.trim();
      if (
        /[\p{L}]/u.test(text) &&
        t(text) === text &&
        !/^(Leuchtwege|Level|English|XP|Nord|West)/.test(text)
      )
        missing.add(text);
    }
    ts.forEachChild(n, visit);
  }
  visit(source);
}
assert.deepEqual([...missing], [], 'Untranslated static UI text');
console.log(
  'PASS: dark default, German default, interpolation, accessible labels, puzzle names, tutorials and static UI text coverage.',
);
