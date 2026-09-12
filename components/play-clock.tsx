'use client';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/play-history.mjs';
export default function PlayClock({ clock }: { clock: any }) {
  return (
    <div className="play-clock">
      {clock.visible && (
        <span>
          Spielzeit{' '}
          <strong>
            {clock.entry ? formatTime(clock.entry.elapsedMs) : '—'}
          </strong>
          {clock.entry?.completedAt
            ? ' · abgeschlossen'
            : !clock.running
              ? ' · pausiert'
              : ''}
          {clock.entry?.partialTime ? ' · teilweise erfasst' : ''}
        </span>
      )}
      <Button
        variant="ghost"
        onClick={clock.toggle}
        aria-pressed={clock.visible}
        aria-label={clock.visible ? 'Uhr ausblenden' : 'Uhr einblenden'}
      >
        {clock.visible ? 'Uhr an' : 'Uhr aus'}
      </Button>
      {clock.error && (
        <p role="status">Die Zeit kann gerade nicht gespeichert werden.</p>
      )}
    </div>
  );
}
