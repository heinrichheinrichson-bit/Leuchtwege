export const resumeListKey = 'tvispy-hidden-resume-v1';
export function restoreHiddenResume(raw) {
  return Object.fromEntries(
    Object.entries(
      raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {},
    ).filter(
      ([id, revision]) =>
        id.length < 200 &&
        typeof revision === 'string' &&
        revision.length < 20000,
    ),
  );
}
export function resumeRevision(session) {
  return JSON.stringify([
    session.moves,
    session.slides,
    session.rotations,
    session.turns,
    session.positions,
  ]);
}
export const resumeSlotsKey = 'tvispy-resume-slots-v1';
export function selectResumeGame(games, hidden, latestId) {
  const game = latestId ? games.find((game) => game.id === latestId) : games[0];
  return game && hidden[game.id] !== game.revision ? game : null;
}
export function rememberResumeGame(mode, id, played = false) {
  try {
    const raw = JSON.parse(localStorage.getItem(resumeSlotsKey) || '{}');
    const slots =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    if (played) {
      const hidden = restoreHiddenResume(
        JSON.parse(localStorage.getItem(resumeListKey) || 'null'),
      );
      delete hidden[id];
      localStorage.setItem(resumeListKey, JSON.stringify(hidden));
    }
    localStorage.setItem(
      resumeSlotsKey,
      JSON.stringify({ ...slots, [mode]: id }),
    );
  } catch {}
}
