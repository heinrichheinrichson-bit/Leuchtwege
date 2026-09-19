'use client';
import { t as tr, locale } from '@/lib/i18n';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useVictory } from '@/lib/use-victory';
import SolveControls from '@/components/solve-controls';
import SlidingGame from '@/components/sliding-game';
import TutorialGame from '@/components/tutorial-game';
import Settings from '@/components/settings';
import { haptic } from '@/lib/haptics';
import { syncReminders } from '@/lib/reminders';
import { Settings as SettingsIcon } from 'lucide-react';
import { applyPreferences, readPreferences } from '@/lib/preferences.mjs';
import { recoverBackup } from '@/lib/backup.mjs';
import { tutorialProgress } from '@/lib/tutorial.mjs';
import PlayScreen from '@/components/play-screen';
import PlayClock from '@/components/play-clock';
import PlayStatistics from '@/components/play-statistics';
import DailyHub from '@/components/daily-hub';
import StreakCalendar from '@/components/streak-calendar';
import HomeStreak from '@/components/home-streak';
import { createGameAudio } from '@/lib/game-audio.mjs';
import ExperienceCard, { PuzzleReward } from '@/components/experience';
import Milestones from '@/components/milestones';
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
  puzzleNumber,
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
  const [, refreshPreferences] = useState(0);
  useEffect(() => {
    const refresh = () => {
      applyPreferences(readPreferences());
      refreshPreferences((v) => v + 1);
    };
    window.addEventListener('leuchtwege-preferences', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('languagechange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('leuchtwege-preferences', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('languagechange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  const [learnMode, setLearnMode] = useState('turn');
  const [learned, setLearned] = useState(false);
  useEffect(() => {
    try {
      const progress = tutorialProgress(
        JSON.parse(localStorage.getItem('leuchtwege-learn-v1') || 'null'),
      );
      setLearned(Object.values(progress).some(Boolean));
    } catch {
      /* Keep the introduction available when storage is unavailable. */
    }
  }, [view]);
  const [restart, setRestart] = useState(false);
  const gameAudio = useRef<ReturnType<typeof createGameAudio> | null>(null);
  function stopSounds() {
    gameAudio.current?.stop();
  }
  function playElectric(name: string) {
    if (sound) void gameAudio.current?.play(name);
  }
  const helpBack = useRef<(() => boolean) | null>(null);
  const slideBack = useRef<(() => boolean) | null>(null);
  const dailyBack = useRef<(() => boolean) | null>(null);
  const backAction = useRef<() => void>(() => {});
  const [level, setLevel] = useState(0);
  const [sessions, setSessions] = useState<Record<number, any>>({});
  const [done, setDone] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const update = () => {
      void syncReminders().catch(() => {});
    };
    update();
    window.addEventListener('leuchtwege-history', update);
    window.addEventListener('leuchtwege-preferences', update);
    window.addEventListener('storage', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('leuchtwege-history', update);
      window.removeEventListener('leuchtwege-preferences', update);
      window.removeEventListener('storage', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [ready]);
  const [sound, setSound] = useState(false);
  const [helpPaused, setHelpPaused] = useState(false);
  const { victory, celebrating, setVictory } = useVictory(() => {
    playElectric('success');
  }, [view, level, isFree, free.puzzle?.id, restart].join(':'));
  const [lockMode, setLockMode] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [recoveryError, setRecoveryError] = useState(false);
  const l = isFree && free.puzzle ? free.puzzle : levels[level];
  // Clock/help updates must not look like a board change to an in-flight solver.
  const initialSession = useMemo(() => fresh(l), [l]);
  const session =
    isFree && free.puzzle ? free.session : sessions[level] || initialSession;
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
      if (recoverBackup(localStorage)) {
        window.location.reload();
        return;
      }
    } catch {
      setRecoveryError(true);
      return;
    }
    try {
      applyPreferences(readPreferences());
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
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [view]);
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
          'settings',
          'milestones',
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
    gameAudio.current = createGameAudio();
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
      gameAudio.current?.dispose();
      gameAudio.current = null;
    };
  }, []);
  useEffect(() => {
    if (!sound) stopSounds();
    const unlock = () => {
      if (sound) void gameAudio.current?.unlock();
    };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
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
    haptic();
    if (dispatch({ type: 'turn', index: i })) return;
    playElectric('turn');
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
              level: isFree ? null : puzzleNumber(levels, level),
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

  if (recoveryError)
    return (
      <main className="settings-screen">
        <h1>{tr('Sicherung wiederherstellen')}</h1>
        <p role="alert">
          {tr(
            'Ein unterbrochener Import konnte noch nicht zurückgesetzt werden. Bitte schaffe Speicherplatz und starte die App erneut. Deine Sicherung bleibt aufbewahrt.',
          )}
        </p>
        <Button onClick={() => window.location.reload()}>
          {tr('Erneut versuchen')}
        </Button>
      </main>
    );
  return (
    <main className={'app-shell ' + (view === 'game' ? 'playing' : '')}>
      <header className="app-header">
        {tr(
          view === 'home' ? (
            <span className="brand">
              {tr('✳ ')}
              <span>{tr('Leuchtwege')}</span>
            </span>
          ) : (
            <Button
              variant="ghost"
              onClick={() => backAction.current()}
              aria-label={tr('Zurück')}
            >
              {tr('← Zurück')}
            </Button>
          ),
        )}
        <div className="header-actions">
          {tr(
            view === 'game' && (
              <Button
                variant="ghost"
                onClick={() => navigate('rules')}
                aria-label={tr('Spielregeln öffnen')}
              >
                {tr('? Regeln')}
              </Button>
            ),
          )}
          {tr(
            view !== 'home' && view !== 'settings' && (
              <Button
                variant="ghost"
                className="sound"
                onClick={() => setSound((v) => !v)}
                aria-pressed={sound}
              >
                {tr('Ton ')}
                {tr(sound ? 'an' : 'aus')}
              </Button>
            ),
          )}
          {tr(
            view === 'home' && (
              <Button
                variant="ghost"
                aria-label={tr('Einstellungen öffnen')}
                onClick={() => navigate('settings')}
              >
                <SettingsIcon size={22} aria-hidden="true" />
              </Button>
            ),
          )}
        </div>
      </header>
      {tr(
        view === 'home' && (
          <section className="home-screen">
            <h1>{tr('Dein nächster Lichtblick')}</h1>
            <Button
              className={
                learned ? 'home-learn-compact' : 'continue-button home-learn'
              }
              variant={learned ? 'outline' : 'default'}
              onClick={() => {
                setLearnMode('turn');
                navigate('learn');
              }}
            >
              <span>
                {tr(learned ? 'Spielregeln & Einführung' : 'Spielend lernen')}
                {tr(
                  !learned && (
                    <small>
                      {tr('Entdecke die Spiele Schritt für Schritt')}
                    </small>
                  ),
                )}
              </span>
              <span aria-hidden="true">{tr('→')}</span>
            </Button>
            <h2 className="home-section-title">{tr('Spielen')}</h2>
            <div className="home-grid">
              <Button
                variant="outline"
                className="home-option"
                disabled={!ready}
                onClick={() => navigate('catalog')}
              >
                <span>
                  {tr('Drehpuzzles')}
                  <small>
                    {tr(levels.length)}
                    {tr(' Rätsel')}
                  </small>
                </span>
                <span aria-hidden="true">{tr('↻')}</span>
              </Button>
              <Button
                variant="outline"
                className="home-option"
                disabled={!ready}
                onClick={() => navigate('sliding')}
              >
                <span>
                  {tr('Schiebepuzzles')}
                  <small>{tr('Zwei Spielmodi')}</small>
                </span>
                <span aria-hidden="true">{tr('↔')}</span>
              </Button>
              <Button
                variant="outline"
                className="home-option"
                disabled={!ready}
                onClick={() => navigate('random')}
              >
                <span>
                  {tr('Freies Spiel')}
                  <small>{tr('Neue Drehpuzzles')}</small>
                </span>
                <span aria-hidden="true">{tr('✳')}</span>
              </Button>
              <Button
                variant="outline"
                className="home-option"
                onClick={() => navigate('daily')}
              >
                <span>
                  {tr('Tagesrätsel')}
                  <small>{tr('Drei neue pro Tag')}</small>
                </span>
                <span aria-hidden="true">{tr('☀')}</span>
              </Button>
            </div>
            <h2 className="home-section-title">{tr('Dein Fortschritt')}</h2>
            <ExperienceCard onOpen={() => navigate('milestones')} />
            <div className="home-grid">
              <HomeStreak onOpen={() => navigate('streak')} />
              <Button
                variant="outline"
                className="home-option"
                onClick={() => navigate('statistics')}
              >
                <span>{tr('Statistik')}</span>
                <span aria-hidden="true">{tr('↗')}</span>
              </Button>
            </div>
          </section>
        ),
      )}
      {tr(
        view === 'settings' && (
          <Settings
            sound={sound}
            setSound={(value) => {
              setSound(value);
              if (!value) stopSounds();
            }}
          />
        ),
      )}
      {tr(view === 'statistics' && <PlayStatistics />)}
      {view === 'milestones' && <Milestones />}
      {tr(view === 'streak' && <StreakCalendar />)}
      {tr(
        view === 'daily' && (
          <DailyHub
            back={dailyBack}
            onLearn={() => navigate('learn')}
            playSound={playElectric}
          />
        ),
      )}
      {tr(
        view === 'learn' && (
          <TutorialGame
            initialMode={learnMode}
            onExit={() => backAction.current()}
            onPlay={(mode) => navigate(mode === 'turn' ? 'catalog' : 'sliding')}
            playSound={playElectric}
          />
        ),
      )}
      {tr(
        view === 'sliding' && (
          <SlidingGame
            back={slideBack}
            onLearn={(mode) => {
              setLearnMode(mode || 'slide');
              navigate('learn');
            }}
            playSound={playElectric}
          />
        ),
      )}
      {tr(
        view === 'random' && (
          <section className="random-screen">
            <h1>{tr('Freies Spiel')}</h1>
            <p className="section-intro">
              {tr('Ein neues Netz, jedes Mal. Wähle, wie du knobeln möchtest.')}
            </p>
            {tr(
              free.puzzle && (
                <Button
                  className="home-option"
                  disabled={generating}
                  onClick={() => navigate('game', level, true)}
                >
                  {tr(
                    evaluate(
                      boardOf(free.puzzle, free.session),
                      free.puzzle.n,
                      free.puzzle.source,
                    ).solved
                      ? 'Letztes Netz ansehen'
                      : 'Freie Partie fortsetzen',
                  )}
                  {tr(' ')}
                  <span>{tr('→')}</span>
                </Button>
              ),
            )}
            {tr(
              free.puzzle && (
                <p className="continue-detail">
                  {tr(free.puzzle.difficulty.tier)}
                  {tr(' · ')}
                  {tr(free.puzzle.n)}
                  {tr(' × ')}
                  {tr(free.puzzle.n)}
                  {tr(' ')}
                  {tr('· ')}
                  {tr(free.session.moves)}
                  {tr(' Drehungen')}
                </p>
              ),
            )}
            <fieldset disabled={generating}>
              <legend>{tr('Schwierigkeit')}</legend>
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
                {tr(
                  ['Leicht', 'Mittel', 'Schwer'].map((t) => (
                    <label key={t}>
                      <RadioGroupItem value={t} />
                      {tr(t)}
                    </label>
                  )),
                )}
              </RadioGroup>
            </fieldset>
            <fieldset disabled={generating}>
              <legend>{tr('Rastergröße')}</legend>
              <RadioGroup
                value={String(free.size)}
                onValueChange={(value) =>
                  setFree((f: any) => ({ ...f, size: Number(value) }))
                }
                className="random-choices"
              >
                {tr(
                  [0, ...sizes[free.tier as keyof typeof sizes]].map((n) => (
                    <label key={n}>
                      <RadioGroupItem value={String(n)} />
                      {tr(n ? n + ' × ' + n : 'Automatisch')}
                    </label>
                  )),
                )}
              </RadioGroup>
            </fieldset>
            <p className="section-intro">
              {tr('Größeres Raster, längere Partie.')}
            </p>
            <Button
              className="continue-button"
              disabled={generating || !ready}
              onClick={requestRandom}
            >
              {tr(generating ? 'Rätsel wird geprüft …' : 'Neues Rätsel')}
              {tr(' ')}
              <span>{tr('✳')}</span>
            </Button>
            {tr(
              generating && (
                <>
                  <p role="status" className="mode-help">
                    {tr('Einen Moment. Dein neues Netz entsteht.')}
                  </p>
                  <Button
                    variant="outline"
                    className="home-option"
                    onClick={cancelGeneration}
                  >
                    {tr('Abbrechen')}
                  </Button>
                </>
              ),
            )}
            {tr(
              generationError && (
                <p role="alert" className="mode-help">
                  {tr(generationError)}
                </p>
              ),
            )}
            <p className="home-foot">
              {tr('Deine Kampagne bleibt bei ')}
              {tr(done.length)}
              {tr(' von ')}
              {tr(levels.length)}
              {tr(' gelösten Rätseln.')}
            </p>
          </section>
        ),
      )}
      {tr(
        view === 'catalog' && (
          <section className="catalog-screen">
            <h1>{tr('Drehpuzzles')}</h1>
            {tr(
              target.resume && (
                <Button
                  className="continue-button"
                  onClick={() => start(target.index)}
                >
                  <span>
                    {tr('Weiterspielen')}
                    <small>{tr(levels[target.index].name)}</small>
                  </span>
                  <span aria-hidden="true">{tr('→')}</span>
                </Button>
              ),
            )}
            <p className="section-intro">
              {tr(done.length)}
              {tr(' von ')}
              {tr(levels.length)}
              {tr(' gelöst')}
            </p>
            {tr(
              ['Leicht', 'Mittel', 'Schwer'].map((tier) => (
                <details className="slide-catalog-tier" key={tier}>
                  <summary>
                    {tr(tier)}
                    <span>
                      {tr(
                        levels.filter(
                          (x, i) =>
                            x.difficulty.tier === tier && done.includes(i),
                        ).length,
                      )}
                      {tr(' ')}
                      {tr('/ ')}
                      {tr(
                        levels.filter((x) => x.difficulty.tier === tier).length,
                      )}
                    </span>
                  </summary>
                  <div className="puzzle-cards">
                    {tr(
                      recommendedOrder(levels).map((i: number) =>
                        levels[i].difficulty.tier !== tier ? null : (
                          <button
                            key={i}
                            onClick={() => start(i)}
                            className={
                              'puzzle-card ' +
                              (done.includes(i) ? 'finished' : '')
                            }
                          >
                            <span className="puzzle-number">
                              {tr(
                                String(puzzleNumber(levels, i)).padStart(
                                  2,
                                  '0',
                                ),
                              )}
                            </span>
                            <span className="puzzle-copy">
                              <strong>{tr(levels[i].name)}</strong>
                              <small>
                                {tr(levels[i].n)}
                                {tr(' × ')}
                                {tr(levels[i].n)}
                                {tr(' ·')}
                                {tr(' ')}
                                {tr(
                                  isInProgress(levels[i], sessions[i])
                                    ? 'Begonnen'
                                    : done.includes(i)
                                      ? 'Gelöst'
                                      : 'Noch offen',
                                )}
                              </small>
                            </span>
                            <span aria-hidden="true">
                              {tr(done.includes(i) ? '✓' : '→')}
                            </span>
                          </button>
                        ),
                      ),
                    )}
                  </div>
                </details>
              )),
            )}
          </section>
        ),
      )}
      {tr(
        view === 'rules' && (
          <section className="rules-screen">
            <h1>{tr('So fließt das Licht')}</h1>
            <p className="section-intro">
              {tr(
                'Verbinde alle Kacheln mit der Quelle — dem großen hellen Kreis.',
              )}
            </p>
            <ol>
              <li>
                <strong>{tr('Wege drehen')}</strong>
                <p>
                  {tr(
                    'Tippe eine Kachel an. Sie dreht sich um 90 Grad im Uhrzeigersinn.',
                  )}
                </p>
              </li>
              <li>
                <strong>{tr('Anschlüsse verbinden')}</strong>
                <p>
                  {tr(
                    'Wege müssen zueinander zeigen. Rosa Punkte markieren offene Anschlüsse – auch am Rand.',
                  )}
                </p>
              </li>
              <li>
                <strong>{tr('Das Netz schließen')}</strong>
                <p>
                  {tr(
                    'Verbinde alle Kacheln mit der Quelle, ohne offene Anschlüsse. Leuchten allein bestätigt noch keine richtige Ausrichtung.',
                  )}
                </p>
              </li>
            </ol>
            <h2>{tr('Deine Denkhelfer')}</h2>
            <p>
              <strong>{tr('Rückgängig')}</strong>
              {tr(' nimmt die letzte Drehung oder Sperränderung zurück.')}
            </p>
            <p>
              <strong>{tr('Sperren')}</strong>
              {tr(
                ': Kacheln antippen, um sie zu markieren oder freizugeben. Danach zurück zu „Drehen“. Sperren sind eigene Notizen, keine Lösungsbestätigung.',
              )}
            </p>
            <p>
              <strong>{tr('Neu starten')}</strong>
              {tr(
                ' setzt nur dieses Rätsel nach einer Bestätigung zurück. Deine anderen Spielstände bleiben erhalten.',
              )}
            </p>
            <Button className="rules-back" onClick={() => backAction.current()}>
              {tr('Verstanden')}
            </Button>
          </section>
        ),
      )}
      {tr(
        view === 'game' && (
          <PlayScreen columns={l.n}>
            <div className="play-heading">
              <div>
                <p className="level-label">
                  {tr(
                    isFree
                      ? 'Freies Spiel'
                      : 'Rätsel ' +
                          String(puzzleNumber(levels, level)).padStart(2, '0'),
                  )}
                  {tr(' ')}
                  {tr('· ')}
                  {tr(l.difficulty.tier)}
                </p>
                <h1>{tr(l.name)}</h1>
              </div>
              <span className="size">
                {tr(l.n)}
                {tr(' × ')}
                {tr(l.n)}
              </span>
            </div>
            {tr(l.lesson && <p className="lesson">{tr(l.lesson)}</p>)}
            <PlayClock clock={clock} />
            <div className="meter">
              <span>
                <i />
                {tr(status.lit.size)}
                {tr(' / ')}
                {tr(board.length)}
                {tr(' verbunden')}
              </span>
              <span>
                {tr(moves)}
                {tr(' Drehungen')}
              </span>
            </div>
            <div
              className={
                'board ' +
                (status.solved ? 'complete ' : '') +
                (celebrating ? 'celebrating' : '')
              }
              style={{ gridTemplateColumns: 'repeat(' + l.n + ',1fr)' }}
            >
              {tr(
                board.map((mask, i) => (
                  <button
                    key={l.id + '-' + i}
                    className={
                      'tile ' +
                      (status.lit.has(i) ? 'lit ' : '') +
                      (session.locks[i] ? 'locked' : '')
                    }
                    disabled={status.solved || !ready}
                    onClick={() => turn(i)}
                    aria-label={tr(
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
                        (lockMode
                          ? 'Sperre umschalten.'
                          : 'Im Uhrzeigersinn drehen.'),
                    )}
                  >
                    <svg viewBox="0 0 100 100" aria-hidden="true">
                      <g
                        className="rotor"
                        style={{
                          transform: 'rotate(' + session.turns[i] * 90 + 'deg)',
                        }}
                      >
                        {tr(
                          [0, 1, 2, 3]
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
                          )),
                      )}
                    </svg>
                    {tr(
                      session.locks[i] && (
                        <span className="lock-badge" aria-hidden="true">
                          {tr('◆')}
                        </span>
                      ),
                    )}
                  </button>
                )),
              )}
            </div>

            <p className="play-status" aria-live="polite">
              {tr(
                status.solved
                  ? 'Alles verbunden. Schön gelöst.'
                  : lockMode
                    ? 'Sperrmodus: Kacheln antippen, dann Sperren ausschalten.'
                    : status.open + ' offene Anschlüsse',
              )}
            </p>
            <div className="play-tools">
              <div className="play-actions">
                <Button
                  variant="outline"
                  disabled={!ready || !session.history.length}
                  onClick={() => dispatch({ type: 'undo' })}
                >
                  <span aria-hidden="true">{tr('↶')}</span>
                  {tr(' Rückgängig')}
                </Button>
                <Button
                  variant={lockMode ? 'default' : 'outline'}
                  aria-pressed={lockMode}
                  disabled={!ready || status.solved}
                  onClick={() => setLockMode((v) => !v)}
                >
                  <span aria-hidden="true">{tr('◆')}</span>
                  {tr(' ')}
                  {tr(lockMode ? 'Sperren an' : 'Sperren')}
                </Button>
                <Button
                  variant="outline"
                  disabled={!ready}
                  onClick={() => setRestart(true)}
                >
                  <span aria-hidden="true">{tr('↻')}</span>
                  {tr(' Neustart')}
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
                  if (isFree)
                    setFree((v: any) => ({ ...v, session: nextState }));
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
            </div>
            {tr(
              status.solved && (
                <Button className="next-inline" onClick={nextGame}>
                  {tr(
                    isFree
                      ? 'Neues freies Rätsel →'
                      : next !== null
                        ? 'Nächstes Rätsel →'
                        : 'Zur Rätselauswahl →',
                  )}
                </Button>
              ),
            )}
          </PlayScreen>
        ),
      )}
      {tr(
        (storageError || freeStorageError) && (
          <p role="status" className="mode-help">
            {tr(
              'Der Fortschritt kann gerade nicht gespeichert werden. Lass die App geöffnet.',
            )}
          </p>
        ),
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
            {tr('✳')}
          </div>
          <DialogTitle className="dialog-heading">
            {tr(
              !isFree && done.length === levels.length
                ? 'Alle Wege leuchten!'
                : 'Dein Netz leuchtet!',
            )}
          </DialogTitle>
          <DialogDescription>
            {tr(l.name)}
            {tr(' gelöst · ')}
            {tr(moves)}
            {tr(' Drehungen')}
          </DialogDescription>
          <PuzzleReward puzzleId={l.id} attemptId={clock.entry?.id} />
          <p className="success-copy">
            {tr(
              !isFree && done.length === levels.length
                ? 'Du hast alle ' + levels.length + ' Rätsel gelöst.'
                : 'Ein Lichtblick mehr. Bereit für den nächsten?',
            )}
          </p>
          <Button onClick={nextGame}>
            {tr(
              isFree
                ? 'Neues freies Rätsel →'
                : next !== null
                  ? 'Nächstes Rätsel →'
                  : 'Rätsel auswählen',
            )}
          </Button>
          <Button variant="outline" onClick={() => setVictory(false)}>
            {tr('Brett ansehen')}
          </Button>
          <Button variant="ghost" onClick={() => navigate('catalog')}>
            {tr('Zur Rätselauswahl')}
          </Button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={replaceFree} onOpenChange={setReplaceFree}>
        <AlertDialogContent className="game-dialog">
          <AlertDialogTitle className="dialog-heading">
            {tr('Neue freie Partie?')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {tr(
              'Deine angefangene freie Partie wird ersetzt, sobald das neue Rätsel bereit ist. Deine Kampagne bleibt erhalten.',
            )}
          </AlertDialogDescription>
          <AlertDialogCancel>{tr('Weiter behalten')}</AlertDialogCancel>
          <AlertDialogAction onClick={generate}>
            {tr('Neues Rätsel')}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={restart} onOpenChange={setRestart}>
        <AlertDialogContent className="game-dialog">
          <AlertDialogTitle className="dialog-heading">
            {tr('Rätsel neu starten?')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {tr(
              'Drehungen und Sperren dieses Rätsels werden zurückgesetzt. Dieser Neustart kann nicht rückgängig gemacht werden. Andere Rätsel bleiben erhalten.',
            )}
          </AlertDialogDescription>
          <AlertDialogCancel>{tr('Abbrechen')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              dispatch({ type: 'reset' });
              setRestart(false);
              setLockMode(false);
            }}
          >
            {tr('Neu starten')}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
