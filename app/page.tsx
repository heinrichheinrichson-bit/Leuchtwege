'use client';
import { useEffect, useState, useRef } from 'react';
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
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { continueTarget, nextPuzzle, isInProgress } from '@/lib/catalog.mjs';
import levels from '@/lib/levels.json';
import { evaluate, neighbor } from '@/lib/game.mjs';
import { fresh, boardOf, act, restore } from '@/lib/session.mjs';
export default function Home() {
  const [view, setView] = useState('home');
  const [victory, setVictory] = useState(false);
  const [restart, setRestart] = useState(false);
  const successAudio = useRef<HTMLAudioElement | null>(null);
  const backAction = useRef<() => void>(() => {});
  const [level, setLevel] = useState(0);
  const [sessions, setSessions] = useState<Record<number, any>>({});
  const [done, setDone] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(false);
  const [lockMode, setLockMode] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const l = levels[level],
    session = sessions[level] || fresh(l);
  const board: number[] = boardOf(l, session),
    moves = session.moves,
    status = evaluate(board, l.n, l.source);
  useEffect(() => {
    try {
      const saved = restore(
        levels,
        JSON.parse(localStorage.getItem('leuchtwege-v2') || 'null'),
        JSON.parse(localStorage.getItem('leuchtwege-v1') || 'null'),
      );
      setLevel(saved.level);
      setSessions(saved.sessions);
      setDone(saved.done);
      setSound(saved.sound);
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        'leuchtwege-v2',
        JSON.stringify({ version: 2, level, sessions, done, sound }),
      );
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [ready, level, sessions, done, sound]);
  useEffect(() => {
    if (ready && status.solved)
      setDone((v) => (v.includes(level) ? v : [...v, level]));
  }, [ready, status.solved, level]);
  const target = continueTarget(levels, sessions, level, done);
  const next = nextPuzzle(levels, level, [...done, level]);
  function navigate(to: string, puzzle = level) {
    setVictory(false);
    setRestart(false);
    setLockMode(false);
    const state = { leuchtwege: to, puzzle };
    if (to === 'game' && view === 'game')
      history.replaceState(state, '', '#game');
    else history.pushState(state, '', '#' + to);
    setView(to);
  }
  backAction.current = () => {
    if (restart) {
      setRestart(false);
      return;
    }
    if (victory) {
      setVictory(false);
      return;
    }
    if (view !== 'home') history.back();
    else if (Capacitor.isNativePlatform()) void App.exitApp();
  };
  useEffect(() => {
    history.replaceState({ leuchtwege: 'home' }, '', '#home');
    const pop = () => {
      const v = history.state?.leuchtwege;
      const p = history.state?.puzzle;
      if (v === 'game' && Number.isInteger(p) && p >= 0 && p < levels.length)
        setLevel(p);
      setView(['home', 'catalog', 'game', 'rules'].includes(v) ? v : 'home');
      setVictory(false);
      setRestart(false);
      setLockMode(false);
    };
    window.addEventListener('popstate', pop);
    let disposed = false;
    let nativeHandle: { remove: () => Promise<void> } | undefined;
    if (Capacitor.isNativePlatform())
      void App.addListener('backButton', () => backAction.current()).then(
        (h) => {
          if (disposed) void h.remove();
          else nativeHandle = h;
        },
      );
    const audio = new Audio('/sounds/success.wav');
    audio.preload = 'auto';
    audio.volume = 0.38;
    successAudio.current = audio;
    const stop = () => {
      if (document.hidden) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
    document.addEventListener('visibilitychange', stop);
    return () => {
      disposed = true;
      void nativeHandle?.remove();
      window.removeEventListener('popstate', pop);
      document.removeEventListener('visibilitychange', stop);
      audio.pause();
    };
  }, []);
  useEffect(() => {
    if (!sound && successAudio.current) {
      successAudio.current.pause();
      successAudio.current.currentTime = 0;
    }
  }, [sound]);
  function start(i: number) {
    setLevel(i);
    navigate('game', i);
  }
  function dispatch(action: { type: string; index?: number }) {
    const nextState = act(l, session, action);
    setSessions((all) => ({ ...all, [level]: nextState }));
    if (action.type === 'reset' || action.type === 'undo') setVictory(false);
    if (
      action.type === 'turn' &&
      !status.solved &&
      evaluate(boardOf(l, nextState), l.n, l.source).solved
    ) {
      setDone((v) => (v.includes(level) ? v : [...v, level]));
      setVictory(true);
      setLockMode(false);
      if (sound && successAudio.current) {
        successAudio.current.currentTime = 0;
        void successAudio.current.play().catch(() => {});
      }
      return true;
    }
    return false;
  }

  function turn(i: number) {
    if (!ready || status.solved) return;
    if (lockMode) {
      dispatch({ type: 'lock', index: i });
      return;
    }
    if (session.locks[i]) return;
    if (dispatch({ type: 'turn', index: i })) return;
    if (sound)
      try {
        const ctx = new AudioContext(),
          o = ctx.createOscillator(),
          g = ctx.createGain();
        o.frequency.value = 520;
        g.gain.setValueAtTime(0.035, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.09);
        o.onended = () => {
          void ctx.close();
        };
      } catch {}
  }
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const ac = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'read_puzzle',
            description:
              'Read current Leuchtwege puzzle. Bits 1,2,4,8 mean north,east,south,west.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true },
            execute: () => ({
              level: level + 1,
              size: l.n,
              source: l.source,
              board,
              solved: status.solved,
            }),
          },
          { signal: ac.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => ac.abort();
  }, [level, board, l.n, l.source, status.solved]);

  return (
    <main className={'app-shell ' + (view === 'game' ? 'playing' : '')}>
      <header className="app-header">
        {view === 'home' ? (
          <span className="brand">
            ✳ <span>Leuchtwege</span>
          </span>
        ) : (
          <Button
            variant="ghost"
            onClick={() => backAction.current()}
            aria-label="Zurück"
          >
            ← Zurück
          </Button>
        )}
        <div className="header-actions">
          {view === 'game' && (
            <Button
              variant="ghost"
              onClick={() => navigate('rules')}
              aria-label="Spielregeln öffnen"
            >
              ? Regeln
            </Button>
          )}
          <Button
            variant="ghost"
            className="sound"
            onClick={() => setSound((v) => !v)}
            aria-pressed={sound}
          >
            Ton {sound ? 'an' : 'aus'}
          </Button>
        </div>
      </header>
      {view === 'home' && (
        <section className="home-screen">
          <div className="home-symbol" aria-hidden="true">
            ✳
          </div>
          <h1>Ein Weg zum Abschalten.</h1>
          <p className="home-intro">
            Ein paar Drehungen. Ein neuer Lichtblick.
          </p>
          <div className="home-progress">
            <strong>
              {done.length} / {levels.length}
            </strong>
            <span>Rätsel gelöst</span>
          </div>
          <Button
            className="continue-button"
            disabled={!ready}
            onClick={() => start(target.index)}
          >
            {target.resume
              ? 'Weiterspielen'
              : done.length === levels.length
                ? 'Noch eine Runde'
                : 'Spielen'}{' '}
            <span>→</span>
          </Button>
          <p className="continue-detail">
            {target.resume
              ? levels[target.index].name
              : done.length === levels.length
                ? 'Alle Wege leuchten. Wähle dein Lieblingsrätsel.'
                : 'Dein nächstes Rätsel wartet.'}
          </p>
          <Button
            variant="outline"
            className="home-option"
            disabled={!ready}
            onClick={() => navigate('catalog')}
          >
            Rätsel auswählen <span>→</span>
          </Button>
          <Button
            variant="ghost"
            className="home-option"
            onClick={() => navigate('rules')}
          >
            So funktioniert’s <span>→</span>
          </Button>
          <p className="home-foot">Kein Zeitdruck. In deinem Tempo.</p>
        </section>
      )}
      {view === 'catalog' && (
        <section className="catalog-screen">
          <h1>Deine Rätsel</h1>
          <p className="section-intro">
            {done.length} von {levels.length} gelöst · Jeder Zwischenstand
            bleibt erhalten.
          </p>
          {['Leicht', 'Mittel', 'Schwer'].map((tier) => (
            <section className="catalog-group" key={tier}>
              <h2>
                {tier}
                <span>
                  {
                    levels.filter(
                      (x, i) => x.difficulty.tier === tier && done.includes(i),
                    ).length
                  }{' '}
                  / {levels.filter((x) => x.difficulty.tier === tier).length}
                </span>
              </h2>
              <div className="puzzle-cards">
                {levels.map((item, i) =>
                  item.difficulty.tier !== tier ? null : (
                    <button
                      key={i}
                      onClick={() => start(i)}
                      className={
                        'puzzle-card ' + (done.includes(i) ? 'finished' : '')
                      }
                    >
                      <span className="puzzle-number">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="puzzle-copy">
                        <strong>{item.name}</strong>
                        <small>
                          {item.n} × {item.n} ·{' '}
                          {isInProgress(item, sessions[i])
                            ? 'Begonnen'
                            : done.includes(i)
                              ? 'Gelöst'
                              : 'Noch offen'}
                        </small>
                      </span>
                      <span aria-hidden="true">
                        {done.includes(i) ? '✓' : '→'}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </section>
          ))}
          <p className="section-intro">
            Die Schwierigkeitseinstufung wird mit euren Spielerfahrungen weiter
            abgestimmt.
          </p>
        </section>
      )}
      {view === 'rules' && (
        <section className="rules-screen">
          <h1>So fließt das Licht</h1>
          <p className="section-intro">
            Verbinde alle Kacheln mit der Quelle — dem großen hellen Kreis.
          </p>
          <ol>
            <li>
              <strong>Wege drehen</strong>
              <p>
                Tippe eine Kachel an. Sie dreht sich um 90 Grad im
                Uhrzeigersinn.
              </p>
            </li>
            <li>
              <strong>Anschlüsse verbinden</strong>
              <p>
                Benachbarte Wege müssen zueinander zeigen. Kleine rosafarbene
                Punkte markieren offene Anschlüsse. Kein Weg darf am
                Spielfeldrand ins Leere führen.
              </p>
            </li>
            <li>
              <strong>Das ganze Netz zum Leuchten bringen</strong>
              <p>
                Gewonnen ist das Rätsel, wenn alle Kacheln mit der Quelle
                verbunden sind und keine Anschlüsse offen bleiben. Licht allein
                bedeutet noch nicht, dass eine Kachel endgültig richtig liegt.
              </p>
            </li>
          </ol>
          <h2>Deine Denkhelfer</h2>
          <p>
            <strong>Rückgängig</strong> nimmt die letzte Drehung oder
            Sperränderung zurück.
          </p>
          <p>
            <strong>Sperren</strong> schaltet den Markiermodus ein. Tippe
            Kacheln an, um sie zu sperren oder freizugeben. Schalte den Modus
            anschließend wieder aus, um weiterzudrehen. Eine Sperre ist deine
            eigene Notiz, keine Bestätigung der Lösung.
          </p>
          <p>
            <strong>Neu starten</strong> setzt nur dieses Rätsel nach einer
            Bestätigung zurück. Deine anderen Spielstände bleiben erhalten.
          </p>
          <Button className="rules-back" onClick={() => backAction.current()}>
            Verstanden
          </Button>
        </section>
      )}
      {view === 'game' && (
        <section className="play-screen">
          <div className="play-heading">
            <div>
              <p className="level-label">
                Rätsel {String(level + 1).padStart(2, '0')} ·{' '}
                {l.difficulty.tier}
              </p>
              <h1>{l.name}</h1>
            </div>
            <span className="size">
              {l.n} × {l.n}
            </span>
          </div>
          <div className="meter">
            <span>
              <i />
              {status.lit.size} / {board.length} verbunden
            </span>
            <span>{moves} Drehungen</span>
          </div>
          <div
            className={'board ' + (status.solved ? 'complete' : '')}
            style={{ gridTemplateColumns: 'repeat(' + l.n + ',1fr)' }}
          >
            {board.map((mask, i) => (
              <button
                key={level + '-' + i}
                className={
                  'tile ' +
                  (status.lit.has(i) ? 'lit ' : '') +
                  (session.locks[i] ? 'locked' : '')
                }
                disabled={status.solved || !ready}
                onClick={() => turn(i)}
                aria-label={
                  'Zeile ' +
                  (Math.floor(i / l.n) + 1) +
                  ', Spalte ' +
                  ((i % l.n) + 1) +
                  ': ' +
                  [0, 1, 2, 3]
                    .filter((d) => mask & (1 << d))
                    .map((d) => ['oben', 'rechts', 'unten', 'links'][d])
                    .join(', ') +
                  '. ' +
                  (status.lit.has(i) ? 'Verbunden. ' : '') +
                  (session.locks[i] ? 'Gesperrt. ' : '') +
                  (lockMode ? 'Sperre umschalten.' : 'Im Uhrzeigersinn drehen.')
                }
              >
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <g
                    className="rotor"
                    style={{
                      transform: 'rotate(' + session.turns[i] * 90 + 'deg)',
                    }}
                  >
                    {[0, 1, 2, 3]
                      .filter((d) => l.initial[i] & (1 << d))
                      .map((d) => (
                        <path
                          key={d}
                          d={
                            [
                              'M50 50V0',
                              'M50 50H100',
                              'M50 50V100',
                              'M50 50H0',
                            ][d]
                          }
                          className="wire"
                        />
                      ))}
                    <circle
                      cx="50"
                      cy="50"
                      r={i === l.source ? 13 : 5}
                      className={i === l.source ? 'source' : 'joint'}
                    />
                    {i === l.source && (
                      <circle cx="50" cy="50" r="5" fill="#142235" />
                    )}
                  </g>
                  {[0, 1, 2, 3]
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
                        cx={[50, 93, 50, 7][d]}
                        cy={[7, 50, 93, 50][d]}
                        r="3"
                        className="open-end"
                      />
                    ))}
                </svg>
                {session.locks[i] && (
                  <span className="lock-badge" aria-hidden="true">
                    ◆
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="play-status" aria-live="polite">
            {status.solved
              ? 'Alles verbunden. Schön gelöst.'
              : lockMode
                ? 'Sperrmodus: Kacheln antippen, dann Sperren ausschalten.'
                : status.open + ' offene Anschlüsse'}
          </p>
          <div className="play-actions">
            <Button
              variant="outline"
              disabled={!ready || !session.history.length}
              onClick={() => dispatch({ type: 'undo' })}
            >
              <span aria-hidden="true">↶</span> Rückgängig
            </Button>
            <Button
              variant={lockMode ? 'default' : 'outline'}
              aria-pressed={lockMode}
              disabled={!ready || status.solved}
              onClick={() => setLockMode((v) => !v)}
            >
              <span aria-hidden="true">◆</span>{' '}
              {lockMode ? 'Sperren an' : 'Sperren'}
            </Button>
            <Button
              variant="outline"
              disabled={!ready}
              onClick={() => setRestart(true)}
            >
              <span aria-hidden="true">↻</span> Neustart
            </Button>
          </div>
          {status.solved && (
            <Button
              className="next-inline"
              onClick={() =>
                next !== null ? start(next) : navigate('catalog')
              }
            >
              {next !== null ? 'Nächstes Rätsel →' : 'Zur Rätselauswahl →'}
            </Button>
          )}
        </section>
      )}
      {storageError && (
        <p role="status" className="mode-help">
          Der Fortschritt kann gerade nicht gespeichert werden. Lass die App
          geöffnet.
        </p>
      )}
      <Dialog open={victory && view === 'game'} onOpenChange={setVictory}>
        <DialogContent
          className="game-dialog success-dialog"
          showCloseButton={false}
        >
          <div className="success-symbol" aria-hidden="true">
            ✳
          </div>
          <DialogTitle className="dialog-heading">
            {done.length === levels.length
              ? 'Alle Wege leuchten!'
              : 'Dein Netz leuchtet!'}
          </DialogTitle>
          <DialogDescription>
            {l.name} gelöst · {moves} Drehungen
          </DialogDescription>
          <p className="success-copy">
            {done.length === levels.length
              ? 'Du hast alle 21 Rätsel gelöst.'
              : 'Ein Lichtblick mehr. Bereit für den nächsten?'}
          </p>
          <Button
            onClick={() => (next !== null ? start(next) : navigate('catalog'))}
          >
            {next !== null ? 'Nächstes Rätsel →' : 'Rätsel auswählen'}
          </Button>
          <Button variant="outline" onClick={() => setVictory(false)}>
            Brett ansehen
          </Button>
          <Button variant="ghost" onClick={() => navigate('catalog')}>
            Zur Rätselauswahl
          </Button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={restart} onOpenChange={setRestart}>
        <AlertDialogContent className="game-dialog">
          <AlertDialogTitle className="dialog-heading">
            Rätsel neu starten?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Drehungen und Sperren dieses Rätsels werden zurückgesetzt. Dieser
            Neustart kann nicht rückgängig gemacht werden. Andere Rätsel bleiben
            erhalten.
          </AlertDialogDescription>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              dispatch({ type: 'reset' });
              setRestart(false);
              setLockMode(false);
            }}
          >
            Neu starten
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
