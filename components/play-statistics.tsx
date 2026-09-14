'use client';
import { t as tr, locale } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { readHistory } from '@/lib/history-store';
import {
  emptyHistory,
  historySummary,
  formatTime,
} from '@/lib/play-history.mjs';
const names: any = {
  all: 'Alle Modi',
  turn: 'Drehen',
  slide: 'Nur Schieben',
  rotate: 'Schieben & Drehen',
};
export default function PlayStatistics() {
  const [data, setData] = useState<any>(emptyHistory),
    [mode, setMode] = useState('all');
  useEffect(() => {
    const read = () => setData(readHistory());
    read();
    window.addEventListener('leuchtwege-history', read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener('leuchtwege-history', read);
      window.removeEventListener('storage', read);
    };
  }, []);
  const s = historySummary(data, mode);
  return (
    <section className="stats-screen">
      <p className="level-label">{tr('Dein Spielverlauf')}</p>
      <h1>{tr('Statistik')}</h1>
      <div className="stats-filters">
        {tr(
          Object.entries(names).map(([key, name]) => (
            <Button
              key={key}
              variant={mode === key ? 'default' : 'outline'}
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
            >
              {tr(String(name))}
            </Button>
          )),
        )}
      </div>
      <div className="stats-grid">
        {tr(
          [
            [s.completed, 'Partien gelöst'],
            [s.unique, 'Verschiedene Rätsel'],
            [s.independent, 'Ohne Lösehilfe'],
            [s.withHints, 'Mit Tipps gelöst'],
            [formatTime(s.playedMs), 'Aktive Spielzeit'],
            [s.tests, 'Mit Testhilfe gelöst'],
          ].map(([value, label]) => (
            <div key={label} className="stat-card">
              <strong>{tr(value)}</strong>
              <span>{tr(label)}</span>
            </div>
          )),
        )}
      </div>
      <details className="info-details">
        <summary>{tr('Was wird gezählt?')}</summary>
        <p>
          {tr(
            'Testlösungen zählen separat. Die aktive Spielzeit umfasst auch offene und getestete Partien. Ausblenden der Uhr stoppt die Aufzeichnung nicht.',
          )}
          {tr(
            s.partial > 0 &&
              ` Bei ${s.partial} Abschlüssen ist die Vorgeschichte unbekannt; sie zählen nicht als nachweislich ohne Hilfe gelöst.`,
          )}
        </p>
      </details>
      <h2>{tr('Letzte Abschlüsse')}</h2>
      {tr(
        !s.recent.length ? (
          <p>
            {tr(
              'Noch keine aufgezeichnete Lösung. Dein nächstes Rätsel macht den Anfang.',
            )}
          </p>
        ) : (
          <div className="stats-history">
            {tr(
              s.recent.slice(0, 20).map((a: any) => (
                <article key={a.id}>
                  <div>
                    <strong>{tr(a.name)}</strong>
                    <small>
                      {tr(names[a.mode])}
                      {tr(' ·')}
                      {tr(' ')}
                      {tr(
                        a.origin === 'daily'
                          ? 'Tagesrätsel'
                          : a.origin === 'free'
                            ? 'Freies Spiel'
                            : 'Katalog',
                      )}
                      {tr(' ')}
                      {tr('· ')}
                      {tr(a.tier)}
                      {tr(' · ')}
                      {tr(a.n)}
                      {tr(' × ')}
                      {tr(a.n)}
                    </small>
                    <small>
                      {tr(new Date(a.completedAt).toLocaleString(locale()))}
                      {tr(' ·')}
                      {tr(' ')}
                      {tr(
                        a.assistance === 'test'
                          ? 'Testhilfe'
                          : a.assistance === 'hint'
                            ? `${a.hints} Tipp${a.hints === 1 ? '' : 's'}`
                            : a.partialTime
                              ? 'Vorgeschichte unbekannt'
                              : 'Ohne Lösehilfe',
                      )}
                    </small>
                  </div>
                  <div>
                    <strong>{tr(formatTime(a.elapsedMs))}</strong>
                    <small>
                      {tr(a.moves)}
                      {tr(' Züge')}
                    </small>
                    {tr(
                      a.partialTime && (
                        <small>{tr('Zeit teilweise erfasst')}</small>
                      ),
                    )}
                  </div>
                </article>
              )),
            )}
          </div>
        ),
      )}
      <p className="home-foot">
        {tr(
          'Eine neue Partie beginnt mit „Neustart“. Rückgängig erzeugt keinen zusätzlichen Abschluss. Die Daten bleiben auf diesem Gerät.',
        )}
      </p>
    </section>
  );
}
