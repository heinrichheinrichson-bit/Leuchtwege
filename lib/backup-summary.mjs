import { experienceSummary } from './experience.mjs';
import { slidingStatus } from './sliding.mjs';
export function backupSummary(file, sliding) {
  const data = file.data,
    history = data['leuchtwege-history-v1'];
  const xp = experienceSummary(history?.attempts || [], history?.freeze);
  const solved = (mode) =>
    sliding.filter(
      (l) =>
        l.mode === mode &&
        data['leuchtwege-sliding-v1']?.sessions[l.id] &&
        slidingStatus(l, data['leuchtwege-sliding-v1'].sessions[l.id]).solved,
    ).length;
  return {
    turn: data['leuchtwege-v2'].done.length,
    slide: solved('slide'),
    rotate: solved('rotate'),
    xp: xp.total,
    level: xp.level,
    achievements: xp.achievements.filter((a) => a.done).length,
    protectedDays: history?.freeze?.frozen?.length || 0,
  };
}
