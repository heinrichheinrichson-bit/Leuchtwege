'use client';
import { t as tr, locale } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { readHistory } from '@/lib/history-store';
import { dayKey, monthDays, shiftDay, streakSummary } from '@/lib/daily.mjs';

export default function StreakCalendar() {
  const [today, setToday] = useState(dayKey);
  const [month, setMonth] = useState(() => dayKey().slice(0, 7));
  const [attempts, setAttempts] = useState<any[]>([]);
  const [freeze, setFreeze] = useState<any>(null);
  useEffect(() => {
    const update = () => {
      setToday(dayKey());
      const history = readHistory();
      setAttempts(history.attempts);
      setFreeze(history.freeze);
    };
    update();
    window.addEventListener('leuchtwege-history', update);
    window.addEventListener('storage', update);
    document.addEventListener('visibilitychange', update);
    const timer = setInterval(update, 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('leuchtwege-history', update);
      window.removeEventListener('storage', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const streak = streakSummary(attempts, today, freeze?.frozen || []),
    calendar = monthDays(month);
  const earliest = [...streak.days, today].sort()[0].slice(0, 7);
  return (
    <section className="daily-screen">
      <p className="level-label">{tr('Deine gespielten Tage')}</p>
      <h1>{tr('Streak-Kalender')}</h1>
      <div className="streak-card">
        <strong>
          {tr(streak.current)} {tr(streak.current === 1 ? 'Tag' : 'Tage')}
          {tr(' in Folge')}
        </strong>
        <span>
          {tr('Längste Serie: ')}
          {tr(streak.longest)}
          {tr(' ')}
          {tr(streak.longest === 1 ? 'Tag' : 'Tage')}
        </span>
        <p className="streak-today">
          {tr(streak.today ? '✓ Tagesstreak geschafft' : '○ Heute noch offen')}
        </p>
      </div>
      <div className="streak-card">
        <strong>
          ❄ {tr('Streak-Schutz')} · {freeze?.balance ?? 2}/2
        </strong>
        <p>
          {tr('Automatisch aktiv. Ein Schutz überbrückt einen verpassten Tag.')}
        </p>
        <span>
          {freeze?.progress ?? 0}/7 · {tr('Spieltage bis zum nächsten Schutz')}
        </span>
      </div>
      <p className="section-intro">
        {tr('Ein gelöstes Rätsel pro Tag. Jeder Modus zählt.')}
      </p>
      <div className="calendar-heading">
        <Button
          variant="outline"
          aria-label={tr('Vorheriger Monat')}
          disabled={month <= earliest}
          onClick={() => setMonth(shiftDay(month + '-01', -1).slice(0, 7))}
        >
          {tr('←')}
        </Button>
        <h2>
          {tr(
            new Date(month + '-01T12:00:00').toLocaleDateString(locale(), {
              month: 'long',
              year: 'numeric',
            }),
          )}
        </h2>
        <Button
          variant="outline"
          aria-label={tr('Nächster Monat')}
          disabled={month >= today.slice(0, 7)}
          onClick={() =>
            setMonth(shiftDay(calendar.days.at(-1)!, 1).slice(0, 7))
          }
        >
          {tr('→')}
        </Button>
      </div>
      <div
        className="daily-calendar"
        aria-label={tr('Kalender der tatsächlichen Spieltage')}
      >
        {tr(
          ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
            <span className="weekday" key={d}>
              {tr(d)}
            </span>
          )),
        )}
        {tr(
          Array.from({ length: calendar.leading }, (_, i) => (
            <span key={'blank' + i} />
          )),
        )}
        {tr(
          calendar.days.map((day) => {
            const done = streak.days.has(day),
              frozen = streak.frozen.has(day),
              future = day > today;
            const status = done
              ? 'Tagesstreak geschafft'
              : frozen
                ? 'Streak auf Eis'
                : future
                  ? 'Zukünftiger Tag'
                  : day === today
                    ? 'Heute noch offen'
                    : 'Kein gewerteter Abschluss';
            return (
              <div
                key={day}
                className={
                  'calendar-day streak-day ' +
                  (done
                    ? 'completed'
                    : frozen
                      ? 'frozen'
                      : future
                        ? 'future'
                        : '')
                }
                aria-current={day === today ? 'date' : undefined}
                aria-label={tr(
                  `${new Date(day + 'T12:00:00').toLocaleDateString(locale())}: ${status}`,
                )}
              >
                <strong>{tr(Number(day.slice(-2)))}</strong>
                <span className="streak-check" aria-hidden="true">
                  {tr(
                    done
                      ? '✓'
                      : frozen
                        ? '❄'
                        : future
                          ? '·'
                          : day === today
                            ? '○'
                            : '–',
                  )}
                </span>
              </div>
            );
          }),
        )}
      </div>
      <p className="calendar-legend">
        {tr('✓ Gespielt · ❄ Geschützt · ○ Heute offen · – Kein Abschluss')}
      </p>
      <Button variant="ghost" onClick={() => setMonth(today.slice(0, 7))}>
        {tr('Zum aktuellen Monat')}
      </Button>
      <details className="info-details">
        <summary>{tr('Streak-Regeln')}</summary>
        <p>
          {tr(
            'Zwei Schutz-Tage zum Start, maximal zwei im Vorrat. Nach sieben gespielten Tagen kommt einer zurück. Geschützte Tage halten die Serie, erhöhen sie aber nicht und geben keine XP. Alte Lücken vor der Aktivierung bleiben offen. Nachgeholte Tagesrätsel zählen nur am tatsächlichen Spieltag. Testlösungen zählen nicht.',
          )}
        </p>
      </details>
    </section>
  );
}
