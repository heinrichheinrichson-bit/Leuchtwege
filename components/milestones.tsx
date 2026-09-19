'use client';
import { t as tr, locale } from '@/lib/i18n';
import {
  groupAchievements,
  achievementCounter,
} from '@/lib/achievement-catalog.mjs';
import ExperienceCard, { useExperience } from './experience';
export default function Milestones() {
  const xp = useExperience();
  const tracks = groupAchievements(xp.achievements);
  const nextGoals = tracks
    .filter((track) => track.earned < track.stages.length)
    .sort(
      (a, b) =>
        b.next.progress / b.next.target - a.next.progress / a.next.target,
    )
    .slice(0, 3);
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
      {nextGoals.length > 0 && (
        <>
          <h2>{tr('Deine nächsten Ziele')}</h2>
          <div className="milestone-list">
            {nextGoals.map((track) => (
              <article className="milestone" key={track.kind}>
                <div className="milestone-heading">
                  <strong>{tr(track.title)}</strong>
                  <span>+{track.next.points} XP</span>
                </div>
                <p>{tr(track.detail)}</p>
                <span>
                  {achievementCounter(
                    track.kind,
                    track.next.progress,
                    locale(),
                  )}{' '}
                  /{' '}
                  {achievementCounter(track.kind, track.next.target, locale())}
                </span>
                <progress
                  value={track.next.progress}
                  max={track.next.target}
                  aria-label={tr(track.title)}
                />
              </article>
            ))}
          </div>
        </>
      )}
      <h2>
        {tr('Erfolge')} · {xp.achievements.filter((a) => a.done).length}/
        {xp.achievements.length}
      </h2>
      <p>{tr('Deine bisherigen regulären Abschlüsse zählen mit.')}</p>
      <p>
        {tr(
          'Jede Stufe belohnt dich einmalig mit XP. Spielzeit zählt beim regulären Abschluss; Pausen und Testlösungen zählen nicht.',
        )}
      </p>
      <div className="milestone-list">
        {tracks.map((track) => (
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
                {achievementCounter(track.kind, track.next.progress, locale())}{' '}
                /{achievementCounter(track.kind, track.next.target, locale())} ·
                +{track.next.points} XP
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
                      {achievementCounter(a.kind, a.target, locale())} · +
                      {a.points} XP
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
