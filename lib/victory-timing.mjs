export const SETTLE_MS = 300;
export const BOARD_VIEW_MS = 1500;
export function victoryTimeline({
  glow,
  reveal,
  schedule = setTimeout,
  unschedule = clearTimeout,
}) {
  let cancelled = false;
  const timers = [
    schedule(() => {
      if (!cancelled) glow();
    }, SETTLE_MS),
    schedule(() => {
      if (!cancelled) reveal();
    }, SETTLE_MS + BOARD_VIEW_MS),
  ];
  return () => {
    cancelled = true;
    timers.forEach(unschedule);
  };
}
