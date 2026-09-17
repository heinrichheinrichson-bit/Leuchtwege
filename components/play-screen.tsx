'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** Fit the board around the real controls, including translated and wrapped text. */
export default function PlayScreen({
  children,
  columns,
  className = '',
}: {
  children: ReactNode;
  columns: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const screen = ref.current;
    if (!screen) return;
    let frame = 0;
    const fit = () => {
      const board = screen.querySelector<HTMLElement>('.board');
      if (!board) return;
      const bounds = screen.getBoundingClientRect();
      const boardBounds = board.getBoundingClientRect();
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      const safeBottom =
        parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
      const overhead = bounds.height - boardBounds.height;
      // Document-relative top keeps the board steady when the fallback page scrolls.
      const room =
        height - (bounds.top + window.scrollY) - overhead - safeBottom - 16;
      const minimum = columns * 44 + 18;
      const side = Math.floor(Math.min(bounds.width, Math.max(minimum, room)));
      const value = side + 'px';
      if (screen.style.getPropertyValue('--play-board-size') !== value)
        screen.style.setProperty('--play-board-size', value);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(screen);
    const header = screen.closest('.app-shell')?.querySelector('.app-header');
    if (header) resize.observe(header);
    const content = new MutationObserver(schedule);
    content.observe(screen, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    fit();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      content.disconnect();
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
    };
  }, [columns]);
  return (
    <section ref={ref} className={'play-screen ' + className}>
      {children}
    </section>
  );
}
