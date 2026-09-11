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
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [rules, setRules] = useState(false);
  const [restart, setRestart] = useState(false);
  const { victory, celebrating, setVictory } = useVictory(
    () => playSound('success'),
    [saved.current, playing, rules, restart].join(':'),
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
  const l = puzzles[saved.current],
    s = saved.sessions[l.id] || freshSliding(l);
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
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('leuchtwege-sliding-v1', JSON.stringify(saved));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [saved, ready]);
  function clearGesture() {
    gesture.current = null;
    setPreview(null);
  }
  back.current = () => {
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
    setSaved((v: any) => ({ ...v, sessions: { ...v.sessions, [l.id]: next } }));
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
            Zwei neue Varianten mit je drei Proberätseln. Acht Kacheln, ein
            Leerfeld, ein leuchtendes Netz.
          </p>
          {['slide', 'rotate'].map((mode) => (
            <section className="catalog-group" key={mode}>
              <h2>{mode === 'slide' ? 'Nur Schieben' : 'Schieben & Drehen'}</h2>
              <p className="section-intro">
                {mode === 'slide'
                  ? 'Bringe die Kacheln durch das Leerfeld an ihren Platz. Ihre Ausrichtung bleibt fest.'
                  : 'Finde die passenden Plätze und drehe die Kacheln, bis alle Wege zusammenpassen.'}
              </p>
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
          <p className="home-foot">Jede Partie bleibt separat gespeichert.</p>
        </section>
      ) : (
        <section className="play-screen slide-screen">
          <div className="play-heading">
            <div>
              <p className="level-label">
                {l.mode === 'slide' ? 'Nur Schieben' : 'Schieben & Drehen'} ·
                Probe {(saved.current % 3) + 1} / 3
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
              {l.pieces.map((baseMask, id) => {
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
            onApplied={(next) => {
              setSaved((v: any) => ({
                ...v,
                sessions: { ...v.sessions, [l.id]: next },
              }));
              setSelected(null);
              setHint('');
              clearGesture();
              const solved = slidingStatus(l, next).solved;
              setVictory(solved);
            }}
          />
          {status.solved && (
            <Button
              className="next-inline"
              onClick={() =>
                nextIndex >= 0 ? open(nextIndex) : setPlaying(false)
              }
            >
              {nextIndex >= 0 ? 'Nächstes Rätsel →' : 'Zur Modusauswahl →'}
            </Button>
          )}
        </section>
      )}
      {storageError && (
        <p role="status" className="mode-help">
          Die Schiebepartie kann gerade nicht gespeichert werden. Lass die App
          geöffnet.
        </p>
      )}
      <Dialog open={victory} onOpenChange={setVictory}>
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
              nextIndex >= 0 ? open(nextIndex) : setPlaying(false);
            }}
          >
            {nextIndex >= 0 ? 'Nächstes Rätsel →' : 'Zur Modusauswahl'}
          </Button>
          <Button variant="outline" onClick={() => setVictory(false)}>
            Brett ansehen
          </Button>
        </DialogContent>
      </Dialog>
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
