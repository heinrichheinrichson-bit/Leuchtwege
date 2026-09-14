export const preferencesKey = 'leuchtwege-preferences-v1';
export function preferences(raw) {
  return { version: 1, animations: raw?.animations !== false };
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
}
export function savePreferences(value) {
  const next = preferences(value);
  localStorage.setItem(preferencesKey, JSON.stringify(next));
  applyPreferences(next);
  window.dispatchEvent(new Event('leuchtwege-preferences'));
  return next;
}
