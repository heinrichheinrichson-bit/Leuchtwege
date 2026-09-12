// Monotonic time: wall-clock changes and time spent paused do not count.
export function activeTimer(now) {
  let last = now(),
    running = false;
  return {
    sample(active) {
      const at = now(),
        delta = running ? Math.max(0, at - last) : 0;
      last = at;
      running = active;
      return delta;
    },
  };
}
