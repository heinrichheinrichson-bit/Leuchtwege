export const rotate = (m) => ((m << 1) & 15) | (m >> 3);
export function neighbor(i, d, n) {
  const x = i % n,
    y = Math.floor(i / n);
  return d === 0
    ? y
      ? i - n
      : -1
    : d === 1
      ? x < n - 1
        ? i + 1
        : -1
      : d === 2
        ? y < n - 1
          ? i + n
          : -1
        : x
          ? i - 1
          : -1;
}
export function evaluate(board, n, source) {
  const lit = new Set([source]);
  const queue = [source];
  let open = 0;
  for (let i = 0; i < board.length; i++)
    for (let d = 0; d < 4; d++)
      if (board[i] & (1 << d)) {
        const j = neighbor(i, d, n);
        if (j < 0 || !(board[j] & (1 << ((d + 2) % 4)))) open++;
      }
  for (const i of queue)
    for (let d = 0; d < 4; d++) {
      const j = neighbor(i, d, n);
      if (
        j >= 0 &&
        board[i] & (1 << d) &&
        board[j] & (1 << ((d + 2) % 4)) &&
        !lit.has(j)
      ) {
        lit.add(j);
        queue.push(j);
      }
    }
  return { lit, open, solved: lit.size === board.length && open === 0 };
}
export function solutions(board, n, source, limit = 2) {
  const domains = board.map((m, i) => {
    const a = [];
    for (let k = 0; k < 4; k++, m = rotate(m))
      if (
        !a.includes(m) &&
        [0, 1, 2, 3].every((d) => neighbor(i, d, n) >= 0 || !(m & (1 << d)))
      )
        a.push(m);
    return a;
  });
  const found = [];
  function search(ds) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < ds.length; i++) {
        const next = ds[i].filter((m) =>
          [0, 1, 2, 3].every((d) => {
            const j = neighbor(i, d, n);
            return (
              j < 0 ||
              ds[j].some(
                (v) =>
                  Boolean(m & (1 << d)) === Boolean(v & (1 << ((d + 2) % 4))),
              )
            );
          }),
        );
        if (!next.length) return;
        if (next.length !== ds[i].length) {
          ds[i] = next;
          changed = true;
        }
      }
    }
    let at = -1;
    for (let i = 0; i < ds.length; i++)
      if (ds[i].length > 1 && (at < 0 || ds[i].length < ds[at].length)) at = i;
    if (at < 0) {
      const b = ds.map((a) => a[0]);
      if (evaluate(b, n, source).solved) found.push(b);
      return;
    }
    for (const v of ds[at]) {
      const copy = ds.map((a) => a.slice());
      copy[at] = [v];
      search(copy);
      if (found.length >= limit) return;
    }
  }
  search(domains);
  return found;
}
