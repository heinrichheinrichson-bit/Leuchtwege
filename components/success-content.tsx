'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { completionMessage } from '@/lib/success-messages.mjs';
import { locale } from '@/lib/i18n';
import BrandMark from './brand-mark';
import { DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { PuzzleReward } from './experience';
import { t as tr } from '@/lib/i18n';

/** Shared result layout; mode-specific navigation stays with the game. */
export default function SuccessContent({
  title,
  open,
  description,
  puzzleId,
  attemptId,
  continueLabel,
  onContinue,
  onBoard,
  onChoose,
}: {
  title: string;
  open: boolean;
  description: ReactNode;
  puzzleId: string;
  attemptId?: string;
  continueLabel: string;
  onContinue: () => void;
  onBoard: () => void;
  onChoose?: () => void;
}) {
  const [message, setMessage] = useState<ReturnType<
    typeof completionMessage
  > | null>(null);
  const key = attemptId || puzzleId;
  useEffect(() => {
    if (open) setMessage(completionMessage(key));
  }, [open, key]);
  const copy = message?.[locale() === 'en-GB' ? 'en' : 'de'];
  return (
    <DialogContent
      className="game-dialog success-dialog"
      showCloseButton={false}
    >
      <BrandMark celebration />
      <DialogTitle className="dialog-heading">
        {title === 'Alle Wege leuchten!' ? tr(title) : copy?.title || tr(title)}
      </DialogTitle>
      <DialogDescription>
        {copy && <span className="success-message">{copy.body}</span>}
        {description}
      </DialogDescription>
      <PuzzleReward puzzleId={puzzleId} attemptId={attemptId} />
      <Button onClick={onContinue}>{tr(continueLabel)}</Button>
      <Button variant="outline" onClick={onBoard}>
        {tr('Brett ansehen')}
      </Button>
      {onChoose && (
        <Button variant="ghost" onClick={onChoose}>
          {tr('Zur Rätselauswahl')}
        </Button>
      )}
    </DialogContent>
  );
}
