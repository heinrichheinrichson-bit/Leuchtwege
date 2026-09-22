'use client';
import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { readHistory } from '@/lib/history-store';
import { dayKey, streakSummary } from '@/lib/daily.mjs';
import { t as tr } from '@/lib/i18n';

export default function HomeStreak({
  onOpen,
  compact = false,
}: {
  onOpen: () => void;
  compact?: boolean;
}) {
  const [streak, setStreak] = useState<any>(null);
  useEffect(() => {
    const update = () => {
      const history = readHistory();
      setStreak(
        streakSummary(history.attempts, dayKey(), history.freeze?.frozen || []),
      );
    };
    update();
    window.addEventListener('leuchtwege-history', update);
    window.addEventListener('storage', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    const timer = setInterval(update, 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('leuchtwege-history', update);
      window.removeEventListener('storage', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const days = streak
    ? streak.current + ' ' + tr(streak.current === 1 ? 'Tag' : 'Tage')
    : '—';
  const today = streak
    ? tr(streak.today ? 'Heute geschafft' : 'Heute offen')
    : tr('Streak-Kalender');
  return (
    <Button
      variant="outline"
      className={
        'home-option home-streak' +
        (streak?.today ? ' achieved' : '') +
        (compact ? ' compact-streak' : '')
      }
      onClick={onOpen}
      aria-label={tr('Streak-Kalender') + ': ' + days + '. ' + today}
    >
      <span>
        <strong>
          <Flame size={20} aria-hidden="true" />
          {days}
        </strong>
        <small>
          {streak?.today ? '✓ ' : '○ '}
          {today}
        </small>
      </span>
      <span aria-hidden="true">→</span>
    </Button>
  );
}
