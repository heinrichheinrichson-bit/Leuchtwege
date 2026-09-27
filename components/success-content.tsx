'use client';
import type { ReactNode } from 'react';
import BrandMark from './brand-mark';
import { DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { PuzzleReward } from './experience';
import { t as tr } from '@/lib/i18n';

/** Shared result layout; mode-specific navigation stays with the game. */
export default function SuccessContent({
  title,
  description,
  puzzleId,
  attemptId,
  continueLabel,
  onContinue,
  onBoard,
  onChoose,
}: {
  title: string;
  description: ReactNode;
  puzzleId: string;
  attemptId?: string;
  continueLabel: string;
  onContinue: () => void;
  onBoard: () => void;
  onChoose?: () => void;
}) {
  return (
    <DialogContent
      className="game-dialog success-dialog"
      showCloseButton={false}
    >
      <BrandMark celebration />
      <DialogTitle className="dialog-heading">{tr(title)}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
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
