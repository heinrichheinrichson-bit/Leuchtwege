'use client';
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
      <p className="level-label">Dein Spielverlauf</p>
      <h1>Deine Lichtblicke</h1>
      <p className="section-intro">
        Die Aufzeichnung beginnt mit diesem Update. Frühere Abschlüsse bleiben
        im Rätselkatalog erhalten.
      </p>
      <div className="stats-filters">
        {Object.entries(names).map(([key, name]) => (
          <Button
            key={key}
            variant={mode === key ? 'default' : 'outline'}
            aria-pressed={mode === key}
            onClick={() => setMode(key)}
          >
            {String(name)}
          </Button>
        ))}
      </div>
      <div className="stats-grid">
        {[
          [s.completed, 'Partien gelöst'],
          [s.unique, 'Verschiedene Rätsel'],
          [s.independent, 'Ohne Lösehilfe'],
          [s.withHints, 'Mit Tipps gelöst'],
          [formatTime(s.playedMs), 'Aktive Spielzeit'],
          [s.tests, 'Mit Testhilfe gelöst'],
        ].map(([value, label]) => (
          <div key={label} className="stat-card">
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="mode-help">
        Testlösungen zählen separat. Die aktive Spielzeit umfasst auch offene
        und getestete Partien. Ausblenden der Uhr stoppt die Aufzeichnung nicht.
        {s.partial > 0 &&
          ` Bei ${s.partial} Abschlüssen ist die Vorgeschichte unbekannt; sie zählen nicht als nachweislich ohne Hilfe gelöst.`}
      </p>
      <h2>Letzte Abschlüsse</h2>
      {!s.recent.length ? (
        <p>
          Noch keine aufgezeichnete Lösung. Dein nächstes Rätsel macht den
          Anfang.
        </p>
      ) : (
        <div className="stats-history">
          {s.recent.slice(0, 20).map((a: any) => (
            <article key={a.id}>
              <div>
                <strong>{a.name}</strong>
                <small>
                  {names[a.mode]} ·{' '}
                  {a.origin === 'daily'
                    ? 'Tagesrätsel'
                    : a.origin === 'free'
                      ? 'Freies Spiel'
                      : 'Katalog'}{' '}
                  · {a.tier} · {a.n} × {a.n}
                </small>
                <small>
                  {new Date(a.completedAt).toLocaleString('de-DE')} ·{' '}
                  {a.assistance === 'test'
                    ? 'Testhilfe'
                    : a.assistance === 'hint'
                      ? `${a.hints} Tipp${a.hints === 1 ? '' : 's'}`
                      : a.partialTime
                        ? 'Vorgeschichte unbekannt'
                        : 'Ohne Lösehilfe'}
                </small>
              </div>
              <div>
                <strong>{formatTime(a.elapsedMs)}</strong>
                <small>{a.moves} Züge</small>
                {a.partialTime && <small>Zeit teilweise erfasst</small>}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="home-foot">
        Eine neue Partie beginnt mit „Neustart“. Rückgängig erzeugt keinen
        zusätzlichen Abschluss. Die Daten bleiben auf diesem Gerät.
      </p>
    </section>
  );
}
