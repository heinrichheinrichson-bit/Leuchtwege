'use client';
import { t as tr, locale } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  tutorials,
  newTutorial,
  tutorialAct,
  tutorialBoard,
  tutorialStatus,
  tutorialProgress,
} from '@/lib/tutorial.mjs';
import { tapSliding, swipeSliding } from '@/lib/sliding.mjs';
import { neighbor } from '@/lib/game.mjs';
import { connectionSound } from '@/lib/connection-sound.mjs';
import { haptic } from '@/lib/haptics';
import { useVictory } from '@/lib/use-victory';

export default function TutorialGame({
  onExit,
  onPlay,
  playSound,
  initialMode = 'turn',
}: {
  onExit: () => void;
  onPlay: (mode: string) => void;
  playSound: (name: string) => void;
  initialMode?: string;
}) {
  const [mode, setMode] = useState(initialMode);
  const [state, setState] = useState<any>(() => newTutorial(initialMode));
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [completed, setCompleted] = useState<any>({});
  const [saveError, setSaveError] = useState(false);
  const gesture = useRef<{
    pointer: number;
    id: number;
    x: number;
    y: number;
    size: number;
  } | null>(null);
  const suppressClick = useRef(0);
  const lesson = (tutorials as any)[mode],
    l = lesson.puzzle,
    step = lesson.steps[state.step];
  const board = tutorialBoard(mode, state),
    status = tutorialStatus(mode, state);
  const { celebrating, setVictory } = useVictory(
    () => playSound('success'),
    mode,
  );
  useEffect(() => {
    try {
      setCompleted(
        tutorialProgress(
          JSON.parse(localStorage.getItem('leuchtwege-learn-v1') || 'null'),
        ),
      );
    } catch {
      setSaveError(true);
    }
  }, []);
  function choose(next: string) {
    setMode(next);
    setState(newTutorial(next));
    setSelected(null);
    setMessage('');
    gesture.current = null;
    suppressClick.current = 0;
    setVictory(false);
  }
  function apply(action: any) {
    const next = tutorialAct(mode, state, action);
    if (next === state) {
      setMessage('Für diesen Übungsschritt ist die umrandete Kachel dran.');
      return;
    }
    const after = tutorialStatus(mode, next);
    haptic();
    setState(next);
    setSelected(null);
    setMessage('');
    if (after.solved) {
      setVictory(true, false);
      const done = { ...completed, [mode]: true };
      setCompleted(done);
      try {
        localStorage.setItem('leuchtwege-learn-v1', JSON.stringify(done));
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
    } else {
      const effect = connectionSound(
        { lit: status.litIds || status.lit },
        { lit: after.litIds || after.lit, solved: after.solved },
      );
      if (effect) playSound(effect);
    }
  }
  function tap(pos: number) {
    if (!step) return;
    if (mode === 'turn') {
      apply({ type: 'turn', index: pos });
      return;
    }
    const result = tapSliding(l, state.session, selected, pos);
    setSelected(result.selected);
    if (result.action) apply(result.action);
    else
      setMessage(
        result.selected === step.action.id
          ? 'Kachel ausgewählt. ' +
              (step.action.type === 'turn'
                ? 'Tippe sie noch einmal an.'
                : 'Tippe jetzt auf das Leerfeld.')
          : 'Tippe die umrandete Kachel an oder wische sie zum Leerfeld.',
      );
  }
  const ids = l.pieces
    ? l.pieces.map((_: number, id: number) => id)
    : board.map((_: number, id: number) => id);
  const hole = l.pieces ? state.session.positions.indexOf(null) : -1;
  const target = step?.action.id ?? step?.action.index;
  return (
    <section className="learn-screen">
      <p className="level-label">{tr('Spielend lernen')}</p>
      <h1>{tr('So entsteht Licht.')}</h1>
      <div className="learn-modes" aria-label={tr('Einführung auswählen')}>
        {tr(
          Object.entries(tutorials).map(([key, value]) => (
            <Button
              key={key}
              variant={key === mode ? 'default' : 'outline'}
              aria-pressed={key === mode}
              onClick={() => choose(key)}
            >
              {tr(completed[key] ? '✓ ' : '')}
              {tr(value.title)}
            </Button>
          )),
        )}
      </div>
      <div className="learn-instruction" aria-live="polite">
        <p className="level-label">
          {tr(
            step
              ? 'Schritt ' + (state.step + 1) + ' / ' + lesson.steps.length
              : 'Einführung geschafft',
          )}
        </p>
        <h2>{tr(step ? step.title : 'Dein Netz leuchtet!')}</h2>
        <p>{tr(step ? step.text : lesson.takeaway)}</p>
      </div>
      <div
        className={
          'board slide-board learn-board ' +
          (status.solved ? 'complete ' : '') +
          (celebrating ? 'celebrating' : '')
        }
      >
        <div className="slide-grid">
          {tr(
            hole >= 0 && (
              <button
                className={'slide-hole ' + (selected !== null ? 'target' : '')}
                style={{
                  left: ((hole % 3) * 100) / 3 + '%',
                  top: (Math.floor(hole / 3) * 100) / 3 + '%',
                }}
                disabled={!step}
                onClick={() => tap(hole)}
                aria-label={tr('Leerfeld: ausgewählte Kachel hierher schieben')}
              >
                {tr('Leerfeld')}
              </button>
            ),
          )}
          {tr(
            ids.map((id: number) => {
              const pos = l.pieces ? state.session.positions.indexOf(id) : id,
                mask = board[pos];
              const base = l.pieces ? l.pieces[id] : l.initial[id];
              const source = l.pieces ? id === l.sourceId : id === l.source;
              return (
                <button
                  key={mode + '-' + id}
                  className={
                    'tile slide-tile ' +
                    (status.lit.has(pos) ? 'lit ' : '') +
                    (target === id ? 'learn-target ' : '') +
                    (selected === id ? 'selected' : '')
                  }
                  style={{
                    transform: `translate(${(pos % 3) * 100}%, ${Math.floor(pos / 3) * 100}%)`,
                  }}
                  disabled={!step}
                  aria-label={tr(
                    'Zeile ' +
                      (Math.floor(pos / 3) + 1) +
                      ', Spalte ' +
                      ((pos % 3) + 1) +
                      (source ? ', Lichtquelle' : '') +
                      (target === id ? ', nächste Übungskachel' : ''),
                  )}
                  aria-pressed={selected === id}
                  onPointerDown={(e) => {
                    if (
                      mode === 'turn' ||
                      !e.isPrimary ||
                      e.button !== 0 ||
                      gesture.current
                    )
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
                  onPointerUp={(e) => {
                    const g = gesture.current;
                    if (!g || g.pointer !== e.pointerId) return;
                    gesture.current = null;
                    const dx = e.clientX - g.x,
                      dy = e.clientY - g.y;
                    if (Math.hypot(dx, dy) > 10) {
                      suppressClick.current = Date.now() + 500;
                      const a = swipeSliding(
                        l,
                        state.session,
                        g.id,
                        dx,
                        dy,
                        g.size,
                      );
                      if (a) apply(a);
                      else
                        setMessage(
                          'Wische eine benachbarte Kachel gerade zum Leerfeld.',
                        );
                    }
                  }}
                  onPointerCancel={() => {
                    gesture.current = null;
                    suppressClick.current = Date.now() + 500;
                  }}
                  onLostPointerCapture={() => {
                    if (gesture.current) {
                      gesture.current = null;
                      suppressClick.current = Date.now() + 500;
                    }
                  }}
                  onClick={(e) => {
                    if (e.detail !== 0 && Date.now() < suppressClick.current) {
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
                        transform:
                          'rotate(' + state.session.turns[id] * 90 + 'deg)',
                      }}
                    >
                      {tr(
                        [0, 1, 2, 3]
                          .filter((d) => base & (1 << d))
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
                        r={source ? 13 : 5}
                        className={source ? 'source' : 'joint'}
                      />
                      {tr(
                        source && (
                          <circle
                            cx="50"
                            cy="50"
                            r="5"
                            fill="var(--lw-142235)"
                          />
                        ),
                      )}
                    </g>
                    {tr(
                      [0, 1, 2, 3]
                        .filter((d) => {
                          const j = neighbor(pos, d, 3);
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
                </button>
              );
            }),
          )}
        </div>
      </div>
      <p className="learn-feedback" role="status">
        {tr(
          message ||
            `${status.lit.size} von ${ids.length} verbunden · ${status.open} offene Anschlüsse`,
        )}
      </p>
      <div className="learn-actions">
        {tr(
          status.solved && (
            <Button onClick={() => onPlay(mode)}>
              {tr(
                mode === 'turn'
                  ? 'Zu den Drehrätseln'
                  : 'Zu den Schieberätseln',
              )}
              {tr(' →')}
            </Button>
          ),
        )}
        {tr(
          status.solved && mode !== 'rotate' && (
            <Button
              variant="outline"
              onClick={() => choose(mode === 'turn' ? 'slide' : 'rotate')}
            >
              {tr('Nächsten Modus kennenlernen →')}
            </Button>
          ),
        )}
        <Button variant="ghost" onClick={() => choose(mode)}>
          {tr('Übung neu starten')}
        </Button>
        <Button variant="ghost" onClick={onExit}>
          {tr(status.solved ? 'Zurück' : 'Einführung überspringen')}
        </Button>
      </div>
      <p className="home-foot">
        {tr(
          'Ein eigener Übungsbereich. Deine Rätsel und Tipps bleiben unberührt.',
        )}
      </p>
      {tr(
        saveError && (
          <p role="status">
            {tr(
              'Die Einführung funktioniert, ihr Abschluss kann gerade aber nicht gespeichert werden.',
            )}
          </p>
        ),
      )}
    </section>
  );
}
