'use client';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Lightbulb, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import SolveWorker from '../lib/solve-help.worker?worker';
import {
  hintBudget,
  remainingHints,
  spendHint,
  rewardHint,
} from '@/lib/hint-budget.mjs';
import { applyHelp, helpSolved } from '@/lib/solve-help.mjs';

export default function SolveControls({
  puzzle,
  session,
  onApplied,
  back,
  onPauseChange,
}: {
  puzzle: any;
  session: any;
  onApplied: (s: any, quiet?: boolean, assistance?: string) => void;
  onPauseChange?: (paused: boolean) => void;
  back: MutableRefObject<(() => boolean) | null>;
}) {
  const [panel, setPanel] = useState<'test' | 'hint' | 'reward' | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    onPauseChange?.(panel !== null || busy);
    return () => onPauseChange?.(false);
  }, [panel, busy, onPauseChange]);
  const [message, setMessage] = useState('');
  const [budget, setBudget] = useState<any>(hintBudget(null));
  const remaining = remainingHints(budget);
  const rewardReceipt = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const currentSession = useRef(session);
  currentSession.current = session;
  const job = useRef<{
    worker: Worker;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const key = 'leuchtwege-hints-v1:' + puzzle.id;
  useEffect(() => {
    try {
      setBudget(hintBudget(JSON.parse(localStorage.getItem(key) || 'null')));
      setReady(true);
    } catch {
      setMessage(
        'Tipps können gerade nicht gespeichert werden. Die Testhilfe bleibt verfügbar.',
      );
    }
  }, [key]);
  function cancel() {
    if (job.current) {
      job.current.worker.terminate();
      clearTimeout(job.current.timer);
      job.current = null;
    }
    setBusy(false);
  }
  function close() {
    cancel();
    rewardReceipt.current = null;
    setPanel(null);
  }
  back.current = () => {
    if (busy && !panel) {
      cancel();
      return true;
    }
    if (panel) {
      close();
      return true;
    }
    return false;
  };
  useEffect(
    () => () => {
      if (job.current) {
        job.current.worker.terminate();
        clearTimeout(job.current.timer);
      }
      back.current = null;
    },
    [back],
  );
  function solve(
    mode: 'all' | 'almost' | 'step',
    spend = false,
    quiet = false,
  ) {
    if (spend && (!ready || remaining === 0)) return;
    cancel();
    setMessage('');
    setBusy(true);
    try {
      const worker = new SolveWorker();
      const fail = (text: string) => {
        if (job.current?.worker !== worker) return;
        cancel();
        setMessage(text);
      };
      job.current = {
        worker,
        timer: setTimeout(
          () => fail('Die Suche dauert zu lange. Bitte versuche es erneut.'),
          10000,
        ),
      };
      worker.onerror = () =>
        fail('Die Lösehilfe konnte nicht gestartet werden.');
      worker.onmessage = ({ data }) => {
        if (job.current?.worker !== worker) return;
        if (data.error) {
          fail(data.error);
          return;
        }
        cancel();
        try {
          if (currentSession.current !== session) {
            setMessage(
              'Das Brett wurde inzwischen verändert. Bitte erneut drücken.',
            );
            return;
          }
          const next = applyHelp(puzzle, session, data.plan, mode);
          if (next === session) {
            setMessage(
              helpSolved(puzzle, session)
                ? 'Dieses Rätsel ist bereits gelöst.'
                : 'Es fehlt bereits nur noch ein Zug.',
            );
            return;
          }
          if (spend) {
            const current = hintBudget(
              JSON.parse(localStorage.getItem(key) || 'null'),
            );
            const updated = spendHint(current);
            localStorage.setItem(key, JSON.stringify(updated));
            setBudget(updated);
          }
          setPanel(null);
          onApplied(next, quiet, spend ? 'hint' : 'test');
        } catch {
          setMessage(
            'Die Hilfe konnte nicht angewendet oder gespeichert werden.',
          );
        }
      };
      worker.postMessage({ puzzle, session });
    } catch {
      cancel();
      setMessage('Die Lösehilfe konnte nicht gestartet werden.');
    }
  }
  function completeReward() {
    if (!__LEUCHTWEGE_DEVTOOLS__ || !rewardReceipt.current) return;
    const receipt = rewardReceipt.current;
    rewardReceipt.current = null;
    try {
      const b = rewardHint(
        hintBudget(JSON.parse(localStorage.getItem(key) || 'null')),
        receipt,
      );
      localStorage.setItem(key, JSON.stringify(b));
      setBudget(b);
      setPanel('hint');
      setMessage('Ein zusätzlicher Tipp wurde freigeschaltet.');
    } catch {
      setMessage('Der zusätzliche Tipp konnte nicht gespeichert werden.');
    }
  }
  const solved = helpSolved(puzzle, session);
  return (
    <>
      <div className="solve-controls">
        <Button
          variant="outline"
          disabled={!ready || solved || busy}
          onClick={() => {
            setMessage('');
            setPanel('hint');
          }}
          aria-label={'Tipp verwenden, ' + remaining + ' verbleibend'}
        >
          <Lightbulb size={19} aria-hidden="true" />
          {remaining} {remaining === 1 ? 'Tipp' : 'Tipps'}
        </Button>
        {__LEUCHTWEGE_DEVTOOLS__ && (
          <>
            <Button
              variant="outline"
              disabled={busy || solved}
              onClick={() => solve('step', false, true)}
            >
              {busy ? 'Schritt wird geprüft …' : 'Test: Nächster Schritt'}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setMessage('');
                setPanel('test');
              }}
            >
              <Wrench size={16} aria-hidden="true" />
              Testhilfe
            </Button>
          </>
        )}
      </div>
      {message && !panel && (
        <p role="status" className="mode-help">
          {message}
        </p>
      )}
      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="game-dialog" showCloseButton={false}>
          <DialogTitle className="dialog-heading">
            {panel === 'test'
              ? 'Testhilfen'
              : panel === 'reward'
                ? 'Werbung simulieren'
                : remaining
                  ? 'Ein kleiner Lichtblick'
                  : 'Keine Tipps mehr'}
          </DialogTitle>
          <DialogDescription>
            {panel === 'test'
              ? 'Vom aktuellen Spielstand aus lösen. Jede Anwendung kannst du mit Rückgängig zurücknehmen. Testhilfen verbrauchen keine Tipps.'
              : panel === 'reward'
                ? 'Testsimulation: Hier wird später das freiwillige Werbevideo abgespielt. Abschließen schaltet genau einen weiteren Tipp frei; Abbrechen gibt keinen Tipp.'
                : remaining
                  ? 'Ein Tipp führt den nächsten Zug auf einem Lösungsweg aus. Noch ' +
                    remaining +
                    ' verfügbar.'
                  : 'Sieh dir freiwillig ein Werbevideo an, um einen weiteren Tipp zu erhalten.'}
          </DialogDescription>
          {!puzzle.pieces && (
            <p className="lesson">
              Falls nötig, wird eine zu korrigierende Kachel entsperrt.
            </p>
          )}
          {panel === 'test' ? (
            <>
              <Button disabled={busy || solved} onClick={() => solve('all')}>
                Komplett lösen
              </Button>
              <Button
                variant="outline"
                disabled={busy || solved}
                onClick={() => solve('almost')}
              >
                Fast lösen · einen Zug übrig lassen
              </Button>
              <p>
                Einzelschritte kannst du direkt am Spielfeld mit „Test: Nächster
                Schritt“ ausführen, ohne dieses Fenster zu öffnen.
              </p>
            </>
          ) : panel === 'reward' ? (
            <Button onClick={completeReward}>
              Simulation abschließen · +1 Tipp
            </Button>
          ) : remaining ? (
            <Button
              disabled={busy || !ready || solved}
              onClick={() => solve('step', true)}
            >
              Einen Tipp verwenden
            </Button>
          ) : __LEUCHTWEGE_DEVTOOLS__ ? (
            <Button
              onClick={() => {
                rewardReceipt.current = crypto.randomUUID();
                setPanel('reward');
              }}
            >
              Werbung simulieren · +1 Tipp
            </Button>
          ) : (
            <p>Werbevideos sind in dieser Version noch nicht verfügbar.</p>
          )}
          {busy && <p role="status">Lösungsweg wird geprüft …</p>}
          {message && <p role="alert">{message}</p>}
          <Button variant="ghost" onClick={close}>
            {busy ? 'Abbrechen' : 'Schließen'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
