'use client';
import { Button } from './ui/button';
import { t as tr } from '@/lib/i18n';

export default function FreePlayOptions({
  tier,
  size,
  sizes,
  onTier,
  onSize,
  onStart,
  busy,
  disabled = false,
  onCancel,
  onResume,
  solved = false,
  error,
}: {
  tier: string;
  size: number;
  sizes: number[];
  onTier: (tier: string) => void;
  onSize: (size: number) => void;
  onStart: () => void;
  busy: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onResume?: () => void;
  solved?: boolean;
  error?: string;
}) {
  return (
    <div className="free-play-options">
      <fieldset disabled={busy || disabled}>
        <legend>{tr('Schwierigkeit')}</legend>
        <div className="free-play-choices">
          {['Leicht', 'Mittel', 'Schwer'].map((value) => (
            <Button
              key={value}
              variant={tier === value ? 'default' : 'outline'}
              aria-pressed={tier === value}
              onClick={() => onTier(value)}
            >
              {tr(value)}
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={busy || disabled}>
        <legend>{tr('Rastergröße')}</legend>
        <div className="free-play-choices">
          {sizes.map((value) => (
            <Button
              key={value}
              variant={size === value ? 'default' : 'outline'}
              aria-pressed={size === value}
              onClick={() => onSize(value)}
            >
              {value ? `${value} × ${value}` : tr('Automatisch')}
            </Button>
          ))}
        </div>
      </fieldset>
      <Button disabled={busy || disabled} onClick={onStart}>
        {tr(busy ? 'Rätsel wird erzeugt …' : 'Neues Rätsel')}
      </Button>
      {busy && (
        <Button variant="outline" onClick={onCancel}>
          {tr('Abbrechen')}
        </Button>
      )}
      {onResume && (
        <Button
          variant="outline"
          disabled={busy || disabled}
          onClick={onResume}
        >
          {tr(solved ? 'Letztes Brett ansehen' : 'Freie Partie fortsetzen')}
        </Button>
      )}
      {error && <p role="alert">{tr(error)}</p>}
    </div>
  );
}
