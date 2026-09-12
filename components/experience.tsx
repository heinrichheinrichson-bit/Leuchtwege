'use client';
import { useEffect, useState } from 'react';
import { experienceSummary } from '@/lib/experience.mjs';
import { readHistory } from '@/lib/history-store';
function useExperience() {
  const [xp, setXp] = useState(() => experienceSummary([]));
  useEffect(() => {
    const update = () => setXp(experienceSummary(readHistory().attempts));
    update();
    window.addEventListener('leuchtwege-history', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('leuchtwege-history', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return xp;
}
export default function ExperienceCard() {
  const xp = useExperience();
  return (
    <section
      className="experience-card"
      aria-label="Dein Level und deine Erfahrungspunkte"
    >
      <div className="experience-heading">
        <strong>Level {xp.level}</strong>
        <span>{xp.total} XP gesammelt</span>
      </div>
      <progress
        value={xp.current}
        max={xp.required}
        aria-label={`Fortschritt zu Level ${xp.level + 1}`}
      />
      <p>
        {xp.required - xp.current} XP bis Level {xp.level + 1}
      </p>
      <details>
        <summary>So sammelst du XP</summary>
        <p>
          Tagesrätsel geben einmalig 35 XP auf Leicht, 45 XP auf Mittel und 60
          XP auf Schwer. Ohne Tipps erhältst du zusätzlich 10 XP. Nachholen ist
          erlaubt; Wiederholungen und Testlösungen geben keine XP.
        </p>
        <p>
          Bereits regulär abgeschlossene Tagesrätsel aus deinem gespeicherten
          Verlauf zählen mit. Dein Level bleibt erhalten, auch wenn deine
          Streak-Serie endet.
        </p>
      </details>
    </section>
  );
}
export function DailyReward({
  puzzleId,
  attemptId,
}: {
  puzzleId: string;
  attemptId?: string;
}) {
  const xp = useExperience(),
    award = xp.awards.find((a) => a.id === puzzleId);
  return (
    <p className="xp-reward">
      {award
        ? award.attemptId === attemptId
          ? `+${award.points} XP · Level ${xp.level}`
          : `${award.points} XP für dieses Tagesrätsel bereits gesammelt`
        : 'Keine XP für diesen Abschluss. Für Punkte ohne Testhilfe neu spielen.'}
    </p>
  );
}
