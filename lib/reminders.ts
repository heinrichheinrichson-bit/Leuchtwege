import { Capacitor, registerPlugin } from '@capacitor/core';
import { readPreferences } from './preferences.mjs';
import { readHistory } from './history-store';
import { dayKey, shiftDay, streakSummary } from './daily.mjs';
const native = registerPlugin<{
  configure(data: any): Promise<void>;
  status(): Promise<{ allowed: boolean }>;
  enable(): Promise<{ allowed: boolean }>;
  openSettings(): Promise<void>;
  test(): Promise<void>;
}>('LeuchtwegeReminders');
export const supportsReminders = () => Capacitor.getPlatform() === 'android';
export const reminderPermission = () => native.status();
export const enableReminders = () => native.enable();
export const openReminderSettings = () => native.openSettings();
export const testReminder = () => native.test();
let queue = Promise.resolve();
export function syncReminders() {
  if (!supportsReminders()) return Promise.resolve();
  queue = queue
    .catch(() => {})
    .then(async () => {
      const prefs = readPreferences(),
        h = readHistory(),
        today = dayKey();
      const streak = streakSummary(h.attempts, today, h.freeze?.frozen || []);
      const covered = [...streak.days, ...streak.frozen].sort();
      const last = covered.at(-1);
      await native.configure({
        ...prefs,
        completedDays: [...streak.days],
        streakUntil: last ? shiftDay(last, (h.freeze?.balance || 0) + 1) : '',
      });
    });
  return queue;
}
