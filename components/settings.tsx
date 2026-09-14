'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { readPreferences, savePreferences } from '@/lib/preferences.mjs';
import { changeHistory, readHistory } from '@/lib/history-store';
import {
  createBackup,
  validateBackup,
  importBackup,
  undoKey,
} from '@/lib/backup.mjs';
import { experienceSummary } from '@/lib/experience.mjs';
import levels from '@/lib/levels.json';
import sliding from '@/lib/sliding-levels.json';

export default function Settings({
  sound,
  setSound,
}: {
  sound: boolean;
  setSound: (value: boolean) => void;
}) {
  const [animations, setAnimations] = useState(true);
  const [clock, setClock] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [exported, setExported] = useState(false);
  const [pending, setPending] = useState<any>(null);
  const [undo, setUndo] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  useEffect(() => {
    setAnimations(readPreferences().animations);
    setClock(readHistory().clockVisible);
    try {
      setCanUndo(!!localStorage.getItem(undoKey));
    } catch {}
  }, []);
  function report(e: unknown) {
    setMessage('');
    setError(
      e instanceof Error && e.name !== 'QuotaExceededError'
        ? e.message
        : 'Nicht genug Speicherplatz. Der bisherige Stand bleibt erhalten.',
    );
  }
  function check(value: string, asUndo = false) {
    try {
      setPending(validateBackup(value, levels, sliding));
      setUndo(asUndo);
      setError('');
      setMessage('');
    } catch (e) {
      report(e);
    }
  }
  const xp = pending
    ? experienceSummary(pending.data['leuchtwege-history-v1']?.attempts || [])
        .total
    : 0;
  return (
    <section className="settings-screen">
      <h1>Einstellungen</h1>
      <h2>Spielgefühl</h2>
      <div className="settings-group">
        <label className="settings-row">
          <span>
            <strong>Töne</strong>
            <small>Verbindungen und Erfolge</small>
          </span>
          <Switch
            checked={sound}
            onCheckedChange={setSound}
            aria-label="Töne"
          />
        </label>
        <label className="settings-row">
          <span>
            <strong>Animationen</strong>
            <small>Bewegungen und Aufleuchten</small>
          </span>
          <Switch
            checked={animations}
            onCheckedChange={(value) => {
              try {
                setAnimations(
                  savePreferences({ animations: value }).animations,
                );
                setError('');
              } catch (e) {
                report(e);
              }
            }}
            aria-label="Animationen"
          />
        </label>
        <label className="settings-row">
          <span>
            <strong>Spieluhr anzeigen</strong>
            <small>Deine Spielzeit wird auch ohne Anzeige erfasst.</small>
          </span>
          <Switch
            checked={clock}
            onCheckedChange={(value) => {
              const result = changeHistory((data) => ({
                ...data,
                clockVisible: value,
              }));
              setClock(value);
              setError(
                result.error
                  ? 'Die Einstellung konnte nicht dauerhaft gespeichert werden.'
                  : '',
              );
            }}
            aria-label="Spieluhr anzeigen"
          />
        </label>
      </div>
      <h2>Sicherung & Wiederherstellung</h2>
      <p className="settings-note">
        Sichere Rätselstände, XP, Kalender, Statistiken und Einstellungen.
        Bewahre die Kopie außerhalb der App auf.
      </p>
      <div className="settings-group settings-backup">
        <Button
          variant="outline"
          onClick={async () => {
            try {
              const value = createBackup(localStorage, levels, sliding);
              setText(value);
              setExported(true);
              setError('');
              try {
                await navigator.clipboard.writeText(value);
                setMessage(
                  'Sicherung kopiert. Du kannst sie jetzt außerhalb der App einfügen.',
                );
              } catch {
                setBackupOpen(true);
                setMessage(
                  'Sicherung erstellt. Markiere und kopiere den Text unten.',
                );
              }
            } catch (e) {
              report(e);
            }
          }}
        >
          Sicherung kopieren
        </Button>
        <details
          open={backupOpen}
          onToggle={(event) => setBackupOpen(event.currentTarget.open)}
        >
          <summary>Sicherung einfügen oder ansehen</summary>
          <label htmlFor="backup-text">Sicherungstext</label>
          <textarea
            id="backup-text"
            maxLength={8000000}
            value={text}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(e) => {
              setText(e.target.value);
              setExported(false);
            }}
            placeholder="Leuchtwege-Sicherung hier einfügen"
          />
          {exported && (
            <Button
              variant="outline"
              onClick={() =>
                (
                  document.getElementById('backup-text') as HTMLTextAreaElement
                )?.select()
              }
            >
              Text markieren
            </Button>
          )}
          <Button disabled={!text.trim()} onClick={() => check(text)}>
            Sicherung prüfen
          </Button>
        </details>
        <Button
          variant="outline"
          disabled={!canUndo}
          onClick={() => {
            try {
              check(localStorage.getItem(undoKey) || '', true);
            } catch (e) {
              report(e);
            }
          }}
        >
          Letzten Import rückgängig machen
        </Button>
      </div>
      {message && (
        <p role="status" className="settings-note">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="settings-error">
          {error}
        </p>
      )}
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent className="game-dialog">
          <AlertDialogTitle>
            {undo
              ? 'Vorherigen Stand wiederherstellen?'
              : 'Sicherung wiederherstellen?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Sicherung vom{' '}
            {pending && new Date(pending.createdAt).toLocaleString('de-DE')}:{' '}
            {pending?.data['leuchtwege-v2']?.done.length || 0} gelöste
            Drehpuzzles, {xp} XP. Dieser Stand ersetzt deine aktuellen Daten.{' '}
            {undo
              ? 'Auch Fortschritt seit dem Import wird ersetzt.'
              : 'Den Import kannst du anschließend rückgängig machen.'}
          </AlertDialogDescription>
          <div className="settings-confirm">
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                try {
                  importBackup(localStorage, pending, levels, sliding, undo);
                  window.location.reload();
                } catch (e) {
                  setPending(null);
                  report(e);
                }
              }}
            >
              Wiederherstellen
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
