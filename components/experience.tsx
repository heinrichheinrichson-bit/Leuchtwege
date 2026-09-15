'use client';
import { t as tr, locale } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { experienceSummary } from '@/lib/experience.mjs';
import { readHistory } from '@/lib/history-store';
export function useExperience() {
  const [xp, setXp] = useState(() => experienceSummary([]));
  useEffect(() => {
    const update = () => setXp(experienceSummary(readHistory().attempts));
    update();
    window.addEventListener('leuchtwege-history', update);
    window.addEventListener('storage', update);
    const timer = window.setInterval(update, 30000);
    return () => {
      window.removeEventListener('leuchtwege-history', update);
      window.removeEventListener('storage', update);
      window.clearInterval(timer);
    };
  }, []);
  return xp;
}
export default function ExperienceCard({ onOpen }: { onOpen?: () => void }) {
  const xp = useExperience();
  return (
    <section
      className="experience-card"
      aria-label={tr('Dein Level und deine Erfahrungspunkte')}
    >
      <div className="experience-heading">
        <strong>
          {tr('Level ')}
          {tr(xp.level)}
        </strong>
        <span>
          {tr(xp.total)}
          {tr(' XP gesammelt')}
        </span>
      </div>
      <progress
        value={xp.current}
        max={xp.required}
        aria-label={tr(`Fortschritt zu Level ${xp.level + 1}`)}
      />
      <p>
        {tr(xp.required - xp.current)}
        {tr(' XP bis Level ')}
        {tr(xp.level + 1)}
      </p>
      {onOpen ? (
        <button className="milestone-entry" onClick={onOpen}>
          <span>{tr('Missionen & Erfolge')}</span>
          <span>{xp.missions.filter((m) => m.done).length}/3 →</span>
        </button>
      ) : (
        <details>
          <summary>{tr('So sammelst du XP')}</summary>
          <p>
            {tr(
              'Alle Modi geben XP: Katalog 20, Zufallsrätsel 25, Tagesrätsel 35. Dazu kommen +10 auf Mittel oder +25 auf Schwer und +10 ohne Tipps.',
            )}
          </p>
          <p>
            {tr(
              'Erneut gelöste Katalog- und Zufallsrätsel geben 5 XP. Tagesrätsel zählen einmalig. Testlösungen geben keine XP.',
            )}
          </p>
          <p>
            {tr(
              'Tagesmissionen geben zusätzlich bis zu 60 XP pro Tag. Erfolge sind bleibende Auszeichnungen.',
            )}
          </p>
        </details>
      )}
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
    <div className="xp-reward">
      {tr(
        award
          ? `+${award.points} XP · Level ${xp.level}`
          : previous
            ? 'Für diesen Abschluss keine weiteren XP.'
            : 'Keine XP für diesen Abschluss.',
      )}
      {xp.bonuses
        .filter((b) => b.attemptId === attemptId)
        .map((b) => (
          <p key={b.id}>
            {tr('Mission geschafft')}: {tr(b.title)} · +{b.points} XP
          </p>
        ))}
      {xp.achievements
        .filter((a) => a.attemptId === attemptId)
        .map((a) => (
          <p key={a.id}>
            ★ {tr('Erfolg freigeschaltet')}: {tr(a.title)}
          </p>
        ))}
    </div>
  );
}
