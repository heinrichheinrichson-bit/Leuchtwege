'use client';
import { t as tr, locale } from '@/lib/i18n';
import ExperienceCard, { useExperience } from './experience';
export default function Milestones() {
  const xp = useExperience();
  return (
    <section className="milestones-screen">
      <h1>{tr('Missionen & Erfolge')}</h1>
      <h2>
        {tr('Heute')} ·{' '}
        {new Date().toLocaleDateString(locale(), {
          day: 'numeric',
          month: 'short',
        })}
      </h2>
      <p>{tr('Alle Spielmodi zählen. Neue Missionen um Mitternacht.')}</p>
      <div className="milestone-list">
        {xp.missions.map((m) => (
          <article
            key={m.id}
            className={m.done ? 'milestone done' : 'milestone'}
          >
            <div className="milestone-heading">
              <strong>{tr(m.title)}</strong>
              <span>
                {m.done ? '✓' : `${m.progress}/${m.target}`} · +{m.points} XP
              </span>
            </div>
            <p>{tr(m.detail)}</p>
            <progress
              value={m.progress}
              max={m.target}
              aria-label={tr(m.title)}
            />
          </article>
        ))}
      </div>
      <h2>
        {tr('Erfolge')} · {xp.achievements.filter((a) => a.done).length}/
        {xp.achievements.length}
      </h2>
      <p>{tr('Deine bisherigen regulären Abschlüsse zählen mit.')}</p>
      <div className="milestone-list">
        {xp.achievements.map((a) => (
          <article
            key={a.id}
            className={a.done ? 'milestone done' : 'milestone'}
          >
            <div className="milestone-heading">
              <strong>
                {a.done ? '★' : '☆'} {tr(a.title)}
              </strong>
              <span>
                {a.progress}/{a.target}
              </span>
            </div>
            <p>{tr(a.detail)}</p>
          </article>
        ))}
      </div>
      <h2>{tr('Dein Fortschritt')}</h2>
      <ExperienceCard />
    </section>
  );
}
