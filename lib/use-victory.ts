'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { victoryTimeline } from './victory-timing.mjs';
import { readPreferences } from './preferences.mjs';
import { haptic } from './haptics';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

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
    let disposed = false;
    let handle: { remove: () => Promise<void> } | undefined;
    const cancelPending = () => setVictory(false);
    const hide = () => {
      if (document.hidden) cancelPending();
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', cancelPending);
    if (Capacitor.isNativePlatform())
      void App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) cancelPending();
      }).then((h) => {
        if (disposed) void h.remove();
        else handle = h;
      });
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', cancelPending);
      void handle?.remove();
    };
  }, [setVictory]);
  return { victory, celebrating, setVictory };
}
