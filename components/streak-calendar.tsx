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
  useEffect(() => {
    const update = () => {
      setToday(dayKey());
      setAttempts(readHistory().attempts);
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
  const streak = streakSummary(attempts, today),
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
              future = day > today;
            const status = done
              ? 'Tagesstreak geschafft'
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
                  (done ? 'completed' : future ? 'future' : '')
                }
                aria-current={day === today ? 'date' : undefined}
                aria-label={tr(
                  `${new Date(day + 'T12:00:00').toLocaleDateString(locale())}: ${status}`,
                )}
              >
                <strong>{tr(Number(day.slice(-2)))}</strong>
                <span className="streak-check" aria-hidden="true">
                  {tr(done ? '✓' : future ? '·' : day === today ? '○' : '–')}
                </span>
              </div>
            );
          }),
        )}
      </div>
      <p className="calendar-legend">
        {tr(
          '✓ Mindestens ein Rätsel abgeschlossen · ○ Heute noch offen · – Kein gewerteter Abschluss',
        )}
      </p>
      <Button variant="ghost" onClick={() => setMonth(today.slice(0, 7))}>
        {tr('Zum aktuellen Monat')}
      </Button>
      <details className="info-details">
        <summary>{tr('Streak-Regeln')}</summary>
        <p>
          {tr(
            'Tipps sind erlaubt. Testlösungen zählen nicht. Für den Haken zählt ausschließlich der tatsächliche Abschlusstag. Ein nachgeholtes Tagesrätsel schließt keine frühere Streak-Lücke. Streak-Freeze ist noch nicht verfügbar.',
          )}
        </p>
      </details>
    </section>
  );
}
