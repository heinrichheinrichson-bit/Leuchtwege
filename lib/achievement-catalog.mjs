// IDs and thresholds are permanent: adding tiers must not revoke earned awards.
export const achievementTracks = [
  {
    kind: 'count',
    title: 'Lichtsammler',
    detail: 'Verschiedene Rätsel lösen',
    targets: [1, 10, 25, 50, 100, 200, 250, 500, 1000, 2500, 5000, 10000],
  },
  {
    kind: 'turn',
    title: 'Drehkunst',
    detail: 'Verschiedene Drehrätsel lösen',
    targets: [10, 25, 50, 100, 250, 500, 1000, 2500],
  },
  {
    kind: 'slide',
    title: 'Wegbereiter',
    detail: 'Verschiedene Rätsel mit Nur Schieben lösen',
    targets: [10, 25, 50, 100, 250, 500, 1000, 2500],
  },
  {
    kind: 'rotate',
    title: 'Verwandlungskünstler',
    detail: 'Verschiedene Rätsel mit Schieben & Drehen lösen',
    targets: [10, 25, 50, 100, 250, 500, 1000, 2500],
  },
  {
    kind: 'hard',
    title: 'Harter Kern',
    detail: 'Verschiedene schwere Rätsel lösen',
    targets: [1, 10, 25, 50, 100, 250, 500, 1000],
  },
  {
    kind: 'clear',
    title: 'Klarer Kopf',
    detail: 'Verschiedene Rätsel ohne Tipps lösen',
    targets: [10, 25, 50, 100, 200, 250, 500, 1000, 2500],
  },
  {
    kind: 'free',
    title: 'Entdeckergeist',
    detail: 'Verschiedene Zufallsrätsel lösen',
    targets: [10, 25, 50, 100, 250, 500, 1000, 2500],
  },
  {
    kind: 'daily',
    title: 'Tageslicht',
    detail: 'Verschiedene Tagesrätsel lösen',
    targets: [3, 10, 30, 100, 250, 500, 1000, 2500],
  },
  {
    kind: 'days',
    title: 'Immer wieder Licht',
    detail:
      'An verschiedenen Tagen ein Rätsel abschließen – Pausen sind erlaubt',
    targets: [3, 7, 10, 25, 30, 50, 60, 100, 180, 200, 365, 500, 730, 1000],
  },
  {
    kind: 'streak',
    title: 'Lichtserie',
    detail: 'An aufeinanderfolgenden Tagen ein Rätsel abschließen',
    targets: [7, 14, 30, 60, 100, 180, 365, 730, 1000],
  },
  {
    kind: 'modes',
    title: 'Alleskönner',
    detail: 'In Drehen, Nur Schieben und Schieben & Drehen je ein Rätsel lösen',
    targets: [3],
  },
];
achievementTracks.push(
  {
    kind: 'finishes',
    title: 'Ein Lichtblick nach dem anderen',
    detail: 'Partien abschließen – auch erneut gespielte Rätsel zählen',
    targets: [10, 25, 50, 100, 200, 500, 1000, 2500, 5000, 10000],
  },
  {
    kind: 'catalog',
    title: 'Sammlerstück',
    detail: 'Verschiedene Katalogrätsel lösen',
    targets: [5, 10, 25, 50, 100, 200, 270],
  },
  {
    kind: 'time',
    title: 'Zeit zum Leuchten',
    detail: 'Aktive Spielzeit in regulär abgeschlossenen Rätseln',
    targets: [1, 5, 10, 25, 50, 100, 250, 500, 1000].map((h) => h * 3600),
  },
  {
    kind: 'hardclear',
    title: 'Ohne Netz und doppelten Boden',
    detail: 'Verschiedene schwere Rätsel ohne Tipps lösen',
    targets: [1, 5, 10, 25, 50, 100, 250, 500],
  },
  {
    kind: 'big',
    title: 'Das große Ganze',
    detail: 'Verschiedene Rätsel ab 5 × 5 lösen',
    targets: [5, 10, 25, 50, 100, 250, 500],
  },
  {
    kind: 'balanced',
    title: 'Auf allen Wegen',
    detail:
      'Je so viele Rätsel in Drehen, Nur Schieben und Schieben & Drehen lösen',
    targets: [5, 10, 25, 50, 100, 250, 500],
  },
  {
    kind: 'trios',
    title: 'Dreifaches Tageslicht',
    detail: 'Alle drei Tagesrätsel eines Datums lösen',
    targets: [1, 3, 7, 14, 30, 50, 100, 250, 365],
  },
  {
    kind: 'dual',
    title: 'Doppelte Energie',
    detail: 'Verschiedene Rätsel mit Zwei Stromkreise lösen',
    targets: [1, 5, 10, 25, 50, 100, 250, 500],
  },
  {
    kind: 'path',
    title: 'Zielsicher',
    detail: 'Verschiedene Lichtweg-Rätsel lösen',
    targets: [1, 5, 10, 25, 50, 100, 250, 500],
  },
  {
    kind: 'linked',
    title: 'Gemeinsam gedreht',
    detail: 'Verschiedene Rätsel mit gekoppelten Drehungen lösen',
    targets: [1, 5, 10, 25, 50, 100, 250, 500],
  },
);
achievementTracks.push(
  {
    kind: 'independent',
    title: 'Ganz ohne Hilfe',
    detail:
      'Partien ohne Tipps oder Testhilfe abschließen – auch Wiederholungen zählen',
    targets: [10, 50, 100, 200, 500, 1000, 2500],
  },
  ...['turn', 'slide', 'rotate', 'dual', 'path', 'linked'].map((mode) => ({
    kind: `optimal_${mode}`,
    title: {
      turn: 'Drehperfektion',
      slide: 'Perfekt geschoben',
      rotate: 'Perfekt kombiniert',
      dual: 'Doppelt perfekt',
      path: 'Direkt ins Licht',
      linked: 'Perfekt gekoppelt',
    }[mode],
    detail:
      'Verschiedene Rätsel mit nachgewiesener Mindestzugzahl lösen – ohne Tipps und zusätzliche Züge',
    targets: [1, 10, 50, 100, 200, 500, 1000],
  })),
);
// Reward depends on the permanent threshold, not the position of a tier in a list.
export function achievementXp(kind, target) {
  const units = kind === 'time' ? target / 3600 : target;
  return Math.min(400, 25 * (1 + Math.floor(Math.log2(Math.max(1, units)))));
}
export function achievementCounter(kind, value, language = 'de-DE') {
  if (kind !== 'time') return Math.floor(value).toLocaleString(language);
  const hours = Math.floor(value / 3600),
    minutes = Math.floor((value % 3600) / 60);
  return (
    hours +
    (language.startsWith('de') ? ' Std.' : ' h') +
    (minutes ? ' ' + minutes + ' min' : '')
  );
}

const legacy = {
  'count:1': ['first', 'Erster Lichtblick', 'Löse dein erstes Rätsel.'],
  'count:10': ['ten', 'Im Fluss', 'Löse 10 verschiedene Rätsel.'],
  'count:100': ['hundred', 'Lichtsammler', 'Löse 100 verschiedene Rätsel.'],
  'modes:3': [
    'all',
    'Alleskönner',
    'In Drehen, Nur Schieben und Schieben & Drehen je ein Rätsel lösen',
  ],
  'hard:1': ['hard', 'Harter Kern', 'Löse ein schweres Rätsel.'],
  'clear:10': [
    'clear',
    'Klarer Kopf',
    'Löse 10 verschiedene Rätsel ohne Tipps.',
  ],
  'streak:7': [
    'week',
    'Eine Woche Licht',
    'Schließe an sieben aufeinanderfolgenden Tagen ein Spiel ab.',
  ],
};
export const achievementDefinitions = achievementTracks.flatMap((track) =>
  track.targets.map((target) => {
    const old = legacy[`${track.kind}:${target}`];
    return {
      id: old?.[0] || `${track.kind}-${target}`,
      title: old?.[1] || track.title,
      detail: old?.[2] || track.detail,
      target,
      points: achievementXp(track.kind, target),
      kind: track.kind,
    };
  }),
);
export function groupAchievements(achievements) {
  return achievementTracks.map((track) => {
    const stages = achievements.filter((a) => a.kind === track.kind);
    return {
      ...track,
      stages,
      earned: stages.filter((a) => a.done).length,
      next: stages.find((a) => !a.done) || stages.at(-1),
    };
  });
}
