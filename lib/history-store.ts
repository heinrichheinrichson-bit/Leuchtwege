import {
  emptyHistory,
  restoreHistory,
  updateAttempt,
} from './play-history.mjs';
const key = 'leuchtwege-history-v1';
let memory: any = null;
let dirty = false;
export function readHistory() {
  if (dirty && memory) return memory;
  try {
    memory = restoreHistory(JSON.parse(localStorage.getItem(key) || 'null'));
  } catch {
    memory ??= emptyHistory();
  }
  return memory;
}
export function changeHistory(fn: (data: any) => any) {
  const data = fn(readHistory());
  memory = data;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    dirty = false;
    window.dispatchEvent(new Event('leuchtwege-history'));
    return { data, error: false };
  } catch {
    dirty = true;
    return { data, error: true };
  }
}
export function recordAttempt(meta: any, event: any) {
  return changeHistory((data) =>
    updateAttempt(data, meta, {
      id: crypto.randomUUID(),
      now: new Date().toISOString(),
      ...event,
    }),
  );
}
