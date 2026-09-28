'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  resumeListKey,
  restoreHiddenResume,
  selectResumeGame,
} from '@/lib/resume-list.mjs';
import { resumeSlotsKey, rememberResumeGame } from '@/lib/resume-list.mjs';
import { readHistory } from '@/lib/history-store';
import { t as tr } from '@/lib/i18n';
import { Button } from './ui/button';

export type ResumeGame = {
  id: string;
  revision: string;
  title: string;
  detail: string;
  open: () => void;
};
export default function ResumeGames({
  games,
  mode,
  disabled = false,
}: {
  games: ResumeGame[];
  mode: string;
  disabled?: boolean;
}) {
  const [hidden, setHidden] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [latestId, setLatestId] = useState<string | undefined>();
  useEffect(() => {
    try {
      setHidden(
        restoreHiddenResume(
          JSON.parse(localStorage.getItem(resumeListKey) || 'null'),
        ),
      );
    } catch {}
    try {
      const stored = JSON.parse(localStorage.getItem(resumeSlotsKey) || '{}')?.[
        mode
      ];
      const attempts = readHistory().attempts.filter(
        (a: any) => a.mode === mode && a.origin !== 'daily' && a.moves > 0,
      );
      attempts.sort((a: any, b: any) => b.startedAt.localeCompare(a.startedAt));
      const latest =
        typeof stored === 'string'
          ? stored
          : attempts[0]?.puzzleId || games[0]?.id;
      setLatestId(latest);
      if (latest) rememberResumeGame(mode, latest);
    } catch {
      setLatestId(games[0]?.id);
    }
    setReady(true);
  }, [mode]);
  function dismiss(game: ResumeGame) {
    const next = { ...hidden, [game.id]: game.revision };
    setHidden(next);
    try {
      localStorage.setItem(resumeListKey, JSON.stringify(next));
      setNotice('Aus der Liste entfernt. Dein Spielstand bleibt gespeichert.');
    } catch {
      setNotice(
        'Für jetzt entfernt. Die Auswahl konnte nicht gespeichert werden.',
      );
    }
  }
  const selected = selectResumeGame(
    games,
    hidden,
    latestId,
  ) as ResumeGame | null;
  const visible = selected ? [selected] : [];
  if (!ready || (!visible.length && !notice)) return null;
  const cards = (items: ResumeGame[]) =>
    items.map((game) => (
      <div className="resume-row" key={game.id}>
        <Button
          className="resume-game"
          variant="outline"
          disabled={disabled}
          onClick={game.open}
        >
          <span>
            <strong>{tr(game.title)}</strong>
            <small>{game.detail}</small>
          </span>
          <span aria-hidden="true">→</span>
        </Button>
        <Button
          variant="ghost"
          className="resume-remove"
          disabled={disabled}
          aria-label={`${tr('Aus Weiterspielen entfernen')}: ${tr(game.title)}`}
          title={tr('Aus Weiterspielen entfernen')}
          onClick={() => dismiss(game)}
        >
          <X aria-hidden="true" size={18} />
        </Button>
      </div>
    ));
  return (
    <section className="resume-games" aria-label={tr('Weiterspielen')}>
      {selected && (
        <>
          <h2>{tr('Weiterspielen')}</h2>
          {cards([selected])}
        </>
      )}
      {notice && (
        <p role="status" className="resume-notice">
          {tr(notice)}
        </p>
      )}
    </section>
  );
}
