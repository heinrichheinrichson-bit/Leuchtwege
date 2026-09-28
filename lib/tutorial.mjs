import { act, fresh, boardOf } from './session.mjs';
import {
  freshSliding,
  slideAct,
  slidingBoard,
  slidingStatus,
} from './sliding.mjs';
import { variantCatalog, variantStatus, variantAct } from './variants.mjs';
import { rotate } from './game.mjs';
import { evaluate } from './game.mjs';

const positions = [0, 1, 2, 3, 4, 5, 6, 7, null];
const sliding = {
  n: 3,
  pieces: [2, 10, 12, 6, 10, 9, 3, 8],
  sourceId: 0,
  solution: { positions, turns: Array(8).fill(0) },
};
export const tutorials = {
  turn: {
    title: 'Drehen',
    puzzle: {
      id: 'learn-turn',
      n: 3,
      source: 0,
      initial: [2, 11, 12, 6, 11, 9, 3, 10, 8],
      solution: [2, 14, 12, 6, 11, 9, 3, 10, 8],
    },
    steps: [
      {
        action: { type: 'turn', index: 1 },
        title: 'Licht allein reicht noch nicht',
        text: 'Der helle Kreis ist die Quelle. Hier leuchten bereits alle Kacheln, aber oben bleibt ein Anschluss offen. Tippe einmal auf die markierte Kachel.',
      },
      {
        action: { type: 'turn', index: 1 },
        title: 'Beim Probieren darf Licht ausgehen',
        text: 'Jetzt ist der Weg von der Quelle unterbrochen. Das ist kein Fehler, für den du bestraft wirst. Drehe dieselbe Kachel noch einmal.',
      },
    ],
    takeaway:
      'Gelöst heißt: Alle Kacheln sind mit der Quelle verbunden und kein Anschluss bleibt offen. Rückgängig hilft dir jederzeit beim Ausprobieren.',
  },
  slide: {
    title: 'Nur Schieben',
    puzzle: {
      ...sliding,
      id: 'learn-slide',
      mode: 'slide',
      initial: {
        positions: [0, 1, 2, 3, 4, 5, null, 6, 7],
        turns: Array(8).fill(0),
      },
    },
    steps: [
      {
        action: { type: 'slide', id: 6 },
        title: 'Platz zum Bewegen',
        text: 'Wische die markierte Kachel nach links ins Leerfeld. Du kannst auch erst die Kachel und dann das Leerfeld antippen. Nur direkte Nachbarn lassen sich schieben.',
      },
      {
        action: { type: 'slide', id: 7 },
        title: 'Das Leerfeld wandert mit',
        text: 'Schiebe jetzt die nächste markierte Kachel nach links ins Leerfeld. Probiere gern die andere Bedienung: Kachel antippen, dann Leerfeld antippen.',
      },
    ],
    takeaway:
      'Die Kacheln behalten ihre Ausrichtung. Verbinde alle acht mit der Quelle; das Leerfeld bleibt frei und darf keinen offenen Anschluss bekommen.',
  },
  rotate: {
    title: 'Schieben & Drehen',
    puzzle: {
      ...sliding,
      id: 'learn-rotate',
      mode: 'rotate',
      initial: {
        positions: [0, 1, 2, 3, 4, 5, null, 6, 7],
        turns: [0, 0, 0, 0, 3, 0, 0, 0],
      },
    },
    steps: [
      {
        action: { type: 'slide', id: 6 },
        title: 'Zuerst den Platz finden',
        text: 'Schiebe die markierte Kachel nach links ins Leerfeld – mit einem Wisch oder durch Antippen von Kachel und Leerfeld.',
      },
      {
        action: { type: 'slide', id: 7 },
        title: 'Den Weg weiterbauen',
        text: 'Schiebe auch diese Kachel nach links. Das Verschieben allein reicht diesmal noch nicht: Eine Kachel ist zusätzlich verdreht.',
      },
      {
        action: { type: 'turn', id: 4 },
        title: 'Antippen wählt. Nochmals tippen dreht.',
        text: 'Tippe die markierte Kachel in der Mitte an, um sie auszuwählen. Tippe sie dann erneut an: Sie dreht sich um 90 Grad.',
      },
    ],
    takeaway:
      'Schieben verändert den Platz, Drehen die Ausrichtung. Die Quelle wandert mit ihrer Kachel mit. Jedes vollständige Netz ohne offene Anschlüsse zählt.',
  },
};
// Small guided variants use the same rules as the real games.
for (const mode of ['dual', 'linked']) {
  const base = variantCatalog.find((p) => p.mode === mode && p.n === 3);
  const group =
    mode === 'linked'
      ? base.groups.find((g) => g.length > 1)
      : [base.sources[0]];
  const initial = [...base.solution];
  for (const i of group) initial[i] = rotate(rotate(initial[i]));
  tutorials[mode] = {
    title: mode === 'dual' ? 'Zwei Stromkreise' : 'Gekoppelte Drehungen',
    puzzle: { ...base, id: `learn-${mode}`, initial },
    steps: [
      {
        action: { type: 'turn', index: group[0] },
        title:
          mode === 'dual' ? 'Zwei Quellen, zwei Netze' : 'Gemeinsam drehen',
        text:
          mode === 'dual'
            ? 'A und B gehören zu getrennten Lichtquellen. Drehe die markierte Kachel und beobachte, welches Netz leuchtet.'
            : 'Gleiche Zahlen gehören zusammen. Tippe die markierte Kachel an: Beide Kacheln drehen sich gemeinsam.',
      },
      {
        action: { type: 'turn', index: group[0] },
        title: 'Die Verbindung schließen',
        text:
          mode === 'dual'
            ? 'Drehe die markierte Kachel noch einmal. Alle A-Kacheln müssen mit A verbunden sein, alle B-Kacheln mit B. Die Netze dürfen sich nicht berühren.'
            : 'Drehe dieselbe Gruppe noch einmal. Beide Kacheln müssen gleichzeitig passen, damit das ganze Netz geschlossen ist.',
      },
    ],
    takeaway:
      mode === 'dual'
        ? 'Zwei getrennte Netze, keine offenen Anschlüsse. Buchstaben und Farben zeigen dir, was zusammengehört.'
        : 'Plane gekoppelte Kacheln gemeinsam. Kacheln ohne Zahl lassen sich einzeln drehen.',
  };
}
tutorials.path = {
  title: 'Lichtweg',
  puzzle: {
    id: 'learn-path',
    mode: 'path',
    variant: 'path',
    n: 3,
    source: 0,
    sources: [0],
    owners: Array(9).fill(0),
    targets: [1, 2],
    groups: Array.from({ length: 9 }, (_, i) => [i]),
    initial: [2, 14, 8, 2, 2, 8, 2, 8, 1],
    solution: [2, 14, 8, 2, 1, 8, 2, 8, 1],
  },
  steps: [
    {
      action: { type: 'turn', index: 4 },
      title: 'Sterne sind erst der Anfang',
      text: 'Beide Sterne leuchten bereits. Trotzdem ist der Lichtweg noch offen. Drehe die markierte Kachel, um den offenen Anschluss zu schließen.',
    },
    {
      action: { type: 'turn', index: 4 },
      title: 'Den Anschluss finden',
      text: 'Die Kachel muss nach oben zur leuchtenden Abzweigung zeigen. Drehe sie weiter.',
    },
    {
      action: { type: 'turn', index: 4 },
      title: 'Die Verbindung schließen',
      text: 'Noch eine Drehung nach oben schließt das Lichtnetz. Die übrigen dunklen Kacheln dürfen dunkel bleiben.',
    },
  ],
  takeaway:
    'Verbinde alle Sterne mit der Quelle und schließe alle Anschlüsse im leuchtenden Netz. Dunkle Kacheln müssen nicht verbunden werden.',
};
export function newTutorial(mode) {
  const l = tutorials[mode].puzzle;
  return { step: 0, session: l.pieces ? freshSliding(l) : fresh(l) };
}
export function tutorialBoard(mode, state) {
  const l = tutorials[mode].puzzle;
  return l.pieces ? slidingBoard(l, state.session) : boardOf(l, state.session);
}
export function tutorialStatus(mode, state) {
  const l = tutorials[mode].puzzle;
  if (l.pieces) return slidingStatus(l, state.session);
  if (l.variant) {
    const result = variantStatus(l, state.session);
    return { ...result, litIds: result.lit };
  }
  const result = evaluate(boardOf(l, state.session), 3, l.source);
  return { ...result, litIds: result.lit };
}
export function tutorialAct(mode, state, action) {
  const lesson = tutorials[mode],
    expected = lesson.steps[state.step]?.action;
  if (
    !expected ||
    action.type !== expected.type ||
    action.id !== expected.id ||
    action.index !== expected.index
  )
    return state;
  const l = lesson.puzzle,
    session = l.pieces
      ? slideAct(l, state.session, action)
      : l.variant
        ? variantAct(l, state.session, action)
        : act(l, state.session, action);
  return session === state.session ? state : { step: state.step + 1, session };
}
export function tutorialProgress(raw) {
  return Object.fromEntries(
    Object.keys(tutorials).map((mode) => [mode, raw?.[mode] === true]),
  );
}
