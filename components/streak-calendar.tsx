'use client';
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
      <p className="level-label">Deine gespielten Tage</p>
      <h1>Streak-Kalender</h1>
      <div className="streak-card">
        <strong>
          {streak.current} {streak.current === 1 ? 'Tag' : 'Tage'} in Folge
        </strong>
        <span>
          Längste Serie: {streak.longest}{' '}
          {streak.longest === 1 ? 'Tag' : 'Tage'}
        </span>
        <p className="streak-today">
          {streak.today ? '✓ Tagesstreak geschafft' : '○ Heute noch offen'}
        </p>
      </div>
      <p className="section-intro">
        Ein gelöstes Rätsel pro Tag. Jeder Modus zählt.
      </p>
      <div className="calendar-heading">
        <Button
          variant="outline"
          aria-label="Vorheriger Monat"
          disabled={month <= earliest}
          onClick={() => setMonth(shiftDay(month + '-01', -1).slice(0, 7))}
        >
          ←
        </Button>
        <h2>
          {new Date(month + '-01T12:00:00').toLocaleDateString('de-DE', {
            month: 'long',
            year: 'numeric',
          })}
        </h2>
        <Button
          variant="outline"
          aria-label="Nächster Monat"
          disabled={month >= today.slice(0, 7)}
          onClick={() =>
            setMonth(shiftDay(calendar.days.at(-1)!, 1).slice(0, 7))
          }
        >
          →
        </Button>
      </div>
      <div
        className="daily-calendar"
        aria-label="Kalender der tatsächlichen Spieltage"
      >
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
          <span className="weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: calendar.leading }, (_, i) => (
          <span key={'blank' + i} />
        ))}
        {calendar.days.map((day) => {
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
              aria-label={`${day.split('-').reverse().join('.')}: ${status}`}
            >
              <strong>{Number(day.slice(-2))}</strong>
              <span className="streak-check" aria-hidden="true">
                {done ? '✓' : future ? '·' : day === today ? '○' : '–'}
              </span>
            </div>
          );
        })}
      </div>
      <p className="calendar-legend">
        ✓ Mindestens ein Rätsel abgeschlossen · ○ Heute noch offen · – Kein
        gewerteter Abschluss
      </p>
      <Button variant="ghost" onClick={() => setMonth(today.slice(0, 7))}>
        Zum aktuellen Monat
      </Button>
      <details className="info-details">
        <summary>Streak-Regeln</summary>
        <p>
          Tipps sind erlaubt. Testlösungen zählen nicht. Für den Haken zählt
          ausschließlich der tatsächliche Abschlusstag. Ein nachgeholtes
          Tagesrätsel schließt keine frühere Streak-Lücke. Streak-Freeze ist
          noch nicht verfügbar.
        </p>
      </details>
    </section>
  );
}
