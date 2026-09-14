'use client';
import { t as tr, locale } from '@/lib/i18n';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Button } from '@/components/ui/button';
import {
  DAILY_START,
  dayKey,
  dailyModes,
  modeNames,
  dailySpec,
  monthDays,
  shiftDay,
  dailyCompleted,
} from '@/lib/daily.mjs';
import { restoreDaily } from '@/lib/daily-generator.mjs';
import { readHistory } from '@/lib/history-store';
import { emptyHistory } from '@/lib/play-history.mjs';
import { helpSolved } from '@/lib/solve-help.mjs';
import { dailyXp, experienceSummary } from '@/lib/experience.mjs';
import DailyWorker from '@/lib/daily.worker?worker';
import SlidingGame from './sliding-game';
import DailyRotation from './daily-rotation';
export default function DailyHub({
  back,
  playSound,
  onLearn,
}: {
  back: MutableRefObject<(() => boolean) | null>;
  playSound: (name: string) => void;
  onLearn: () => void;
}) {
  const [today, setToday] = useState(dayKey),
    [selected, setSelected] = useState(dayKey),
    [month, setMonth] = useState(() => dayKey().slice(0, 7));
  const [entry, setEntry] = useState<any>(null),
    [history, setHistory] = useState<any>(emptyHistory),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saveError, setSaveError] = useState(false);
  const childBack = useRef<(() => boolean) | null>(null),
    job = useRef<{
      worker: Worker;
      timer: ReturnType<typeof setTimeout>;
    } | null>(null);
  const storageKey = (day: string, mode: string) =>
    `leuchtwege-daily-v1:${day}:${mode}`;
  const calendar = monthDays(month);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [entry?.puzzle.id]);
  useEffect(() => {
    const update = () => {
      setHistory(readHistory());
      setToday(dayKey());
    };
    update();
    window.addEventListener('leuchtwege-history', update);
    window.addEventListener('storage', update);
    document.addEventListener('visibilitychange', update);
    const timer = setInterval(() => setToday(dayKey()), 30000);
    return () => {
      window.removeEventListener('leuchtwege-history', update);
      window.removeEventListener('storage', update);
      document.removeEventListener('visibilitychange', update);
      clearInterval(timer);
    };
  }, []);
  function cancel() {
    if (job.current) {
      job.current.worker.terminate();
      clearTimeout(job.current.timer);
      job.current = null;
    }
    setBusy(false);
  }
  useEffect(
    () => () => {
      if (job.current) {
        job.current.worker.terminate();
        clearTimeout(job.current.timer);
      }
      back.current = null;
    },
    [back],
  );
  back.current = () => {
    if (childBack.current?.()) return true;
    if (busy) {
      cancel();
      return true;
    }
    if (entry) {
      setEntry(null);
      return true;
    }
    return false;
  };
  function save(next: any) {
    try {
      localStorage.setItem(
        storageKey(next.day, next.mode),
        JSON.stringify(next),
      );
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }
  function open(mode: string) {
    if (selected < DAILY_START || selected > dayKey()) return;
    cancel();
    setError('');
    try {
      const stored = restoreDaily(
        JSON.parse(localStorage.getItem(storageKey(selected, mode)) || 'null'),
        selected,
        mode,
      );
      if (stored) {
        setEntry(stored);
        return;
      }
    } catch {
      setSaveError(true);
    }
    setBusy(true);
    try {
      const worker = new DailyWorker(),
        timer = setTimeout(() => {
          if (job.current?.worker === worker) {
            cancel();
            setError('Die Erzeugung dauert zu lange. Bitte erneut versuchen.');
          }
        }, 15000);
      job.current = { worker, timer };
      worker.onmessage = ({ data }) => {
        if (job.current?.worker !== worker) return;
        cancel();
        if (data.error) {
          setError(data.error);
          return;
        }
        save(data.entry);
        setEntry(data.entry);
      };
      worker.onerror = () => {
        if (job.current?.worker === worker) {
          cancel();
          setError(
            'Das Tagesrätsel konnte nicht erzeugt werden. Bitte erneut versuchen.',
          );
        }
      };
      worker.postMessage({ day: selected, mode });
    } catch {
      cancel();
      setError('Die Erzeugung konnte nicht starten. Bitte erneut versuchen.');
    }
  }
  function change(session: any) {
    const next = { ...entry, session };
    setEntry(next);
    save(next);
  }
  if (entry)
    return (
      <>
        {tr(
          helpSolved(entry.puzzle, entry.session) &&
            !dailyCompleted(history.attempts, entry.day, entry.mode) && (
              <p role="status">
                {tr(
                  'Dieses Brett ist gelöst, zählt aber noch nicht als regulärer Abschluss. Starte es neu und löse es ohne Testhilfe, damit es im Kalender zählt.',
                )}
              </p>
            ),
        )}
        {tr(
          entry.mode === 'turn' ? (
            <DailyRotation
              key={entry.puzzle.id}
              entry={entry}
              onChange={change}
              onExit={() => setEntry(null)}
              back={childBack}
              playSound={playSound}
            />
          ) : (
            <SlidingGame
              key={entry.puzzle.id}
              daily={entry}
              onDailyChange={change}
              onDailyExit={() => setEntry(null)}
              back={childBack}
              playSound={playSound}
              onLearn={onLearn}
            />
          ),
        )}
        {tr(' ')}
        {tr(
          saveError && (
            <p role="status">
              {tr(
                'Dein Tagesrätsel kann gerade nicht gespeichert werden. Lass die App geöffnet.',
              )}
            </p>
          ),
        )}
      </>
    );
  return (
    <section className="daily-screen">
      <p className="level-label">{tr('Jeden Tag ein Lichtblick')}</p>
      <h1>{tr('Tagesrätsel')}</h1>
      <p className="section-intro">
        {tr('Drei Rätsel pro Tag. Löse sie und sammle XP.')}
      </p>
      <details className="info-details daily-archive">
        <summary>{tr('Kalender & frühere Rätsel')}</summary>
        <div className="calendar-heading">
          <Button
            variant="outline"
            aria-label={tr('Vorheriger Monat')}
            disabled={month <= DAILY_START.slice(0, 7) || busy}
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
            disabled={month >= today.slice(0, 7) || busy}
            onClick={() =>
              setMonth(shiftDay(calendar.days.at(-1)!, 1).slice(0, 7))
            }
          >
            {tr('→')}
          </Button>
        </div>
        <div className="daily-calendar">
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
              const count = dailyModes.filter((m) =>
                dailyCompleted(history.attempts, day, m),
              ).length;
              return (
                <button
                  key={day}
                  className={
                    'calendar-day ' + (day === selected ? 'chosen ' : '')
                  }
                  disabled={day < DAILY_START || day > today || busy}
                  aria-pressed={day === selected}
                  aria-current={day === today ? 'date' : undefined}
                  aria-label={tr(
                    `${new Date(day + 'T12:00:00').toLocaleDateString(locale())}: ${count} von 3 Tagesrätseln gelöst`,
                  )}
                  onClick={() => setSelected(day)}
                >
                  <strong>{tr(Number(day.slice(-2)))}</strong>
                  <small>{tr(count ? count + '/3' : '·')}</small>
                </button>
              );
            }),
          )}
        </div>
        <p className="calendar-legend">
          {tr('Die Zahl zeigt deine gelösten Tagesrätsel.')}
        </p>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setSelected(today);
            setMonth(today.slice(0, 7));
          }}
        >
          {tr('Zu heute')}
        </Button>
      </details>
      <h2>
        {tr(
          selected === today
            ? 'Heute'
            : new Date(selected + 'T12:00:00').toLocaleDateString(locale()),
        )}
      </h2>
      <div className="puzzle-cards">
        {tr(
          dailyModes.map((mode) => {
            const spec = dailySpec(selected, mode),
              done = dailyCompleted(history.attempts, selected, mode);
            const award = experienceSummary(history.attempts).awards.find(
              (a) => a.id === spec.id,
            );
            return (
              <button
                className="puzzle-card"
                key={mode}
                disabled={busy}
                onClick={() => open(mode)}
              >
                <span className="puzzle-number">{tr(done ? '✓' : '✳')}</span>
                <span className="puzzle-copy">
                  <strong>{tr((modeNames as any)[mode])}</strong>
                  <small>
                    {tr(
                      award
                        ? `${award.points} XP gesammelt`
                        : `${dailyXp(spec.tier)} XP + 10 XP ohne Tipps`,
                    )}
                  </small>
                  <small>
                    {tr(spec.tier)}
                    {tr(' · ')}
                    {tr(spec.n)}
                    {tr(' × ')}
                    {tr(spec.n)}
                    {tr(' ·')}
                    {tr(' ')}
                    {tr(done ? 'Gelöst – Brett öffnen' : 'Spielen')}
                  </small>
                </span>
                <span>{tr('→')}</span>
              </button>
            );
          }),
        )}
      </div>
      {tr(
        busy && (
          <p role="status">
            {tr('Tageslicht entsteht …')}
            {tr(' ')}
            <Button variant="outline" onClick={cancel}>
              {tr('Abbrechen')}
            </Button>
          </p>
        ),
      )}
      {tr(error && <p role="alert">{tr(error)}</p>)}
      <details className="info-details">
        <summary>{tr('Nachholen & Streak')}</summary>
        <p>
          {tr('Archiv ab ')}
          {tr(new Date(DAILY_START + 'T12:00:00').toLocaleDateString(locale()))}
          {tr(
            '. Nachholen ist jederzeit möglich. Für deine Serie zählt der tatsächliche Spieltag, auch bei Katalog- und freien Rätseln. Bereits abgeschlossene Rätsel erneut anzusehen zählt nicht.',
          )}
        </p>
      </details>
    </section>
  );
}
