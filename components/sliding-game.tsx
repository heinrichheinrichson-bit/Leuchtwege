'use client';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useVictory } from '@/lib/use-victory';
import SolveControls from '@/components/solve-controls';
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
import puzzles from '@/lib/sliding-levels.json';
import {
  adjacent,
  freshSliding,
  restoreSliding,
  slidingBoard,
  slidingStatus,
  slideAct,
  tapSliding,
  swipeSliding,
} from '@/lib/sliding.mjs';
import { neighbor } from '@/lib/game.mjs';
import { connectionSound } from '@/lib/connection-sound.mjs';
import { restoreFreeSliding, slidingTiers } from '@/lib/random-sliding.mjs';
import RandomSlidingWorker from '@/lib/random-sliding.worker?worker';

export default function SlidingGame({
  back,
  playSound,
}: {
  back: MutableRefObject<(() => boolean) | null>;
  playSound: (name: string) => void;
}) {
  const helpBack = useRef<(() => boolean) | null>(null);
  const [saved, setSaved] = useState<any>({
    version: 1,
    current: 0,
    sessions: {},
  });
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [free, setFree] = useState<any>(() => restoreFreeSliding(null));
  const [freeMode, setFreeMode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [replaceMode, setReplaceMode] = useState<string | null>(null);
  const job = useRef<{
    worker: Worker;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [rules, setRules] = useState(false);
  const [restart, setRestart] = useState(false);
  const { victory, celebrating, setVictory } = useVictory(
    () => playSound('success'),
    [
      saved.current,
      freeMode,
      freeMode && free[freeMode]?.puzzle.id,
      playing,
      rules,
      restart,
    ].join(':'),
  );
  const [hint, setHint] = useState('');
  const gesture = useRef<{
    pointer: number;
    id: number;
    x: number;
    y: number;
    size: number;
  } | null>(null);
  const suppressClick = useRef(0);
  const l =
      freeMode && free[freeMode]
        ? free[freeMode].puzzle
        : puzzles[saved.current],
    s =
      freeMode && free[freeMode]
        ? free[freeMode].session
        : saved.sessions[l.id] || freshSliding(l);
  const board = slidingBoard(l, s),
    status = slidingStatus(l, s),
    hole = s.positions.indexOf(null);
  useEffect(() => {
    try {
      setSaved(
        restoreSliding(
          puzzles,
          JSON.parse(localStorage.getItem('leuchtwege-sliding-v1') || 'null'),
        ),
      );
    } catch {
      setStorageError(true);
    }
    try {
      setFree(
        restoreFreeSliding(
          JSON.parse(
            localStorage.getItem('leuchtwege-sliding-free-v1') || 'null',
          ),
        ),
      );
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('leuchtwege-sliding-v1', JSON.stringify(saved));
      localStorage.setItem('leuchtwege-sliding-free-v1', JSON.stringify(free));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [saved, free, ready]);
  function cancelGeneration() {
    if (job.current) {
      job.current.worker.terminate();
      clearTimeout(job.current.timer);
      job.current = null;
    }
    setGenerating(false);
  }
  useEffect(
    () => () => {
      if (job.current) {
        job.current.worker.terminate();
        clearTimeout(job.current.timer);
      }
    },
    [],
  );
  function storeSession(next: any) {
    if (freeMode)
      setFree((v: any) => ({
        ...v,
        [freeMode]: { ...v[freeMode], session: next },
      }));
    else
      setSaved((v: any) => ({
        ...v,
        sessions: { ...v.sessions, [l.id]: next },
      }));
  }
  function openFree(mode: string) {
    setFreeMode(mode);
    setPlaying(true);
    setSelected(null);
    setHint('');
    setVictory(false);
    clearGesture();
  }
  function generate(mode: string, tier = free.tiers[mode]) {
    cancelGeneration();
    setGenerationError('');
    setGenerating(true);
    setVictory(false);
    let worker: Worker;
    try {
      worker = new RandomSlidingWorker();
    } catch {
      setGenerating(false);
      setGenerationError(
        'Die Erzeugung konnte nicht starten. Bitte erneut versuchen.',
      );
      return;
    }
    const timer = setTimeout(() => {
      if (job.current?.worker === worker) {
        cancelGeneration();
        setGenerationError(
          'Das Rätsel braucht zu lange. Bitte erneut versuchen.',
        );
      }
    }, 15000);
    job.current = { worker, timer };
    worker.onmessage = ({ data }) => {
      if (job.current?.worker !== worker) return;
      cancelGeneration();
      if (data.error) {
        setGenerationError(data.error);
        return;
      }
      const puzzle = data.puzzle;
      setFree((v: any) => ({
        ...v,
        [mode]: { puzzle, session: freshSliding(puzzle) },
        recent: [...v.recent, puzzle.fingerprint].slice(-100),
      }));
      openFree(mode);
    };
    worker.onerror = () => {
      if (job.current?.worker === worker) {
        cancelGeneration();
        setGenerationError(
          'Die Erzeugung wurde unterbrochen. Bitte erneut versuchen.',
        );
      }
    };
    worker.postMessage({
      mode,
      tier,
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
      exclude: free.recent,
    });
  }
  function requestGeneration(mode: string) {
    const entry = free[mode];
    if (entry && !slidingStatus(entry.puzzle, entry.session).solved)
      setReplaceMode(mode);
    else generate(mode);
  }
  function nextGame() {
    if (freeMode) generate(freeMode, l.tier);
    else if (nextIndex >= 0) open(nextIndex);
    else setPlaying(false);
  }
  function clearGesture() {
    gesture.current = null;
    setPreview(null);
  }
  back.current = () => {
    if (generating) {
      cancelGeneration();
      return true;
    }
    if (replaceMode) {
      setReplaceMode(null);
      return true;
    }
    if (helpBack.current?.()) return true;
    if (restart) {
      setRestart(false);
      return true;
    }
    if (victory) {
      setVictory(false);
      return true;
    }
    if (rules) {
      setRules(false);
      return true;
    }
    if (playing) {
      setPlaying(false);
      setSelected(null);
      clearGesture();
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
  function open(index: number) {
    setFreeMode(null);
    setSaved((v: any) => ({ ...v, current: index }));
    setPlaying(true);
    setSelected(null);
    setHint('');
    setVictory(false);
    clearGesture();
  }
  function dispatch(action: { type: string; id?: number }) {
    const next = slideAct(l, s, action);
    if (next === s) return;
    storeSession(next);
    setHint('');
    if (action.type === 'reset' || action.type === 'undo') {
      setSelected(null);
      setVictory(false);
      clearGesture();
      return;
    }
    if (action.type === 'slide') setSelected(null);
    const after = slidingStatus(l, next);
    if (after.solved) {
      setVictory(true);
      setSelected(null);
    } else {
      // Compare identities: the source and its illuminated tiles can move together.
      const effect = connectionSound(
        { lit: status.litIds },
        { lit: after.litIds, solved: false },
      );
      if (effect) playSound(effect);
    }
  }
  function tap(position: number) {
    if (!ready || status.solved) return;
    const result = tapSliding(l, s, selected, position);
    setSelected(result.selected);
    if (result.action) dispatch(result.action);
    else
      setHint(
        s.positions[position] === null
          ? 'Wähle zuerst eine Kachel direkt neben dem Leerfeld.'
          : '',
      );
  }
  const nextIndex = puzzles.findIndex(
    (p, i) => i > saved.current && p.mode === l.mode,
  );
  return (
    <>
      {!playing ? (
        <section className="catalog-screen">
          <h1>Wege in Bewegung</h1>
          <p className="section-intro">
            Acht Kacheln, ein Leerfeld, ein leuchtendes Netz. Spiele die
            Proberätsel oder lass neue Wege entstehen.
          </p>
          {['slide', 'rotate'].map((mode) => (
            <section className="catalog-group" key={mode}>
              <h2>{mode === 'slide' ? 'Nur Schieben' : 'Schieben & Drehen'}</h2>
              <p className="section-intro">
                {mode === 'slide'
                  ? 'Bringe die Kacheln durch das Leerfeld an ihren Platz. Ihre Ausrichtung bleibt fest.'
                  : 'Finde die passenden Plätze und drehe die Kacheln, bis alle Wege zusammenpassen.'}
              </p>
              <div className="sliding-free-options">
                <label htmlFor={'slide-tier-' + mode}>
                  Freies Spiel · 3 × 3
                </label>
                <select
                  id={'slide-tier-' + mode}
                  value={free.tiers[mode]}
                  disabled={generating || !ready}
                  onChange={(e) =>
                    setFree((v: any) => ({
                      ...v,
                      tiers: { ...v.tiers, [mode]: e.target.value },
                    }))
                  }
                >
                  {slidingTiers.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <Button
                  disabled={!ready || generating}
                  onClick={() => requestGeneration(mode)}
                >
                  Neues Rätsel erzeugen
                </Button>
                {free[mode] && (
                  <Button
                    variant="outline"
                    disabled={generating || !ready}
                    onClick={() => openFree(mode)}
                  >
                    {slidingStatus(free[mode].puzzle, free[mode].session).solved
                      ? 'Letztes Brett ansehen'
                      : 'Freie Partie fortsetzen'}{' '}
                    · {free[mode].puzzle.tier}
                  </Button>
                )}
              </div>
              <div className="puzzle-cards">
                {puzzles.map((p, i) =>
                  p.mode !== mode ? null : (
                    <button
                      className="puzzle-card"
                      key={p.id}
                      disabled={!ready}
                      onClick={() => open(i)}
                    >
                      <span className="puzzle-number">{(i % 3) + 1}</span>
                      <span className="puzzle-copy">
                        <strong>{p.name}</strong>
                        <small>
                          3 × 3 ·{' '}
                          {saved.sessions[p.id]
                            ? slidingStatus(p, saved.sessions[p.id]).solved
                              ? 'Gelöst'
                              : 'Fortsetzen'
                            : 'Noch offen'}
                        </small>
                      </span>
                      <span>→</span>
                    </button>
                  ),
                )}
              </div>
            </section>
          ))}
          <p className="home-foot">
            Je eine freie Partie pro Modus bleibt gespeichert. Die Einstufung
            berücksichtigt die nötigen Schübe bis zu einem gültigen Netz. Beim
            Schieben & Drehen kommt das Ausrichten dazu.
          </p>
        </section>
      ) : (
        <section className="play-screen slide-screen">
          <div className="play-heading">
            <div>
              <p className="level-label">
                {l.mode === 'slide' ? 'Nur Schieben' : 'Schieben & Drehen'} ·
                {freeMode
                  ? 'Freies Spiel · ' + l.tier
                  : 'Probe ' + ((saved.current % 3) + 1) + ' / 3'}
              </p>
              <h1>{l.name}</h1>
            </div>
            <span className="size">3 × 3</span>
          </div>
          <p className="lesson">
            {l.mode === 'slide'
              ? 'Wische zum Leerfeld. Oder tippe erst die Kachel, dann das Leerfeld an.'
              : 'Wischen verschiebt. Antippen wählt aus; nochmals antippen dreht. Tippen aufs Leerfeld verschiebt die Auswahl.'}
          </p>
          <div className="meter">
            <span>
              <i />
              {status.lit.size} / 8 verbunden
            </span>
            <span>
              {s.slides} Schübe
              {l.mode === 'rotate' ? ' · ' + s.rotations + ' Drehungen' : ''}
            </span>
          </div>
          <div
            className={
              'board slide-board ' +
              (status.solved ? 'complete ' : '') +
              (celebrating ? 'celebrating' : '')
            }
          >
            <div className="slide-grid">
              <button
                className={
                  'slide-hole ' +
                  ((selected !== null &&
                    adjacent(s.positions.indexOf(selected), hole, l.n)) ||
                  preview !== null
                    ? 'target'
                    : '')
                }
                style={{
                  left: ((hole % 3) * 100) / 3 + '%',
                  top: (Math.floor(hole / 3) * 100) / 3 + '%',
                }}
                disabled={!ready || status.solved}
                onClick={() => tap(hole)}
                aria-label="Leerfeld: ausgewählte benachbarte Kachel hierher schieben"
              >
                <span>Leerfeld</span>
              </button>
              {l.pieces.map((baseMask: number, id: number) => {
                const pos = s.positions.indexOf(id),
                  mask = board[pos];
                return (
                  <button
                    key={l.id + '-' + id}
                    className={
                      'tile slide-tile ' +
                      (status.lit.has(pos) ? 'lit ' : '') +
                      (selected === id ? 'selected ' : '') +
                      (preview === id ? 'swiping' : '')
                    }
                    style={{
                      transform: `translate(${(pos % 3) * 100}%, ${Math.floor(pos / 3) * 100}%)`,
                    }}
                    disabled={!ready || status.solved}
                    aria-pressed={selected === id}
                    aria-label={
                      'Kachel in Zeile ' +
                      (Math.floor(pos / 3) + 1) +
                      ', Spalte ' +
                      ((pos % 3) + 1) +
                      (id === l.sourceId ? ', Lichtquelle' : '') +
                      '. Anschlüsse: ' +
                      [0, 1, 2, 3]
                        .filter((d) => mask & (1 << d))
                        .map((d) => ['oben', 'rechts', 'unten', 'links'][d])
                        .join(', ') +
                      '. ' +
                      (selected === id && l.mode === 'rotate'
                        ? 'Erneut aktivieren zum Drehen.'
                        : 'Aktivieren zum Auswählen.')
                    }
                    onPointerDown={(e) => {
                      if (!e.isPrimary || e.button !== 0 || gesture.current)
                        return;
                      gesture.current = {
                        pointer: e.pointerId,
                        id,
                        x: e.clientX,
                        y: e.clientY,
                        size: e.currentTarget.getBoundingClientRect().width,
                      };
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      const g = gesture.current;
                      if (!g || g.pointer !== e.pointerId) return;
                      setPreview(
                        swipeSliding(
                          l,
                          s,
                          g.id,
                          e.clientX - g.x,
                          e.clientY - g.y,
                          g.size,
                        )
                          ? g.id
                          : null,
                      );
                    }}
                    onPointerUp={(e) => {
                      const g = gesture.current;
                      if (!g || g.pointer !== e.pointerId) return;
                      const dx = e.clientX - g.x,
                        dy = e.clientY - g.y;
                      clearGesture();
                      if (Math.hypot(dx, dy) > 10) {
                        suppressClick.current = Date.now() + 500;
                        const action = swipeSliding(l, s, g.id, dx, dy, g.size);
                        if (action) dispatch(action);
                        else
                          setHint(
                            'Nur eine benachbarte Kachel gerade zum Leerfeld schieben.',
                          );
                      }
                    }}
                    onPointerCancel={() => {
                      clearGesture();
                      suppressClick.current = Date.now() + 500;
                    }}
                    onLostPointerCapture={() => {
                      if (gesture.current) {
                        clearGesture();
                        suppressClick.current = Date.now() + 500;
                      }
                    }}
                    onClick={(e) => {
                      if (
                        e.detail !== 0 &&
                        Date.now() < suppressClick.current
                      ) {
                        suppressClick.current = 0;
                        return;
                      }
                      tap(pos);
                    }}
                  >
                    <svg viewBox="0 0 100 100" aria-hidden="true">
                      <g
                        className="rotor"
                        style={{
                          transform: 'rotate(' + s.turns[id] * 90 + 'deg)',
                        }}
                      >
                        {[0, 1, 2, 3]
                          .filter((d) => baseMask & (1 << d))
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
                          ))}
                        <circle
                          cx="50"
                          cy="50"
                          r={id === l.sourceId ? 13 : 5}
                          className={id === l.sourceId ? 'source' : 'joint'}
                        />
                        {id === l.sourceId && (
                          <circle cx="50" cy="50" r="5" fill="#142235" />
                        )}
                      </g>
                      {[0, 1, 2, 3]
                        .filter((d) => {
                          const j = neighbor(pos, d, l.n);
                          return (
                            mask & (1 << d) &&
                            (j < 0 || !(board[j] & (1 << ((d + 2) % 4))))
                          );
                        })
                        .map((d) => (
                          <circle
                            key={d}
                            cx={[50, 93, 50, 7][d]}
                            cy={[7, 50, 93, 50][d]}
                            r="3"
                            className="open-end"
                          />
                        ))}
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="play-status" aria-live="polite">
            {status.solved
              ? 'Alles verbunden. Schön gelöst.'
              : hint ||
                (selected !== null
                  ? 'Kachel ausgewählt. ' +
                    (adjacent(s.positions.indexOf(selected), hole, l.n)
                      ? 'Tippe auf das Leerfeld.'
                      : l.mode === 'rotate'
                        ? 'Nochmals antippen zum Drehen.'
                        : 'Sie liegt nicht neben dem Leerfeld.')
                  : status.open +
                    ' offene Anschlüsse · Das Leerfeld bleibt frei.')}
          </p>
          <div className="play-actions">
            <Button
              variant="outline"
              disabled={!s.history.length}
              onClick={() => dispatch({ type: 'undo' })}
            >
              <span>↶</span>Rückgängig
            </Button>
            <Button variant="outline" onClick={() => setRules(true)}>
              <span>?</span>Regeln
            </Button>
            <Button variant="outline" onClick={() => setRestart(true)}>
              <span>↻</span>Neustart
            </Button>
          </div>
          <SolveControls
            key={l.id}
            puzzle={l}
            session={s}
            back={helpBack}
            onApplied={(next, quiet) => {
              storeSession(next);
              setSelected(null);
              setHint('');
              clearGesture();
              const solved = slidingStatus(l, next).solved;
              setVictory(solved, !quiet);
            }}
          />
          {status.solved && (
            <Button
              className="next-inline"
              disabled={generating}
              onClick={nextGame}
            >
              {freeMode || nextIndex >= 0
                ? 'Nächstes Rätsel →'
                : 'Zur Modusauswahl →'}
            </Button>
          )}
        </section>
      )}
      {generating && (
        <div className="mode-help" role="status">
          Neue Wege entstehen …{' '}
          <Button variant="outline" onClick={cancelGeneration}>
            Abbrechen
          </Button>
        </div>
      )}
      {generationError && (
        <p className="mode-help" role="alert">
          {generationError}
        </p>
      )}
      {storageError && (
        <p role="status" className="mode-help">
          Die Schiebepartie kann gerade nicht gespeichert werden. Lass die App
          geöffnet.
        </p>
      )}
      <Dialog open={victory} onOpenChange={(open) => setVictory(open)}>
        <DialogContent
          className="game-dialog success-dialog"
          showCloseButton={false}
        >
          <div className="success-symbol" aria-hidden="true">
            ✳
          </div>
          <DialogTitle className="dialog-heading">
            Dein Netz leuchtet!
          </DialogTitle>
          <DialogDescription>
            {s.slides} Schübe
            {l.mode === 'rotate' ? ' · ' + s.rotations + ' Drehungen' : ''}.
            Alle acht Kacheln sind verbunden.
          </DialogDescription>
          <Button
            onClick={() => {
              setVictory(false);
              nextGame();
            }}
          >
            {freeMode || nextIndex >= 0
              ? 'Nächstes Rätsel →'
              : 'Zur Modusauswahl'}
          </Button>
          <Button variant="outline" onClick={() => setVictory(false)}>
            Brett ansehen
          </Button>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={replaceMode !== null}
        onOpenChange={(open) => {
          if (!open) setReplaceMode(null);
        }}
      >
        <AlertDialogContent className="game-dialog">
          <AlertDialogTitle className="dialog-heading">
            Neue freie Partie?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Deine noch offene freie Partie in diesem Modus wird ersetzt. Die
            Proberätsel und der andere Modus bleiben gespeichert.
          </AlertDialogDescription>
          <AlertDialogCancel>Weiterspielen</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const mode = replaceMode;
              setReplaceMode(null);
              if (mode) generate(mode);
            }}
          >
            Neue Partie
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="game-dialog">
          <DialogTitle className="dialog-heading">
            So bewegst du das Licht
          </DialogTitle>
          <DialogDescription>
            Verbinde alle acht Kacheln mit der Quelle. Kein Anschluss darf ins
            Leerfeld oder über den Rand zeigen. Die Quelle wandert mit ihrer
            Kachel mit.
          </DialogDescription>
          <p>
            Wische eine direkt benachbarte Kachel zum Leerfeld. Oder tippe erst
            die Kachel und anschließend das Leerfeld an. Diagonales Schieben
            geht nicht.
          </p>
          <p>
            {l.mode === 'rotate'
              ? 'Antippen wählt eine Kachel aus. Ein weiteres Antippen derselben Kachel dreht sie um 90 Grad. Eine andere Kachel antippen wechselt die Auswahl.'
              : 'Die Kacheln behalten beim Schieben ihre Ausrichtung. Drehen ist in diesem Modus ausgeschaltet.'}
          </p>
          <p>
            Jedes vollständig verbundene Netz ohne offene Anschlüsse zählt als
            Lösung.
          </p>
          <Button onClick={() => setRules(false)}>Verstanden</Button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={restart} onOpenChange={setRestart}>
        <AlertDialogContent className="game-dialog">
          <AlertDialogTitle className="dialog-heading">
            Schiebepartie neu starten?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Diese Partie wird auf ihre Ausgangsstellung zurückgesetzt. Andere
            Spielstände bleiben erhalten.
          </AlertDialogDescription>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              dispatch({ type: 'reset' });
              setRestart(false);
            }}
          >
            Neu starten
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
