'use client';
import { t as tr, locale } from '@/lib/i18n';
import { groupAchievements } from '@/lib/achievement-catalog.mjs';
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
        {groupAchievements(xp.achievements).map((track) => (
          <article
            key={track.kind}
            className={
              track.earned === track.stages.length
                ? 'milestone done'
                : 'milestone'
            }
          >
            <div className="milestone-heading">
              <strong>{tr(track.title)}</strong>
              <span>
                {track.earned}/{track.stages.length} {tr('Stufen')}
              </span>
            </div>
            <p>{tr(track.detail)}</p>
            <div className="milestone-heading">
              <span>
                {tr(
                  track.earned === track.stages.length
                    ? 'Alle Stufen erreicht'
                    : 'Nächstes Ziel',
                )}
              </span>
              <span>
                {track.next.progress.toLocaleString(locale())}/
                {track.next.target.toLocaleString(locale())}
              </span>
            </div>
            <progress
              value={track.next.progress}
              max={track.next.target}
              aria-label={tr(track.title)}
            />
            <details className="achievement-stages">
              <summary>{tr('Alle Stufen ansehen')}</summary>
              <ul>
                {track.stages.map((a: (typeof xp.achievements)[number]) => (
                  <li key={a.id}>
                    <span>
                      {a.done ? '★' : '☆'} {tr(a.title)} ·{' '}
                      {a.target.toLocaleString(locale())}
                    </span>
                    <span>{tr(a.done ? 'Erreicht' : 'Noch offen')}</span>
                  </li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
      <h2>{tr('Dein Fortschritt')}</h2>
      <ExperienceCard />
    </section>
  );
}
