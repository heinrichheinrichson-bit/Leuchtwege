const rank = { Leicht: 0, Mittel: 1, Schwer: 2 };
export function slidingOrder(levels, mode) {
  return levels
    .map((l, i) => i)
    .filter((i) => levels[i].mode === mode)
    .sort(
      (a, b) =>
        rank[levels[a].tier] - rank[levels[b].tier] ||
        levels[a].minSlides - levels[b].minSlides ||
        a - b,
    );
}
