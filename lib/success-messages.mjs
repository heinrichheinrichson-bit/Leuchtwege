// Original, bilingual microcopy. No attributed quotations or performance claims.
export const successMessages = [
  [
    'spark',
    'Ein heller Moment!',
    'A bright moment!',
    'Das hast du zum Leuchten gebracht.',
    'You brought it to life.',
  ],
  [
    'click',
    'Klick. Es passt!',
    'Click. It fits!',
    'Ein schöner Moment, wenn alles zusammenkommt.',
    'That lovely moment when everything comes together.',
  ],
  [
    'aha',
    'Da ist der Aha-Moment!',
    'There’s that aha moment!',
    'Genieß kurz dein fertiges Werk.',
    'Take a moment to enjoy your finished puzzle.',
  ],
  [
    'done',
    'Geschafft!',
    'You did it!',
    'Ein Rätsel weniger. Ein Lächeln mehr.',
    'One less puzzle. One more smile.',
  ],
  [
    'bright',
    'Sieht nach Erfolg aus.',
    'Looks like a win.',
    'Und leuchtet auch so.',
    'Glows like one, too.',
  ],
  [
    'idea',
    'Gute Idee. Gutes Ende.',
    'Good thinking. Happy ending.',
    'Die letzte Verbindung sitzt.',
    'That final connection is in place.',
  ],
  [
    'tada',
    'Tadaa!',
    'Ta-da!',
    'Dieses Leuchten gehört dir.',
    'This glow is yours.',
  ],
  [
    'little',
    'Kleine Freude verdient.',
    'A little joy, well earned.',
    'Lass den Moment kurz wirken.',
    'Let this moment sink in.',
  ],
  [
    'light',
    'Licht an!',
    'Lights on!',
    'Das Rätsel darf jetzt Feierabend machen.',
    'This puzzle can clock off now.',
  ],
  [
    'circuit',
    'Alles im grünen Bereich.',
    'All systems glow.',
    'Die Kacheln sind sich endlich einig.',
    'The tiles have finally agreed.',
  ],
  [
    'bow',
    'Eine kleine Verbeugung.',
    'Take a little bow.',
    'Auch ein stiller Erfolg darf gefeiert werden.',
    'Even a quiet success deserves a celebration.',
  ],
  [
    'party',
    'Kleine Lichtparty!',
    'A little light party!',
    'Konfetti im Kopf zählt auch.',
    'Confetti in your head counts, too.',
  ],
  [
    'break',
    'Rätsel gelöst. Schultern locker.',
    'Puzzle solved. Shoulders relaxed.',
    'Ein guter Moment zum Durchatmen.',
    'A good moment to take a breath.',
  ],
  [
    'thanks',
    'Schön, dass du da bist.',
    'Glad you’re here.',
    'Danke für deine kleine Rätselpause mit Tvispy.',
    'Thanks for spending a puzzle break with Tvispy.',
  ],
  [
    'time',
    'Dein kleiner Lichtblick.',
    'Your little bright spot.',
    'Danke, dass du dir Zeit zum Knobeln nimmst.',
    'Thanks for taking a little time to puzzle.',
  ],
  [
    'company',
    'Zusammen macht’s Freude.',
    'Better with you here.',
    'Danke fürs Mitknobeln.',
    'Thanks for puzzling along.',
  ],
  [
    'moment',
    'Dieser Moment zählt.',
    'This moment counts.',
    'Ein kleiner Erfolg ist auch ein Erfolg.',
    'A little win is still a win.',
  ],
  [
    'path',
    'Der Weg ist gefunden.',
    'You found the way.',
    'Manchmal macht erst das Ende alles klar.',
    'Sometimes the ending makes everything clear.',
  ],
  [
    'pieces',
    'Alles fügt sich.',
    'It all comes together.',
    'So sieht ein fertiger Gedanke aus.',
    'That’s what a finished thought looks like.',
  ],
  [
    'pause',
    'Kurz innehalten.',
    'Pause for a moment.',
    'Dein fertiges Rätsel kann sich sehen lassen.',
    'Your finished puzzle deserves a look.',
  ],
  [
    'yes',
    'Ja, genau so!',
    'Yes, just like that!',
    'Das war die letzte Verbindung.',
    'That was the final connection.',
  ],
  [
    'glow',
    'Ein bisschen mehr Licht.',
    'A little more light.',
    'Und vielleicht ein kleines Lächeln.',
    'And perhaps a little smile.',
  ],
  [
    'mystery',
    'Geheimnis gelüftet.',
    'Mystery solved.',
    'Die Kacheln verraten jetzt ihren Plan.',
    'The tiles have revealed their plan.',
  ],
  [
    'applause',
    'Leiser Applaus für dich.',
    'A quiet round of applause.',
    'Nicht laut. Aber herzlich.',
    'Not loud. Just heartfelt.',
  ],
  [
    'sparkle',
    'Das funkelt!',
    'That sparkles!',
    'Ein schöner Abschluss für dieses Rätsel.',
    'A lovely finish to this puzzle.',
  ],
  [
    'breathe',
    'Fertig. Und ausatmen.',
    'Done. And breathe out.',
    'Du darfst den Erfolg einfach genießen.',
    'You can simply enjoy this win.',
  ],
  [
    'bulb',
    'Die Kacheln sagen: Danke!',
    'The tiles say: thank you!',
    'Im Dunkeln war’s auf Dauer etwas langweilig.',
    'It was getting a little boring in the dark.',
  ],
  [
    'team',
    'Ein eingespieltes Team.',
    'A team in sync.',
    'Du und diese Kacheln: passt.',
    'You and these tiles: a good match.',
  ],
  [
    'smile',
    'Ein Grund zum Lächeln.',
    'A reason to smile.',
    'Dafür sind kleine Rätselpausen da.',
    'That’s what little puzzle breaks are for.',
  ],
  [
    'order',
    'Aus Teilen wird ein Ganzes.',
    'Pieces become a whole.',
    'Schön, wenn ein Plan aufgeht.',
    'Lovely when a plan comes together.',
  ],
  [
    'found',
    'Gefunden!',
    'Found it!',
    'So fühlt sich ein Lichtblick an.',
    'That’s what a bright spot feels like.',
  ],
  [
    'welcome',
    'Noch ein schöner Moment.',
    'Another lovely moment.',
    'Schön, dass Tvispy dich begleiten darf.',
    'Glad Tvispy could be part of your day.',
  ],
].map(([id, deTitle, enTitle, deBody, enBody]) => ({
  id,
  de: { title: deTitle, body: deBody },
  en: { title: enTitle, body: enBody },
}));
export const successMessageKey = 'tvispy-success-messages-v1';
const ids = new Set(successMessages.map((m) => m.id));
export function selectSuccessMessage(raw, attempt, random = Math.random) {
  const previous = raw?.version === 1 ? raw : {};
  const history = Array.isArray(previous.history)
    ? previous.history
        .filter((h) => h && typeof h.attempt === 'string' && ids.has(h.id))
        .slice(-64)
    : [];
  const existing = history.find((h) => h.attempt === attempt);
  if (existing)
    return {
      message: successMessages.find((m) => m.id === existing.id),
      state: previous,
    };
  let remaining = Array.isArray(previous.remaining)
    ? [...new Set(previous.remaining.filter((id) => ids.has(id)))]
    : [];
  if (!remaining.length) {
    remaining = [...ids];
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    // No immediate repeat when a fresh bag begins.
    if (remaining[0] === history.at(-1)?.id)
      [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
  }
  const id = remaining.shift();
  return {
    message: successMessages.find((m) => m.id === id),
    state: {
      version: 1,
      remaining,
      history: [...history, { attempt, id }].slice(-64),
    },
  };
}
let memory = null;
export function completionMessage(attempt) {
  let stored = memory;
  try {
    stored = JSON.parse(localStorage.getItem(successMessageKey)) || memory;
  } catch {}
  const result = selectSuccessMessage(stored, attempt);
  memory = result.state;
  try {
    localStorage.setItem(successMessageKey, JSON.stringify(memory));
  } catch {}
  return result.message;
}
