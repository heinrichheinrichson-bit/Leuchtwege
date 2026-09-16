export const preferencesKey = 'leuchtwege-preferences-v1';
export function preferences(raw) {
  return {
    version: 1,
    animations: raw?.animations !== false,
    language: ['de', 'en'].includes(raw?.language) ? raw.language : 'system',
    theme: raw?.theme === 'light' ? 'light' : 'dark',
    haptics: raw?.haptics !== false,
    reminderEnabled: raw?.reminderEnabled === true,
    reminderTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(raw?.reminderTime)
      ? raw.reminderTime
      : '18:00',
    streakReminderEnabled: raw?.streakReminderEnabled === true,
    streakReminderTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(
      raw?.streakReminderTime,
    )
      ? raw.streakReminderTime
      : '21:00',
  };
}
export function readPreferences() {
  try {
    return preferences(
      JSON.parse(localStorage.getItem(preferencesKey) || 'null'),
    );
  } catch {
    return preferences(null);
  }
}
export function resolveLanguage(
  language,
  languages = globalThis.navigator?.languages || [
    globalThis.navigator?.language,
  ],
) {
  if (language === 'de' || language === 'en') return language;
  for (const tag of languages || []) {
    const base = String(tag || '')
      .toLowerCase()
      .split(/[-_]/)[0];
    if (base === 'de' || base === 'en') return base;
  }
  return 'en';
}
export function applyPreferences(value) {
  document.documentElement.dataset.animations = value.animations ? 'on' : 'off';
  document.documentElement.dataset.theme = value.theme || 'dark';
  document.documentElement.lang = resolveLanguage(value.language);
}
export function savePreferences(value) {
  const next = preferences({ ...readPreferences(), ...value });
  localStorage.setItem(preferencesKey, JSON.stringify(next));
  applyPreferences(next);
  window.dispatchEvent(new Event('leuchtwege-preferences'));
  return next;
}
