'use client';
import { t as tr } from '@/lib/i18n';
import { Button } from './ui/button';

export type ResumeGame = {
  id: string;
  title: string;
  detail: string;
  open: () => void;
};
export default function ResumeGames({
  games,
  disabled = false,
}: {
  games: ResumeGame[];
  disabled?: boolean;
}) {
  if (!games.length) return null;
  const cards = (items: ResumeGame[]) =>
    items.map((game) => (
      <Button
        key={game.id}
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
    ));
  return (
    <section className="resume-games" aria-label={tr('Weiterspielen')}>
      <h2>{tr('Weiterspielen')}</h2>
      {cards(games.slice(0, 3))}
      {games.length > 3 && (
        <details>
          <summary>
            {tr('Weitere begonnene Rätsel')} · {games.length - 3}
          </summary>
          {cards(games.slice(3))}
        </details>
      )}
    </section>
  );
}
