export const slidingRanges = {
  slide: [
    [4, 7],
    [10, 14],
    [17, 21],
  ],
  rotate: [
    [2, 3],
    [4, 5],
    [6, 8],
  ],
};
// Distance is to ANY solved arrangement, not just the stored target.
export function slidingDifficulty(mode, minSlides) {
  if (!slidingRanges[mode] || !Number.isInteger(minSlides) || minSlides < 0)
    throw Error('Invalid sliding distance');
  const [easy, medium] = slidingRanges[mode];
  return minSlides <= easy[1]
    ? 'Leicht'
    : minSlides <= medium[1]
      ? 'Mittel'
      : 'Schwer';
}
