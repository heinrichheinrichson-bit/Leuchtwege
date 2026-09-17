'use client';
import { t as tr, locale } from '@/lib/i18n';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import SolveControls from './solve-controls';
import PlayScreen from '@/components/play-screen';
import PlayClock from './play-clock';
import { usePlayClock } from '@/lib/use-play-clock';
import { useVictory } from '@/lib/use-victory';
import { PuzzleReward } from './experience';
import { act, boardOf } from '@/lib/session.mjs';
import { evaluate, neighbor } from '@/lib/game.mjs';
import { connectionSound } from '@/lib/connection-sound.mjs';
import { haptic } from '@/lib/haptics';
export default function DailyRotation({
  entry,
  onChange,
  onExit,
  back,
  playSound,
}: {
  entry: any;
  onChange: (session: any) => void;
  onExit: () => void;
  back: MutableRefObject<(() => boolean) | null>;
  playSound: (name: string) => void;
}) {
  const l = entry.puzzle,
    s = entry.session,
    board = boardOf(l, s),
    status = evaluate(board, l.n, l.source);
  const [locks, setLocks] = useState(false),
    [restart, setRestart] = useState(false),
    [rules, setRules] = useState(false),
    [paused, setPaused] = useState(false);
  const help = useRef<(() => boolean) | null>(null);
  const { victory, celebrating, setVictory } = useVictory(
    () => playSound('success'),
    [l.id, restart, rules].join(':'),
  );
  const clock = usePlayClock(
    {
      puzzleId: l.id,
      name: l.name,
      mode: 'turn',
      origin: 'daily',
      dailyDay: entry.day,
      tier: l.tier,
      n: l.n,
    },
    !status.solved && !restart && !rules && !paused,
    s.moves,
  );
  back.current = () => {
    if (help.current?.()) return true;
    if (restart) {
      setRestart(false);
      return true;
    }
    if (rules) {
      setRules(false);
      return true;
    }
    if (victory) {
      setVictory(false);
      return true;
    }
    return false;
  };
  useEffect(
    () => () => {
      back.current = null;
    },
    [back],
  );
  function apply(next: any, assistance = 'none', quiet = false, reset = false) {
    if (next !== s && assistance === 'none' && !reset) haptic();
    if (next === s) return;
    const after = evaluate(boardOf(l, next), l.n, l.source);
    clock.record(after.solved, next.moves, assistance, reset);
    onChange(next);
    setVictory(after.solved, !quiet);
    if (!after.solved && !reset) {
      const sound = connectionSound(status, after);
      if (sound) playSound(sound);
    }
  }
  return (
    <PlayScreen columns={l.n}>
      <div className="play-heading">
        <div>
          <p className="level-label">
            {tr('Tagesrätsel · Drehen · ')}
            {tr(l.tier)}
          </p>
          <h1>{tr(l.name)}</h1>
        </div>
        <div className="play-heading-tools">
          <span className="size">
            {tr(l.n)}
            {tr(' × ')}
            {tr(l.n)}
          </span>
          <Button
            variant="ghost"
            aria-label={tr('Spielregeln öffnen')}
            onClick={() => setRules(true)}
          >
            ?
          </Button>
        </div>
      </div>
      <PlayClock clock={clock} />
      <div className="meter">
        <span>
          {tr(status.lit.size)}
          {tr(' / ')}
          {tr(board.length)}
          {tr(' verbunden')}
        </span>
        <span>
          {tr(s.moves)}
          {tr(' Drehungen')}
        </span>
      </div>
      <div
        className={
          'board ' +
          (status.solved ? 'complete ' : '') +
          (celebrating ? 'celebrating' : '')
        }
        style={{ gridTemplateColumns: `repeat(${l.n},1fr)` }}
      >
        {tr(
          board.map((mask: number, i: number) => (
            <button
              key={i}
              className={
                'tile ' +
                (status.lit.has(i) ? 'lit ' : '') +
                (s.locks[i] ? 'locked' : '')
              }
              disabled={status.solved}
              aria-label={tr(
                `Zeile ${Math.floor(i / l.n) + 1}, Spalte ${(i % l.n) + 1}${s.locks[i] ? ', gesperrt' : ''}`,
              )}
              aria-pressed={s.locks[i]}
              onClick={() =>
                apply(act(l, s, { type: locks ? 'lock' : 'turn', index: i }))
              }
            >
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <g
                  className="rotor"
                  style={{ transform: `rotate(${s.turns[i] * 90}deg)` }}
                >
                  {tr(
                    [0, 1, 2, 3]
                      .filter((d) => l.initial[i] & (1 << d))
                      .map((d) => (
                        <path
                          key={d}
                          className="wire"
                          d={
                            [
                              'M50 50V0',
                              'M50 50H100',
                              'M50 50V100',
                              'M50 50H0',
                            ][d]
                          }
                        />
                      )),
                  )}
                  <circle
                    cx="50"
                    cy="50"
                    r={i === l.source ? 13 : 5}
                    className={i === l.source ? 'source' : 'joint'}
                  />
                  {tr(
                    i === l.source && (
                      <circle cx="50" cy="50" r="5" fill="var(--lw-142235)" />
                    ),
                  )}
                </g>
                {tr(
                  [0, 1, 2, 3]
                    .filter((d) => {
                      const j = neighbor(i, d, l.n);
                      return (
                        mask & (1 << d) &&
                        (j < 0 || !(board[j] & (1 << ((d + 2) % 4))))
                      );
                    })
                    .map((d) => (
                      <circle
                        key={d}
                        className="open-end"
                        cx={[50, 93, 50, 7][d]}
                        cy={[7, 50, 93, 50][d]}
                        r="3"
                      />
                    )),
                )}
              </svg>
              {tr(s.locks[i] && <span className="lock-mark">{tr('◆')}</span>)}
            </button>
          )),
        )}
      </div>
      <p className="play-status" role="status">
        {tr(
          status.solved
            ? 'Alles verbunden. Schön gelöst.'
            : locks
              ? 'Tippe Kacheln an, um deine Markierung zu sperren oder zu lösen.'
              : `${status.open} offene Anschlüsse`,
        )}
      </p>
      <div className="play-tools">
        <div className="play-actions">
          <Button
            variant="outline"
            disabled={!s.history.length}
            onClick={() => {
              setVictory(false);
              apply(act(l, s, { type: 'undo' }), 'none', true);
            }}
          >
            {tr('↶ Rückgängig')}
          </Button>
          <Button
            variant="outline"
            aria-pressed={locks}
            onClick={() => setLocks(!locks)}
          >
            {tr(locks ? 'Drehen' : 'Sperren')}
          </Button>
          <Button variant="outline" onClick={() => setRestart(true)}>
            {tr('Neustart')}
          </Button>
        </div>
        <SolveControls
          key={l.id}
          puzzle={l}
          session={s}
          back={help}
          onPauseChange={setPaused}
          onApplied={(next, quiet, assistance) =>
            apply(next, assistance, quiet)
          }
        />
      </div>
      {tr(
        status.solved && (
          <Button className="next-inline" onClick={onExit}>
            {tr('Zum Kalender →')}
          </Button>
        ),
      )}
      <Dialog open={victory} onOpenChange={(open) => setVictory(open)}>
        <DialogContent className="game-dialog success-dialog">
          <DialogTitle>{tr('Dein Tageslicht leuchtet!')}</DialogTitle>
          <PuzzleReward
            puzzleId={entry.puzzle.id}
            attemptId={clock.entry?.id}
          />
          <DialogDescription>
            {tr(s.moves)}
            {tr(' Drehungen. Das fertige Netz bleibt für dich gespeichert.')}
          </DialogDescription>
          <Button onClick={onExit}>{tr('Zum Kalender')}</Button>
          <Button variant="outline" onClick={() => setVictory(false)}>
            {tr('Brett ansehen')}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="game-dialog">
          <DialogTitle>{tr('So verbindest du das Tageslicht')}</DialogTitle>
          <DialogDescription>
            {tr(
              'Antippen dreht eine Kachel um 90 Grad. Alle Kacheln müssen mit der Quelle verbunden sein; kein Anschluss darf offen bleiben. Licht allein bestätigt noch keine richtige Ausrichtung.',
            )}
          </DialogDescription>
          <p>
            {tr(
              'Sperren schützt deine eigene Markierung vor versehentlichem Drehen. Eine Sperre bestätigt keine richtige Lösung.',
            )}
          </p>
          <Button onClick={() => setRules(false)}>{tr('Verstanden')}</Button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={restart} onOpenChange={setRestart}>
        <AlertDialogContent className="game-dialog">
          <AlertDialogTitle>{tr('Tagesrätsel neu starten?')}</AlertDialogTitle>
          <AlertDialogDescription>
            {tr(
              'Dieses Brett wird zurückgesetzt. Bereits verbrauchte Tipps werden nicht aufgefüllt. Ein früherer regulärer Abschluss bleibt im Kalender erhalten.',
            )}
          </AlertDialogDescription>
          <AlertDialogCancel>{tr('Abbrechen')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              apply(act(l, s, { type: 'reset' }), 'none', false, true);
              setLocks(false);
              setRestart(false);
            }}
          >
            {tr('Neu starten')}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </PlayScreen>
  );
}
