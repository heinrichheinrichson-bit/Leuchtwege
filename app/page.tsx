'use client';
import { useEffect, useState, useRef } from 'react';
import { useVictory } from '@/lib/use-victory';
import SolveControls from '@/components/solve-controls';
import SlidingGame from '@/components/sliding-game';
import TutorialGame from '@/components/tutorial-game';
import PlayClock from '@/components/play-clock';
import PlayStatistics from '@/components/play-statistics';
import DailyHub from '@/components/daily-hub';
import StreakCalendar from '@/components/streak-calendar';
import ExperienceCard from '@/components/experience';
import { usePlayClock } from '@/lib/use-play-clock';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  emptyFree,
  restoreFree,
  acceptRandom,
  sizes,
} from '@/lib/random-game.mjs';
import { connectionSound } from '@/lib/connection-sound.mjs';
import { topologyKey } from '@/lib/level-design.mjs';
import RandomWorker from '../lib/random.worker?worker';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  continueTarget,
  nextPuzzle,
  isInProgress,
  recommendedOrder,
} from '@/lib/catalog.mjs';
import levels from '@/lib/levels.json';
import { evaluate, neighbor } from '@/lib/game.mjs';
import { fresh, boardOf, act, restore } from '@/lib/session.mjs';
export default function Home() {
  const [free, setFree] = useState<any>(emptyFree);
  const [isFree, setIsFree] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [freeStorageError, setFreeStorageError] = useState(false);
  const [replaceFree, setReplaceFree] = useState(false);
  const workerJob = useRef<{
    worker: Worker;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const freeRef = useRef(free);
  freeRef.current = free;
  const [view, setView] = useState('home');
  const [learnMode, setLearnMode] = useState('turn');
  const [restart, setRestart] = useState(false);
  const successAudio = useRef<HTMLAudioElement | null>(null);
  const electricAudio = useRef<Record<string, HTMLAudioElement>>({});
  function stopSounds() {
    for (const audio of [
      successAudio.current,
      ...Object.values(electricAudio.current),
    ]) {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
  }
  function playElectric(name: string) {
    if (!sound) return;
    stopSounds();
    const audio = electricAudio.current[name];
    if (audio) void audio.play().catch(() => {});
  }
  const helpBack = useRef<(() => boolean) | null>(null);
  const slideBack = useRef<(() => boolean) | null>(null);
  const dailyBack = useRef<(() => boolean) | null>(null);
  const backAction = useRef<() => void>(() => {});
  const [level, setLevel] = useState(0);
  const [sessions, setSessions] = useState<Record<number, any>>({});
  const [done, setDone] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(false);
  const [helpPaused, setHelpPaused] = useState(false);
  const { victory, celebrating, setVictory } = useVictory(() => {
    if (sound && successAudio.current) {
      stopSounds();
      void successAudio.current.play().catch(() => {});
    }
  }, [view, level, isFree, free.puzzle?.id, restart].join(':'));
  const [lockMode, setLockMode] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const l = isFree && free.puzzle ? free.puzzle : levels[level],
    session =
      isFree && free.puzzle ? free.session : sessions[level] || fresh(l);
  const board: number[] = boardOf(l, session),
    moves = session.moves,
    status = evaluate(board, l.n, l.source);
  const clock = usePlayClock(
    {
      puzzleId: l.id,
      name: l.name,
      mode: 'turn',
      origin: isFree ? 'free' : 'catalog',
      tier: l.tier || l.difficulty?.tier || '',
      n: l.n,
    },
    ready && view === 'game' && !status.solved && !restart && !helpPaused,
    session.moves,
  );
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
    try {
      setFree(
        restoreFree(
          JSON.parse(localStorage.getItem('leuchtwege-free-v1') || 'null'),
        ),
      );
    } catch {
      setFreeStorageError(true);
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
    if (ready && !isFree && status.solved)
      setDone((v) => (v.includes(level) ? v : [...v, level]));
  }, [ready, status.solved, level, isFree]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('leuchtwege-free-v1', JSON.stringify(free));
      setFreeStorageError(false);
    } catch {
      setFreeStorageError(true);
    }
  }, [free, ready]);
  useEffect(
    () => () => {
      workerJob.current?.worker.terminate();
      if (workerJob.current) clearTimeout(workerJob.current.timer);
    },
    [],
  );
  const target = continueTarget(levels, sessions, level, done);
  const next = nextPuzzle(levels, level, [...done, level]);
  function navigate(
    to: string,
    puzzle = level,
    freeMode = isFree,
    freeId = free.puzzle?.id,
  ) {
    cancelGeneration();
    setVictory(false);
    setRestart(false);
    setLockMode(false);
    const state = { leuchtwege: to, puzzle, freeMode, freeId };
    setIsFree(freeMode);
    if (to === 'game' && view === 'game')
      history.replaceState(state, '', '#game');
    else history.pushState(state, '', '#' + to);
    setView(to);
  }
  backAction.current = () => {
    if (view === 'game' && helpBack.current?.()) return;
    if (view === 'sliding' && slideBack.current?.()) return;
    if (view === 'daily' && dailyBack.current?.()) return;
    if (generating) {
      cancelGeneration();
      return;
    }
    if (replaceFree) {
      setReplaceFree(false);
      return;
    }
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
      cancelGeneration();
      setReplaceFree(false);
      let v = history.state?.leuchtwege;
      const freeMode = history.state?.freeMode === true;
      if (
        v === 'game' &&
        freeMode &&
        history.state?.freeId !== freeRef.current.puzzle?.id
      )
        v = 'random';
      setIsFree(freeMode);
      const p = history.state?.puzzle;
      if (v === 'game' && Number.isInteger(p) && p >= 0 && p < levels.length)
        setLevel(p);
      setView(
        [
          'home',
          'catalog',
          'game',
          'rules',
          'random',
          'sliding',
          'learn',
          'statistics',
          'daily',
          'streak',
        ].includes(v)
          ? v
          : 'home',
      );
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
    for (const [name, volume] of [
      ['connect', 0.34],
      ['disconnect', 0.27],
    ] as const) {
      const effect = new Audio('/sounds/' + name + '.wav');
      effect.preload = 'auto';
      effect.volume = volume;
      electricAudio.current[name] = effect;
    }
    const stop = () => {
      if (document.hidden) {
        stopSounds();
      }
    };
    document.addEventListener('visibilitychange', stop);
    return () => {
      disposed = true;
      void nativeHandle?.remove();
      window.removeEventListener('popstate', pop);
      document.removeEventListener('visibilitychange', stop);
      stopSounds();
    };
  }, []);
  useEffect(() => {
    if (!sound) stopSounds();
  }, [sound]);
  function start(i: number) {
    setLevel(i);
    navigate('game', i, false);
  }
  function dispatch(action: { type: string; index?: number }) {
    const nextState = act(l, session, action);
    if (nextState !== session)
      clock.record(
        evaluate(boardOf(l, nextState), l.n, l.source).solved,
        nextState.moves,
        'none',
        action.type === 'reset',
      );
    if (isFree) setFree((all: any) => ({ ...all, session: nextState }));
    else setSessions((all) => ({ ...all, [level]: nextState }));
    if (action.type === 'reset' || action.type === 'undo') setVictory(false);
    if (
      action.type === 'turn' &&
      !status.solved &&
      evaluate(boardOf(l, nextState), l.n, l.source).solved
    ) {
      if (!isFree) setDone((v) => (v.includes(level) ? v : [...v, level]));
      setVictory(true);
      setLockMode(false);
      return true;
    }
    if (action.type === 'turn') {
      const effect = connectionSound(
        status,
        evaluate(boardOf(l, nextState), l.n, l.source),
      );
      if (effect) {
        playElectric(effect);
        return true;
      }
    }
    return false;
  }

  function cancelGeneration() {
    const job = workerJob.current;
    if (job) {
      job.worker.terminate();
      clearTimeout(job.timer);
      workerJob.current = null;
    }
    setGenerating(false);
  }
  function generate() {
    cancelGeneration();
    setReplaceFree(false);
    setGenerationError('');
    setGenerating(true);
    try {
      const worker = new RandomWorker();
      const fail = () => {
        if (workerJob.current?.worker !== worker) return;
        cancelGeneration();
        setGenerationError(
          'Es wurde gerade kein passendes Rätsel gefunden. Bitte versuche es erneut oder wähle eine andere Rastergröße.',
        );
      };
      workerJob.current = { worker, timer: setTimeout(fail, 8000) };
      worker.onerror = fail;
      worker.onmessage = ({ data }) => {
        if (workerJob.current?.worker !== worker) return;
        if (!data.puzzle) {
          fail();
          return;
        }
        cancelGeneration();
        setFree((saved: any) => acceptRandom(saved, data.puzzle));
        navigate('game', level, true, data.puzzle.id);
      };
      worker.postMessage({
        tier: free.tier,
        size: free.size,
        seed: crypto.getRandomValues(new Uint32Array(1))[0],
        recent: free.recent,
        excluded: levels.map(topologyKey),
      });
    } catch {
      cancelGeneration();
      setGenerationError(
        'Das Erzeugen konnte nicht gestartet werden. Bitte versuche es erneut.',
      );
    }
  }
  function requestRandom() {
    if (
      free.puzzle &&
      !evaluate(
        boardOf(free.puzzle, free.session),
        free.puzzle.n,
        free.puzzle.source,
      ).solved
    )
      setReplaceFree(true);
    else generate();
  }
  function nextGame() {
    if (isFree) navigate('random');
    else if (next !== null) start(next);
    else navigate('catalog');
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
    if (
      view === 'sliding' ||
      view === 'learn' ||
      view === 'daily' ||
      view === 'streak'
    )
      return;
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
              mode: isFree ? 'free' : 'campaign',
              level: isFree ? null : level + 1,
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
  }, [level, board, l.n, l.source, status.solved, isFree, view]);

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
          <ExperienceCard />
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
            onClick={() => {
              setLearnMode('turn');
              navigate('learn');
            }}
          >
            Spielend lernen <span>→</span>
          </Button>
          <Button
            variant="outline"
            className="home-option"
            disabled={!ready}
            onClick={() => navigate('random')}
          >
            Freies Spiel <span>✳</span>
          </Button>
          <Button
            variant="outline"
            className="home-option"
            disabled={!ready}
            onClick={() => navigate('sliding')}
          >
            Schiebepuzzles <span>→</span>
          </Button>
          <Button
            variant="outline"
            className="home-option"
            onClick={() => navigate('daily')}
          >
            Tagesrätsel <span>→</span>
          </Button>
          <Button
            variant="outline"
            className="home-option"
            onClick={() => navigate('streak')}
          >
            Streak-Kalender <span>✓</span>
          </Button>
          <p className="home-foot">Kein Zeitdruck. In deinem Tempo.</p>
          <Button
            variant="outline"
            className="home-option"
            onClick={() => navigate('statistics')}
          >
            Deine Statistik <span>→</span>
          </Button>
        </section>
      )}
      {view === 'statistics' && <PlayStatistics />}
      {view === 'streak' && <StreakCalendar />}
      {view === 'daily' && (
        <DailyHub
          back={dailyBack}
          onLearn={() => navigate('learn')}
          playSound={(name) => {
            if (!sound) return;
            if (name === 'success' && successAudio.current) {
              stopSounds();
              void successAudio.current.play().catch(() => {});
            } else playElectric(name);
          }}
        />
      )}
      {view === 'learn' && (
        <TutorialGame
          initialMode={learnMode}
          onExit={() => backAction.current()}
          onPlay={(mode) => navigate(mode === 'turn' ? 'catalog' : 'sliding')}
          playSound={(name) => {
            if (!sound) return;
            if (name === 'success' && successAudio.current) {
              stopSounds();
              void successAudio.current.play().catch(() => {});
            } else playElectric(name);
          }}
        />
      )}
      {view === 'sliding' && (
        <SlidingGame
          back={slideBack}
          onLearn={() => {
            setLearnMode('slide');
            navigate('learn');
          }}
          playSound={(name) => {
            if (!sound) return;
            if (name === 'success' && successAudio.current) {
              stopSounds();
              void successAudio.current.play().catch(() => {});
            } else playElectric(name);
          }}
        />
      )}
      {view === 'random' && (
        <section className="random-screen">
          <h1>Freies Spiel</h1>
          <p className="section-intro">
            Ein neues Netz, jedes Mal. Wähle, wie du knobeln möchtest.
          </p>
          {free.puzzle && (
            <Button
              className="home-option"
              disabled={generating}
              onClick={() => navigate('game', level, true)}
            >
              {evaluate(
                boardOf(free.puzzle, free.session),
                free.puzzle.n,
                free.puzzle.source,
              ).solved
                ? 'Letztes Netz ansehen'
                : 'Freie Partie fortsetzen'}{' '}
              <span>→</span>
            </Button>
          )}
          {free.puzzle && (
            <p className="continue-detail">
              {free.puzzle.difficulty.tier} · {free.puzzle.n} × {free.puzzle.n}{' '}
              · {free.session.moves} Drehungen
            </p>
          )}
          <fieldset disabled={generating}>
            <legend>Schwierigkeit</legend>
            <RadioGroup
              value={free.tier}
              onValueChange={(value) =>
                setFree((f: any) => ({
                  ...f,
                  tier: value,
                  size: sizes[value as keyof typeof sizes].includes(f.size)
                    ? f.size
                    : 0,
                }))
              }
              className="random-choices"
            >
              {['Leicht', 'Mittel', 'Schwer'].map((t) => (
                <label key={t}>
                  <RadioGroupItem value={t} />
                  {t}
                </label>
              ))}
            </RadioGroup>
          </fieldset>
          <fieldset disabled={generating}>
            <legend>Rastergröße</legend>
            <RadioGroup
              value={String(free.size)}
              onValueChange={(value) =>
                setFree((f: any) => ({ ...f, size: Number(value) }))
              }
              className="random-choices"
            >
              {[0, ...sizes[free.tier as keyof typeof sizes]].map((n) => (
                <label key={n}>
                  <RadioGroupItem value={String(n)} />
                  {n ? n + ' × ' + n : 'Automatisch'}
                </label>
              ))}
            </RadioGroup>
          </fieldset>
          <p className="section-intro">
            Die Größe bestimmt den Umfang. Die Schwierigkeit richtet sich nach
            den nötigen Denkschritten.
          </p>
          <Button
            className="continue-button"
            disabled={generating || !ready}
            onClick={requestRandom}
          >
            {generating ? 'Rätsel wird geprüft …' : 'Neues Rätsel erzeugen'}{' '}
            <span>✳</span>
          </Button>
          {generating && (
            <>
              <p role="status" className="mode-help">
                Einen Moment. Dein neues Netz entsteht.
              </p>
              <Button
                variant="outline"
                className="home-option"
                onClick={cancelGeneration}
              >
                Abbrechen
              </Button>
            </>
          )}
          {generationError && (
            <p role="alert" className="mode-help">
              {generationError}
            </p>
          )}
          <p className="home-foot">
            Deine Kampagne bleibt bei {done.length} von {levels.length} gelösten
            Rätseln.
          </p>
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
                {recommendedOrder(levels).map((i: number) =>
                  levels[i].difficulty.tier !== tier ? null : (
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
                        <strong>{levels[i].name}</strong>
                        <small>
                          {levels[i].n} × {levels[i].n} ·{' '}
                          {isInProgress(levels[i], sessions[i])
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
                {isFree
                  ? 'Freies Spiel'
                  : 'Rätsel ' + String(level + 1).padStart(2, '0')}{' '}
                · {l.difficulty.tier}
              </p>
              <h1>{l.name}</h1>
            </div>
            <span className="size">
              {l.n} × {l.n}
            </span>
          </div>
          {l.lesson && <p className="lesson">{l.lesson}</p>}
          <PlayClock clock={clock} />
          <div className="meter">
            <span>
              <i />
              {status.lit.size} / {board.length} verbunden
            </span>
            <span>{moves} Drehungen</span>
          </div>
          <div
            className={
              'board ' +
              (status.solved ? 'complete ' : '') +
              (celebrating ? 'celebrating' : '')
            }
            style={{ gridTemplateColumns: 'repeat(' + l.n + ',1fr)' }}
          >
            {board.map((mask, i) => (
              <button
                key={l.id + '-' + i}
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
          <SolveControls
            key={l.id}
            onPauseChange={setHelpPaused}
            puzzle={l}
            session={session}
            back={helpBack}
            onApplied={(nextState, quiet, assistance) => {
              clock.record(
                evaluate(boardOf(l, nextState), l.n, l.source).solved,
                nextState.moves,
                assistance,
              );
              if (isFree) setFree((v: any) => ({ ...v, session: nextState }));
              else setSessions((v) => ({ ...v, [level]: nextState }));
              setLockMode(false);
              const solved = evaluate(
                boardOf(l, nextState),
                l.n,
                l.source,
              ).solved;
              setVictory(solved, !quiet);
            }}
          />
          {status.solved && (
            <Button className="next-inline" onClick={nextGame}>
              {isFree
                ? 'Neues freies Rätsel →'
                : next !== null
                  ? 'Nächstes Rätsel →'
                  : 'Zur Rätselauswahl →'}
            </Button>
          )}
        </section>
      )}
      {(storageError || freeStorageError) && (
        <p role="status" className="mode-help">
          Der Fortschritt kann gerade nicht gespeichert werden. Lass die App
          geöffnet.
        </p>
      )}
      <Dialog
        open={victory && view === 'game'}
        onOpenChange={(open) => setVictory(open)}
      >
        <DialogContent
          className="game-dialog success-dialog"
          showCloseButton={false}
        >
          <div className="success-symbol" aria-hidden="true">
            ✳
          </div>
          <DialogTitle className="dialog-heading">
            {!isFree && done.length === levels.length
              ? 'Alle Wege leuchten!'
              : 'Dein Netz leuchtet!'}
          </DialogTitle>
          <DialogDescription>
            {l.name} gelöst · {moves} Drehungen
          </DialogDescription>
          <p className="success-copy">
            {!isFree && done.length === levels.length
              ? 'Du hast alle ' + levels.length + ' Rätsel gelöst.'
              : 'Ein Lichtblick mehr. Bereit für den nächsten?'}
          </p>
          <Button onClick={nextGame}>
            {isFree
              ? 'Neues freies Rätsel →'
              : next !== null
                ? 'Nächstes Rätsel →'
                : 'Rätsel auswählen'}
          </Button>
          <Button variant="outline" onClick={() => setVictory(false)}>
            Brett ansehen
          </Button>
          <Button variant="ghost" onClick={() => navigate('catalog')}>
            Zur Rätselauswahl
          </Button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={replaceFree} onOpenChange={setReplaceFree}>
        <AlertDialogContent className="game-dialog">
          <AlertDialogTitle className="dialog-heading">
            Neue freie Partie?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Deine angefangene freie Partie wird ersetzt, sobald das neue Rätsel
            bereit ist. Deine Kampagne bleibt erhalten.
          </AlertDialogDescription>
          <AlertDialogCancel>Weiter behalten</AlertDialogCancel>
          <AlertDialogAction onClick={generate}>
            Neues Rätsel erzeugen
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
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
