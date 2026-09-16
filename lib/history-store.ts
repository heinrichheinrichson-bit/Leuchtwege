import {
  emptyHistory,
  restoreHistory,
  updateAttempt,
} from './play-history.mjs';
const key = 'leuchtwege-history-v1';
import { advanceFreeze } from './streak-freeze.mjs';
let memory: any = null;
let dirty = false;
export function readHistory() {
  try {
    if(!dirty || !memory) memory = restoreHistory(JSON.parse(localStorage.getItem(key) || 'null'));
  } catch {
    memory ??= emptyHistory();
  }
  const freeze = advanceFreeze(memory.freeze, memory.attempts);
  if (dirty || JSON.stringify(freeze) !== JSON.stringify(memory.freeze)) {
    memory = { ...memory, freeze };
    try {
      localStorage.setItem(key, JSON.stringify(memory));
      dirty = false;
    } catch {
      dirty = true;
    }
  }
  return memory;
}
export function changeHistory(fn: (data: any) => any) {
  const updated = fn(readHistory());
  const data = {
    ...updated,
    freeze: advanceFreeze(updated.freeze, updated.attempts),
  };
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
