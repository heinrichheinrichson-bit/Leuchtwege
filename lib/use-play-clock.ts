'use client';
import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { readHistory, recordAttempt, changeHistory } from './history-store';
import { currentAttempt } from './play-history.mjs';
import { checkOptimal } from './optimal-check';
import { activeTimer } from './active-timer.mjs';

export function usePlayClock(
  meta: any,
  enabled: boolean,
  moves: number,
  puzzle?: any,
) {
  const [entry, setEntry] = useState<any>(null),
    [visible, setVisible] = useState(true),
    [error, setError] = useState(false),
    [running, setRunning] = useState(false);
  const latest = useRef({ meta, moves });
  latest.current = { meta, moves };
  const flush = useRef<() => void>(() => {});
  function refresh(data = readHistory()) {
    setEntry(currentAttempt(data, meta.puzzleId));
    setVisible(data.clockVisible);
  }
  useEffect(() => {
    refresh();
    const listener = () => refresh();
    window.addEventListener('leuchtwege-history', listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener('leuchtwege-history', listener);
      window.removeEventListener('storage', listener);
    };
  }, [meta.puzzleId]);
  useEffect(() => {
    let focused = document.hasFocus(),
      nativeActive = true,
      disposed = false;
    const ticker = activeTimer(() => performance.now());
    const apply = (elapsedMs: number) => {
      const currentMoves =
        latest.current.meta.puzzleId === meta.puzzleId
          ? latest.current.moves
          : currentAttempt(readHistory(), meta.puzzleId)?.moves || moves;
      const r = recordAttempt(meta, { moves: currentMoves, elapsedMs });
      if (!disposed) {
        refresh(r.data);
        setError(r.error);
      }
    };
    const sync = () => {
      const mayRun =
        enabled &&
        focused &&
        nativeActive &&
        !document.hidden &&
        !currentAttempt(readHistory(), meta.puzzleId)?.completedAt;
      const elapsed = ticker.sample(mayRun);
      if (elapsed > 0) apply(elapsed);
      if (!disposed) setRunning(mayRun);
    };
    if (enabled && !currentAttempt(readHistory(), meta.puzzleId)) apply(0);
    const focus = () => {
        focused = true;
        sync();
      },
      blur = () => {
        focused = false;
        sync();
      };
    sync();
    flush.current = sync;
    const timer = setInterval(sync, 1000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', focus);
    window.addEventListener('blur', blur);
    window.addEventListener('pagehide', blur);
    let handle: { remove: () => Promise<void> } | undefined;
    if (Capacitor.isNativePlatform())
      void App.addListener('appStateChange', ({ isActive }) => {
        nativeActive = isActive;
        sync();
      }).then((h) => {
        if (disposed) void h.remove();
        else handle = h;
      });
    return () => {
      disposed = true;
      const elapsed = ticker.sample(false);
      if (elapsed > 0) apply(elapsed);
      flush.current = () => {};
      clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', focus);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pagehide', blur);
      void handle?.remove();
    };
  }, [meta.puzzleId, enabled]);
  function record(
    solved: boolean,
    nextMoves: number,
    assistance = 'none',
    restart = false,
  ) {
    flush.current();
    const r = recordAttempt(meta, {
      solved,
      moves: nextMoves,
      assistance,
      restart,
    });
    refresh(r.data);
    setError(r.error);
    if (solved) checkOptimal(puzzle, currentAttempt(r.data, meta.puzzleId));
  }
  function toggle() {
    const r = changeHistory((d) => ({ ...d, clockVisible: !d.clockVisible }));
    refresh(r.data);
    setError(r.error);
  }
  return { entry, visible, error, running, record, toggle };
}
