import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { difficulty } from './lib/difficulty.mjs';
import { solutions, evaluate } from './lib/game.mjs';
import {
  makeLevel,
  topologyKey,
  similarity,
  applyOverride,
} from './lib/level-design.mjs';
const source = JSON.parse(readFileSync('lib/levels.json', 'utf8'));
if (source.length !== 21 && source.length !== 30)
  throw Error('Expected reviewed 21- or 30-puzzle catalog');
const overrides = JSON.parse(readFileSync('difficulty-overrides.json', 'utf8'));
const levels = source.map((l, i) => ({
  ...l,
  id: l.id || 'lw-' + String(i + 1).padStart(3, '0'),
}));
const oldNames = [
  'Morgenlicht',
  'Kleine Runde',
  'Lichtbogen',
  'Lange Leitung',
  'Fernlicht',
  'Wechselspiel',
  'Verborgene Wege',
  'Knotenpunkt',
  'Lichtlabyrinth',
];
levels.slice(12, 21).forEach((l, i) => {
  if (/^(Leicht|Mittel|Schwer) ·/.test(l.name)) l.name = oldNames[i];
});
const requests = [
  { n: 3, tier: 'Leicht', name: 'Der erste Weg' },
  { n: 4, tier: 'Leicht', name: 'Umwege' },
  { n: 4, tier: 'Mittel', name: 'Zwei Richtungen' },
  { n: 5, tier: 'Mittel', name: 'Ein Netz entsteht' },
  { n: 4, tier: 'Schwer', name: 'Klein, aber knifflig' },
  { n: 5, tier: 'Mittel', name: 'Überblick' },
  { n: 5, tier: 'Schwer', name: 'Auf Spurensuche' },
  { n: 6, tier: 'Mittel', name: 'Lichtlandschaft' },
  { n: 6, tier: 'Schwer', name: 'Der letzte Anschluss' },
];
let attempts = 0;
if (levels.length === 21)
  for (let r = 0; r < requests.length; r++) {
    const spec = requests[r];
    let chosen = null;
    for (let seed = 2000 + r * 12000; seed < 14000 + r * 12000; seed++) {
      attempts++;
      const l = makeLevel(spec.n, seed);
      if (!l) continue;
      const key = topologyKey(l);
      if (
        levels.some(
          (old) => topologyKey(old) === key || similarity(old, l) > 0.9,
        )
      )
        continue;
      const d = difficulty(l);
      if (d.tier !== spec.tier || d.method === 'search') continue;
      if (r === 0 && d.score > 4) continue;
      if (solutions(l.initial, l.n, l.source).length !== 1) continue;
      chosen = {
        ...l,
        id: 'lw-' + String(levels.length + 1).padStart(3, '0'),
        name: spec.name,
        difficulty: d,
      };
      break;
    }
    if (!chosen) throw Error('No suitable puzzle found for ' + spec.name);
    levels.push(chosen);
  }
for (const l of levels)
  l.difficulty = applyOverride(l, difficulty(l), overrides);
for (const id of Object.keys(overrides))
  if (!levels.some((l) => l.id === id)) throw Error('Unknown override ' + id);
// Preserve storage/index identity. The independent recommended order can be edited freely.
const rank = { Leicht: 0, Mittel: 1, Schwer: 2 };
const sorted = levels
  .map((l, i) => ({ l, i }))
  .sort(
    (a, b) =>
      rank[a.l.difficulty.tier] - rank[b.l.difficulty.tier] ||
      a.l.difficulty.score - b.l.difficulty.score ||
      a.i - b.i,
  );
// Start with the three smallest easy puzzles, then use reasoning demand.
const warm = sorted
  .filter((x) => x.l.n === 3 && x.l.difficulty.tier === 'Leicht')
  .slice(0, 3);
const order = [...warm, ...sorted.filter((x) => !warm.includes(x))];
// A short, already understood technique after the first medium tasks provides a breather.
const easy = order.filter((x) => x.l.difficulty.tier === 'Leicht');
if (easy.length > 4) {
  const relief = easy.at(-1);
  order.splice(order.indexOf(relief), 1);
  const firstMedium = order.findIndex((x) => x.l.difficulty.tier === 'Mittel');
  order.splice(firstMedium + 3, 0, relief);
}
order.forEach(({ l }, i) => (l.order = i));
levels.forEach((l) => (l.lesson = null));
const lessons = [
  'Beginne am Rand: Kein Anschluss darf nach außen zeigen.',
  'Prüfe beide Seiten: Ein Weg braucht einen passenden Nachbarn.',
  'Behalte das ganze Netz im Blick: Am Ende muss jede Kachel die Quelle erreichen.',
];
order.slice(0, 3).forEach(({ l }, i) => (l.lesson = lessons[i]));
for (let i = 0; i < source.length; i++)
  for (const key of ['n', 'source', 'initial', 'solution'])
    assert.deepEqual(
      levels[i][key],
      source[i][key],
      'Changed existing puzzle ' + i,
    );
for (const l of levels) {
  assert(evaluate(l.solution, l.n, l.source).solved);
  assert.equal(solutions(l.initial, l.n, l.source).length, 1);
}
assert.equal(levels.length, 30);
assert.equal(new Set(levels.map((l) => l.id)).size, 30);
writeFileSync('lib/levels.json', JSON.stringify(levels));
const method = {
  local: 'Nachbarn und Anschlussketten',
  network: 'Verbindung des gesamten Netzes',
  lookahead: 'Möglichkeiten durchdenken',
  search: 'Mehrstufige Suche',
};
const rows = order.map(
  ({ l, i }) =>
    '| ' +
    (l.order + 1) +
    ' | ' +
    String(i + 1).padStart(2, '0') +
    ' | ' +
    l.name +
    ' | ' +
    l.n +
    '×' +
    l.n +
    ' | ' +
    l.difficulty.tier +
    ' | ' +
    method[l.difficulty.method] +
    ' | ' +
    l.difficulty.score +
    ' |',
);
const report =
  '# Rätselprüfung – Leuchtwege\n\n30 eindeutige Rätsel. Die bestehenden 21 Anordnungen und Speicherplätze bleiben erhalten. Die folgende Reihenfolge ist eine redaktionelle Empfehlung; die Schwierigkeit ist eine begründete Schätzung, keine Messung mit Spielern.\n\n## Bewertungsgrundlage\n\n- Leicht: Anschlussketten mit geringer mittlerer Ableitungstiefe.\n- Mittel: längere Anschlussketten oder notwendige Verbindungen zwischen Teilnetzen.\n- Schwer: die implementierten direkten Regeln reichen nicht; einzelne Möglichkeiten werden auf Widersprüche geprüft. Menschen können andere direkte Schlüsse finden.\n- Die Feldgröße wird getrennt angezeigt und erhält keinen eigenen Schwierigkeitsbonus.\n- Neue Rätsel sind eindeutig und keine gedrehten/gespiegelten Duplikate. Über 90 % identische Bauteiltypen an entsprechenden Positionen werden für neue Rätsel vermieden. Dies ist eine einfache Ähnlichkeitsprüfung, kein Beweis gleicher Spielerfahrung.\n- Manuelle Zuordnungen können mit Begründung in difficulty-overrides.json hinterlegt werden; aktuell gibt es keine vorgetäuschten Spielerbewertungen.\n\n## Empfohlene Spielreihenfolge\n\n| Schritt | Stabile Nr. | Rätsel | Feld | Stufe | Benötigte Methode im Prüfer | Vergleichswert |\n|---|---|---|---|---|---|---|\n' +
  rows.join('\n') +
  '\n\nEin kurzer leichterer Abschnitt nach den ersten mittleren Aufgaben ist beabsichtigt. Der Vergleichswert ist nur innerhalb dieser Bewertungsmethode sinnvoll und wird im Spiel nicht als objektive Bewertung angezeigt.\n';
mkdirSync('docs', { recursive: true });
writeFileSync('docs/level-review.md', report);
console.log(
  JSON.stringify({
    count: levels.length,
    attempts,
    tiers: Object.fromEntries(
      Object.keys(rank).map((t) => [
        t,
        levels.filter((l) => l.difficulty.tier === t).length,
      ]),
    ),
    changes: source
      .slice(0, 21)
      .flatMap((l, i) =>
        l.difficulty.tier !== levels[i].difficulty.tier
          ? [
              {
                number: i + 1,
                from: l.difficulty.tier,
                to: levels[i].difficulty.tier,
              },
            ]
          : [],
      ),
    new: levels
      .slice(21)
      .map((l) => ({
        name: l.name,
        n: l.n,
        tier: l.difficulty.tier,
        method: l.difficulty.method,
      })),
  }),
);
