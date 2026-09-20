import { rotate } from './game.mjs';

// Ignore scramble, source IDs, pair numbers and a global rotation of the board.
// Linked groups retain their relative orientation: that is part of their rule.
export function variantFingerprint(l) {
  const forms = [];
  for (let turn = 0; turn < 4; turn++) {
    const pos = (i) => {
      let x = i % l.n,
        y = Math.floor(i / l.n);
      for (let k = 0; k < turn; k++) [x, y] = [l.n - 1 - y, x];
      return y * l.n + x;
    };
    const groups = l.groups
      .map((group) => {
        const cells = [...group].sort((a, b) => pos(a) - pos(b));
        let masks = cells.map((i) => l.initial[i]);
        const shapes = [];
        for (let k = 0; k < 4; k++) {
          shapes.push(masks.join(','));
          masks = masks.map(rotate);
        }
        return [cells.map(pos).join(','), shapes.sort()[0]].join(':');
      })
      .sort();
    const owners = Array(l.n * l.n);
    l.owners.forEach((v, i) => (owners[pos(i)] = v));
    forms.push(
      JSON.stringify([
        l.mode,
        l.n,
        groups,
        l.mode === 'dual' ? owners : [],
        l.sources.map(pos).sort((a, b) => a - b),
        l.targets.map(pos).sort((a, b) => a - b),
      ]),
    );
  }
  return forms.sort()[0];
}
