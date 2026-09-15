// IDs and thresholds are permanent: adding tiers must not revoke earned awards.
export const achievementTracks = [
  {
    kind: 'count',
    title: 'Lichtsammler',
    detail: 'Verschiedene Rätsel lösen',
    targets: [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
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
    targets: [10, 25, 50, 100, 250, 500, 1000, 2500],
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
    targets: [7, 30, 60, 100, 180, 365, 730, 1000],
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
    detail: 'In jedem der drei Spielmodi ein Rätsel lösen',
    targets: [3],
  },
];
const legacy = {
  'count:1': ['first', 'Erster Lichtblick', 'Löse dein erstes Rätsel.'],
  'count:10': ['ten', 'Im Fluss', 'Löse 10 verschiedene Rätsel.'],
  'count:100': ['hundred', 'Lichtsammler', 'Löse 100 verschiedene Rätsel.'],
  'modes:3': ['all', 'Alleskönner', 'Löse ein Rätsel in jedem Spielmodus.'],
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
