'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { victoryTimeline } from './victory-timing.mjs';
import { readPreferences } from './preferences.mjs';
import { haptic } from './haptics';

export function useVictory(onSound: () => void, scope: string) {
  const [victory, show] = useState(false);
  const [celebrating, glow] = useState(false);
  const sound = useRef(onSound);
  sound.current = onSound;
  const cancel = useRef<(() => void) | null>(null);
  const setVictory = useCallback((open: boolean, showDialog = true) => {
    cancel.current?.();
    cancel.current = null;
    show(false);
    glow(false);
    if (open)
      cancel.current = victoryTimeline({
        glow: () => {
          glow(readPreferences().animations);
          sound.current();
          haptic(true);
        },
        reveal: () => {
          glow(false);
          show(showDialog);
        },
      });
  }, []);
  useEffect(() => {
    setVictory(false);
    return () => {
      cancel.current?.();
    };
  }, [scope, setVictory]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setVictory(false);
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [setVictory]);
  return { victory, celebrating, setVictory };
}
