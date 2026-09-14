import { restore } from './session.mjs';
import { restoreSliding } from './sliding.mjs';
import { restoreFree } from './random-game.mjs';
import { restoreFreeSliding } from './random-sliding.mjs';
import { restoreDaily } from './daily-generator.mjs';
import { restoreHistory } from './play-history.mjs';
import { hintBudget } from './hint-budget.mjs';
import { validDay } from './daily.mjs';
import { preferences } from './preferences.mjs';

export const undoKey = 'leuchtwege-backup-undo-v1';
export const journalKey = 'leuchtwege-backup-journal-v1';
const fixed = [
  'leuchtwege-v2',
  'leuchtwege-free-v1',
  'leuchtwege-sliding-v1',
  'leuchtwege-sliding-free-v1',
  'leuchtwege-learn-v1',
  'leuchtwege-history-v1',
  'leuchtwege-preferences-v1',
];
export const isDataKey = (key) =>
  fixed.includes(key) ||
  /^leuchtwege-hints-v1:[\w-]{1,180}$/.test(key) ||
  /^leuchtwege-daily-v1:\d{4}-\d{2}-\d{2}:(turn|slide|rotate)$/.test(key);
const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const canonical = (v) =>
  JSON.stringify(v, (_, x) =>
    object(x)
      ? Object.fromEntries(
          Object.keys(x)
            .sort()
            .map((k) => [k, x[k]]),
        )
      : x,
  );
const same = (a, b) => canonical(a) === canonical(b);
const requireValid = (ok) => {
  if (!ok)
    throw Error(
      'Die Sicherung enthält ungültige oder nicht unterstützte Daten.',
    );
};
export function validateBackup(text, levels, sliding) {
  requireValid(typeof text === 'string' && text.length <= 8_000_000);
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    throw Error('Das ist keine lesbare Leuchtwege-Sicherung.');
  }
  requireValid(
    file?.app === 'Leuchtwege' &&
      file.version === 1 &&
      Number.isFinite(Date.parse(file.createdAt)) &&
      object(file.data),
  );
  requireValid(
    Object.keys(file.data).length > 0 &&
      Object.keys(file.data).length <= 10000 &&
      object(file.data['leuchtwege-v2']),
  );
  for (const [key, raw] of Object.entries(file.data)) {
    requireValid(isDataKey(key));
    if (key.startsWith('leuchtwege-hints-v1:')) {
      requireValid(
        Number.isInteger(raw)
          ? raw >= 0 && raw <= 3
          : same(raw, hintBudget(raw)),
      );
      continue;
    }
    requireValid(object(raw));
    if (key === 'leuchtwege-v2') {
      const checked = restore(levels, raw);
      requireValid(
        raw.version === 2 && same({ ...raw, version: undefined }, checked),
      );
    } else if (key === 'leuchtwege-sliding-v1') {
      requireValid(same(raw, restoreSliding(sliding, raw)));
    } else if (key === 'leuchtwege-history-v1') {
      requireValid(same(raw, restoreHistory(raw)));
      for (const a of raw.attempts)
        requireValid(a.completedDay == null || validDay(a.completedDay));
    } else if (key === 'leuchtwege-learn-v1') {
      requireValid(
        Object.entries(raw).every(
          ([k, v]) =>
            ['turn', 'slide', 'rotate'].includes(k) && typeof v === 'boolean',
        ),
      );
    } else if (key === 'leuchtwege-preferences-v1') {
      requireValid(
        raw.version === 1 &&
          typeof raw.animations === 'boolean' &&
          Object.keys(raw).every((k) => Object.hasOwn(preferences(null), k)) &&
          Object.entries(raw).every(([k, v]) => preferences(raw)[k] === v),
      );
    } else if (key === 'leuchtwege-free-v1') {
      const checked = restoreFree(raw);
      requireValid(
        raw.version === 1 &&
          raw.tier === checked.tier &&
          raw.size === checked.size &&
          same(raw.recent, checked.recent),
      );
      requireValid(
        raw.puzzle
          ? checked.puzzle && same(raw.session, checked.session)
          : raw.puzzle === null && raw.session === null,
      );
    } else if (key === 'leuchtwege-sliding-free-v1') {
      const checked = restoreFreeSliding(raw);
      requireValid(
        raw.version === 1 &&
          same(raw.tiers, checked.tiers) &&
          same(raw.recent, checked.recent),
      );
      for (const mode of ['slide', 'rotate'])
        requireValid(
          raw[mode]
            ? checked[mode] && same(raw[mode].session, checked[mode].session)
            : raw[mode] === null,
        );
    } else {
      const [, day, mode] = key.split(':');
      const checked = restoreDaily(raw, day, mode);
      requireValid(checked && same(raw.session, checked.session));
    }
  }
  return file;
}
export function collectData(storage) {
  const data = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (isDataKey(key)) data[key] = JSON.parse(storage.getItem(key));
  }
  return data;
}
export function createBackup(storage, levels, sliding) {
  const file = {
    app: 'Leuchtwege',
    version: 1,
    createdAt: new Date().toISOString(),
    data: collectData(storage),
  };
  const text = JSON.stringify(file);
  validateBackup(text, levels, sliding);
  return text;
}
function replaceData(storage, data) {
  const remove = [];
  for (let i = 0; i < storage.length; i++)
    if (isDataKey(storage.key(i)) || storage.key(i) === 'leuchtwege-v1')
      remove.push(storage.key(i));
  remove.forEach((key) => storage.removeItem(key));
  for (const [key, value] of Object.entries(data))
    storage.setItem(key, JSON.stringify(value));
}
// A journal restores the previous snapshot if the app closes halfway through a write.
export function recoverBackup(storage) {
  const journal = storage.getItem(journalKey);
  if (!journal) return false;
  const data = JSON.parse(journal);
  requireValid(object(data) && Object.keys(data).every(isDataKey));
  replaceData(storage, data);
  storage.removeItem(journalKey);
  return true;
}
export function importBackup(storage, file, levels, sliding, undo = false) {
  const checked = validateBackup(JSON.stringify(file), levels, sliding);
  const previous = createBackup(storage, levels, sliding);
  // Reserve both snapshots before touching any existing progress.
  if (!undo) storage.setItem(undoKey, previous);
  storage.setItem(journalKey, JSON.stringify(JSON.parse(previous).data));
  try {
    replaceData(storage, checked.data);
    storage.removeItem(journalKey);
  } catch (error) {
    recoverBackup(storage);
    throw error;
  }
  if (undo) storage.removeItem(undoKey);
}
