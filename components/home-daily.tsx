'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { readHistory } from '@/lib/history-store';
import { dailyCount, dayKey } from '@/lib/daily.mjs';
import { t as tr } from '@/lib/i18n';

export default function HomeDaily({ onOpen }: { onOpen: () => void }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(dailyCount(readHistory().attempts, dayKey()));
    update();
    const timer = setInterval(update, 30000);
    window.addEventListener('leuchtwege-history', update);
    window.addEventListener('focus', update);
    window.addEventListener('storage', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('leuchtwege-history', update);
      window.removeEventListener('focus', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return (
    <Button variant="outline" className="home-daily" onClick={onOpen}>
      <span aria-hidden="true">☀</span>
      <span>
        <strong>{tr('Tagesrätsel')}</strong>
        <small>{tr('Drei Rätsel. Du wählst die Modi.')}</small>
      </span>
      <span aria-label={tr(`${count} von 3 gelöst`)}>
        {count}/3 <span aria-hidden="true">→</span>
      </span>
    </Button>
  );
}
