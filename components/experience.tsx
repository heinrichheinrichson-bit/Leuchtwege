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
          Alle Modi geben XP: Katalog 20, Zufallsrätsel 25, Tagesrätsel 35. Dazu
          kommen +10 auf Mittel oder +25 auf Schwer und +10 ohne Tipps.
        </p>
        <p>
          Erneut gelöste Katalog- und Zufallsrätsel geben 5 XP. Tagesrätsel
          zählen einmalig. Testlösungen geben keine XP.
        </p>
      </details>
    </section>
  );
}
export function PuzzleReward({
  puzzleId,
  attemptId,
}: {
  puzzleId: string;
  attemptId?: string;
}) {
  const xp = useExperience(),
    award = xp.awards.find(
      (a) => a.id === puzzleId && a.attemptId === attemptId,
    ),
    previous = xp.awards.find((a) => a.id === puzzleId);
  return (
    <p className="xp-reward">
      {award
        ? `+${award.points} XP · Level ${xp.level}`
        : previous
          ? 'Für diesen Abschluss keine weiteren XP.'
          : 'Keine XP für diesen Abschluss.'}
    </p>
  );
}
