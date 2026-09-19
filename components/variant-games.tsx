'use client';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { t as tr } from '@/lib/i18n';
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
import {
  variantModes,
  variantNames,
  variantRules,
  variantCatalog,
  variantPuzzle,
  variantStatus,
  variantAct,
  variantKey,
  emptyVariants,
  restoreVariants,
} from '@/lib/variants.mjs';
import { fresh, boardOf } from '@/lib/session.mjs';
import { neighbor } from '@/lib/game.mjs';
import PlayScreen from './play-screen';
import PlayClock from './play-clock';
import SolveControls from './solve-controls';
import { PuzzleReward } from './experience';
import { usePlayClock } from '@/lib/use-play-clock';
import { useVictory } from '@/lib/use-victory';
import { connectionSound } from '@/lib/connection-sound.mjs';
import { haptic } from '@/lib/haptics';

type Back = MutableRefObject<(() => boolean) | null>;
export default function VariantGames({
  back,
  playSound,
}: {
  back: Back;
  playSound: (name: string) => void;
}) {
  const [data, setData] = useState<any>(emptyVariants),
    [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null),
    [size, setSize] = useState(3),
    [error, setError] = useState(false);
  const childBack = useRef<(() => boolean) | null>(null);
  useEffect(() => {
    try {
      setData(
        restoreVariants(JSON.parse(localStorage.getItem(variantKey) || 'null')),
      );
    } catch {
      setError(true);
    }
    setReady(true);
  }, []);
  function save(next: any) {
    setData(next);
    try {
      localStorage.setItem(variantKey, JSON.stringify(next));
      setError(false);
    } catch {
      setError(true);
    }
  }
  back.current = () => {
    if (childBack.current?.()) return true;
    if (selected) {
      setSelected(null);
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
  const entry = useMemo(() => {
    if (!selected) return null;
    const saved = data.free[data.mode];
    const l =
      selected === 'free' && saved
        ? variantPuzzle(data.mode, saved.seed, saved.n)
        : variantCatalog.find((l) => l.id === selected);
    if (!l) return null;
    return {
      puzzle: l,
      session:
        selected === 'free' ? saved.session : data.sessions[l.id] || fresh(l),
    };
  }, [selected, data]);
  function generate() {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0],
      l = variantPuzzle(data.mode, seed, size);
    save({
      ...data,
      free: { ...data.free, [data.mode]: { seed, n: size, session: fresh(l) } },
    });
    setSelected('free');
  }
  if (!ready) return <p>{tr('Wird geladen …')}</p>;
  if (entry)
    return (
      <>
        {error && (
          <p role="alert">
            {tr('Dein Spielstand konnte nicht gespeichert werden.')}
          </p>
        )}
        <VariantBoard
          key={entry.puzzle.id}
          entry={entry}
          origin={selected === 'free' ? 'free' : 'catalog'}
          back={childBack}
          playSound={playSound}
          onExit={() => setSelected(null)}
          onChange={(session) =>
            save(
              selected === 'free'
                ? {
                    ...data,
                    free: {
                      ...data.free,
                      [data.mode]: { ...data.free[data.mode], session },
                    },
                  }
                : {
                    ...data,
                    sessions: { ...data.sessions, [entry.puzzle.id]: session },
                  },
            )
          }
        />
      </>
    );
  return (
    <section className="variant-hub">
      <h1>{tr('Neue Spielmodi')}</h1>
      <p className="section-intro">
        {tr(
          'Drei neue Ideen zum Ausprobieren. Die Schwierigkeit ist vorläufig.',
        )}
      </p>
      {error && (
        <p role="alert">
          {tr('Dein Spielstand konnte nicht gespeichert werden.')}
        </p>
      )}
      <div className="variant-tabs" aria-label={tr('Spielmodus')}>
        {variantModes.map((mode) => (
          <Button
            key={mode}
            variant={mode === data.mode ? 'default' : 'outline'}
            aria-pressed={mode === data.mode}
            onClick={() => save({ ...data, mode })}
          >
            {tr(variantNames[mode as keyof typeof variantNames])}
          </Button>
        ))}
      </div>
      <p className="variant-rule">
        {tr(variantRules[data.mode as keyof typeof variantRules])}
      </p>
      <h2>{tr('Proberätsel')}</h2>
      <div className="variant-levels">
        {variantCatalog
          .filter((l) => l.mode === data.mode)
          .map((l, i) => {
            const s = data.sessions[l.id],
              solved = !!s && variantStatus(l, s).solved;
            return (
              <Button
                key={l.id}
                variant="outline"
                onClick={() => setSelected(l.id)}
              >
                <span>
                  {tr(`Rätsel ${String(i + 1).padStart(2, '0')}`)}
                  <small>
                    {l.n} × {l.n} · {tr(l.tier)}
                  </small>
                </span>
                <span aria-label={tr(solved ? 'Gelöst' : 'Noch offen')}>
                  {solved ? '✓' : '→'}
                </span>
              </Button>
            );
          })}
      </div>
      <h2>{tr('Freies Spiel')}</h2>
      <div className="variant-tabs">
        {[3, 4].map((n) => (
          <Button
            key={n}
            variant={size === n ? 'default' : 'outline'}
            aria-pressed={size === n}
            onClick={() => setSize(n)}
          >
            {n} × {n}
          </Button>
        ))}
        <Button onClick={generate}>{tr('Neues Rätsel')}</Button>
        {data.free[data.mode] && (
          <Button variant="outline" onClick={() => setSelected('free')}>
            {tr('Weiterspielen')}
          </Button>
        )}
      </div>
    </section>
  );
}

function VariantBoard({
  entry,
  origin,
  onChange,
  onExit,
  back,
  playSound,
}: {
  entry: any;
  origin: string;
  onChange: (session: any) => void;
  onExit: () => void;
  back: Back;
  playSound: (name: string) => void;
}) {
  const l = entry.puzzle,
    s = entry.session,
    board = boardOf(l, s),
    status = variantStatus(l, s);
  const [restart, setRestart] = useState(false),
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
      mode: l.mode,
      origin,
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
    if (next === s) return;
    if (assistance === 'none' && !reset) haptic();
    const after = variantStatus(l, next);
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
            {tr(origin === 'free' ? 'Freies Spiel' : 'Proberätsel')} ·{' '}
            {tr(l.tier)}
          </p>
          <h1>{tr(l.name)}</h1>
        </div>
        <span className="size">
          {l.n} × {l.n}
        </span>
      </div>
      <PlayClock clock={clock} />
      <div className="meter">
        <span>
          {l.mode === 'path'
            ? `${status.reached} / ${l.targets.length} ★`
            : `${status.lit.size} / ${board.length} ${tr('verbunden')}`}
        </span>
        <span>
          {s.moves} {tr('Drehungen')}
        </span>
      </div>
      <div
        className={`board variant-board variant-${l.mode} ${status.solved ? 'complete' : ''} ${celebrating ? 'celebrating' : ''}`}
        style={{ gridTemplateColumns: `repeat(${l.n},1fr)` }}
      >
        {board.map((mask: number, i: number) => {
          const group = l.groups.findIndex((g: number[]) => g.includes(i)) + 1;
          const marker =
            l.mode === 'dual'
              ? l.owners[i]
                ? 'B'
                : 'A'
              : l.mode === 'linked'
                ? String(group)
                : l.targets.includes(i)
                  ? '★'
                  : '';
          const isSource =
            l.mode === 'dual' ? l.sources.includes(i) : i === l.source;
          return (
            <button
              key={i}
              className={`tile ${status.lit.has(i) ? 'lit' : ''} ${l.mode === 'dual' && l.owners[i] ? 'circuit-b' : ''} ${status.wrong?.has(i) ? 'wrong-network' : ''}`}
              disabled={status.solved}
              aria-label={`${tr('Zeile')} ${Math.floor(i / l.n) + 1}, ${tr('Spalte')} ${(i % l.n) + 1}${marker ? `, ${marker}` : ''}`}
              onClick={() =>
                apply(variantAct(l, s, { type: 'turn', index: i }))
              }
            >
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <g
                  className="rotor"
                  style={{ transform: `rotate(${s.turns[i] * 90}deg)` }}
                >
                  {[0, 1, 2, 3]
                    .filter((d) => l.initial[i] & (1 << d))
                    .map((d) => (
                      <path
                        key={d}
                        className="wire"
                        d={
                          ['M50 50V0', 'M50 50H100', 'M50 50V100', 'M50 50H0'][
                            d
                          ]
                        }
                      />
                    ))}
                  <circle
                    cx="50"
                    cy="50"
                    r={isSource ? 13 : 5}
                    className={isSource ? 'source' : 'joint'}
                  />
                  {isSource && (
                    <circle cx="50" cy="50" r="5" fill="var(--lw-142235)" />
                  )}
                </g>
                {(l.mode !== 'path' || status.lit.has(i)) &&
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
                    ))}
              </svg>
              {marker && (
                <span className="variant-marker" aria-hidden="true">
                  {marker}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="play-status" role="status">
        {tr(
          status.solved
            ? 'Alles verbunden. Schön gelöst.'
            : status.wrong?.size
              ? 'Die Stromkreise sind vermischt.'
              : l.mode === 'linked'
                ? 'Gleiche Zahlen drehen gemeinsam.'
                : l.mode === 'path'
                  ? 'Verbinde alle Sterne. Übrige Kacheln dürfen dunkel bleiben.'
                  : 'A zu A, B zu B. Halte die Netze getrennt.',
        )}
      </p>
      <div className="play-tools">
        <div className="play-actions">
          <Button
            variant="outline"
            disabled={!s.history.length}
            onClick={() =>
              apply(variantAct(l, s, { type: 'undo' }), 'none', true)
            }
          >
            {tr('↶ Rückgängig')}
          </Button>
          <Button variant="outline" onClick={() => setRules(true)}>
            {tr('Spielregeln')}
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
      {status.solved && (
        <Button className="next-inline" onClick={onExit}>
          {tr('Zur Auswahl →')}
        </Button>
      )}
      <Dialog open={victory} onOpenChange={(open) => setVictory(open)}>
        <DialogContent className="game-dialog success-dialog">
          <DialogTitle>{tr('Schön gelöst!')}</DialogTitle>
          <PuzzleReward puzzleId={l.id} attemptId={clock.entry?.id} />
          <DialogDescription>
            {s.moves}{' '}
            {tr('Drehungen. Das fertige Netz bleibt für dich gespeichert.')}
          </DialogDescription>
          <Button onClick={onExit}>{tr('Zur Auswahl')}</Button>
          <Button variant="outline" onClick={() => setVictory(false)}>
            {tr('Brett ansehen')}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="game-dialog">
          <DialogTitle>{tr(l.name)}</DialogTitle>
          <DialogDescription>
            {tr(variantRules[l.mode as keyof typeof variantRules])}
          </DialogDescription>
          <Button onClick={() => setRules(false)}>{tr('Verstanden')}</Button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={restart} onOpenChange={setRestart}>
        <AlertDialogContent className="game-dialog">
          <AlertDialogTitle>{tr('Rätsel neu starten?')}</AlertDialogTitle>
          <AlertDialogDescription>
            {tr(
              'Das Brett wird zurückgesetzt. Bereits verbrauchte Tipps bleiben verbraucht.',
            )}
          </AlertDialogDescription>
          <AlertDialogCancel>{tr('Abbrechen')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              apply(fresh(l), 'none', false, true);
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
