'use client';
import { t as tr, locale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/play-history.mjs';
export default function PlayClock({ clock }: { clock: any }) {
  return (
    <div className="play-clock">
      {tr(
        clock.visible && (
          <span>
            {tr('Spielzeit')}
            {tr(' ')}
            <strong>
              {tr(clock.entry ? formatTime(clock.entry.elapsedMs) : '—')}
            </strong>
            {tr(
              clock.entry?.completedAt
                ? ' · abgeschlossen'
                : !clock.running
                  ? ' · pausiert'
                  : '',
            )}
            {tr(clock.entry?.partialTime ? ' · teilweise erfasst' : '')}
          </span>
        ),
      )}
      <Button
        variant="ghost"
        onClick={clock.toggle}
        aria-pressed={clock.visible}
        aria-label={tr(clock.visible ? 'Uhr ausblenden' : 'Uhr einblenden')}
      >
        {tr(clock.visible ? 'Uhr an' : 'Uhr aus')}
      </Button>
      {tr(
        clock.error && (
          <p role="status">
            {tr('Die Zeit kann gerade nicht gespeichert werden.')}
          </p>
        ),
      )}
    </div>
  );
}
