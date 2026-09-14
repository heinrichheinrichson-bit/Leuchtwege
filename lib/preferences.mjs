export const preferencesKey = 'leuchtwege-preferences-v1';
export function preferences(raw) {
  return {
    version: 1,
    animations: raw?.animations !== false,
    language: raw?.language === 'en' ? 'en' : 'de',
    theme: raw?.theme === 'light' ? 'light' : 'dark',
    haptics: raw?.haptics !== false,
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
export function applyPreferences(value) {
  document.documentElement.dataset.animations = value.animations ? 'on' : 'off';
  document.documentElement.dataset.theme = value.theme || 'dark';
  document.documentElement.lang = value.language || 'de';
}
export function savePreferences(value) {
  const next = preferences({ ...readPreferences(), ...value });
  localStorage.setItem(preferencesKey, JSON.stringify(next));
  applyPreferences(next);
  window.dispatchEvent(new Event('leuchtwege-preferences'));
  return next;
}
