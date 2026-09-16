'use client';
import { t as tr, locale } from '@/lib/i18n';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { haptic } from '@/lib/haptics';
import Reminders from './reminders';
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
import { backupSummary } from '@/lib/backup-summary.mjs';
import {
  saveBackupFile,
  openBackupFile,
  nativeBackupFiles,
  MAX_BACKUP_BYTES,
} from '@/lib/backup-files';
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
  const [language, setLanguage] = useState('system');
  const [theme, setTheme] = useState('dark');
  const [vibration, setVibration] = useState(true);
  const [clock, setClock] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [exported, setExported] = useState(false);
  const [pending, setPending] = useState<any>(null);
  const [undo, setUndo] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [nativeFiles, setNativeFiles] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setNativeFiles(nativeBackupFiles());
    setAnimations(readPreferences().animations);
    setLanguage(readPreferences().language);
    setTheme(readPreferences().theme);
    setVibration(readPreferences().haptics);
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
      setPending(validateBackup(value.replace(/^\uFEFF/, ''), levels, sliding));
      setUndo(asUndo);
      setError('');
      setMessage('');
    } catch (e) {
      setPending(null);
      report(e);
    }
  }
  const summary = pending ? backupSummary(pending, sliding) : null;
  return (
    <section className="settings-screen">
      <h1>{tr('Einstellungen')}</h1>
      <h2>{tr('Sprache')}</h2>
      <RadioGroup
        className="settings-choice"
        value={language}
        onValueChange={(value) => {
          try {
            savePreferences({ language: value });
            setLanguage(value);
            setError('');
          } catch (e) {
            report(e);
          }
        }}
        aria-label={tr('Sprache')}
      >
        <label style={{ gridColumn: '1 / -1' }}>
          <RadioGroupItem value="system" />
          {tr('Systemsprache')}
        </label>
        <label>
          <RadioGroupItem value="de" />
          {'Deutsch'}
        </label>
        <label>
          <RadioGroupItem value="en" />
          {tr('English')}
        </label>
      </RadioGroup>
      <h2>{tr('Darstellung')}</h2>
      <RadioGroup
        className="settings-choice"
        value={theme}
        onValueChange={(value) => {
          try {
            savePreferences({ theme: value });
            setTheme(value);
            setError('');
          } catch (e) {
            report(e);
          }
        }}
        aria-label={tr('Farbschema')}
      >
        <label>
          <RadioGroupItem value="dark" />
          {tr('Dunkel')}
        </label>
        <label>
          <RadioGroupItem value="light" />
          {tr('Hell')}
        </label>
      </RadioGroup>
      <h2>{tr('Spielgefühl')}</h2>
      <div className="settings-group">
        <label className="settings-row">
          <span>
            <strong>{tr('Haptisches Feedback')}</strong>
            <small>
              {tr(
                'Kurze Vibrationen beim Spielen, soweit vom Gerät unterstützt.',
              )}
            </small>
          </span>
          <Switch
            checked={vibration}
            onCheckedChange={(value) => {
              try {
                savePreferences({ haptics: value });
                setVibration(value);
                setError('');
                if (value) haptic();
              } catch (e) {
                report(e);
              }
            }}
            aria-label={tr('Haptisches Feedback')}
          />
        </label>
        <Button
          variant="ghost"
          className="settings-vibration-test"
          disabled={!vibration}
          onClick={() => haptic(true)}
        >
          {tr('Vibration testen')}
        </Button>
        <label className="settings-row">
          <span>
            <strong>{tr('Töne')}</strong>
            <small>{tr('Verbindungen und Erfolge')}</small>
          </span>
          <Switch
            checked={sound}
            onCheckedChange={setSound}
            aria-label={tr('Töne')}
          />
        </label>
        <label className="settings-row">
          <span>
            <strong>{tr('Animationen')}</strong>
            <small>{tr('Bewegungen und Aufleuchten')}</small>
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
            aria-label={tr('Animationen')}
          />
        </label>
        <label className="settings-row">
          <span>
            <strong>{tr('Spieluhr anzeigen')}</strong>
            <small>
              {tr('Deine Spielzeit wird auch ohne Anzeige erfasst.')}
            </small>
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
            aria-label={tr('Spieluhr anzeigen')}
          />
        </label>
      </div>
      <Reminders />
      <h2>{tr('Sicherung & Wiederherstellung')}</h2>
      <p className="settings-note">
        {tr(
          'Sichere Rätselstände, XP, Kalender, Statistiken und Einstellungen. Bewahre die Kopie außerhalb der App auf.',
        )}
      </p>
      <div className="settings-group settings-backup">
        <Button
          variant="outline"
          disabled={fileBusy}
          onClick={async () => {
            setFileBusy(true);
            setError('');
            setMessage('');
            try {
              readHistory();
              const value = createBackup(localStorage, levels, sliding);
              if (await saveBackupFile(value))
                setMessage(
                  nativeFiles
                    ? 'Sicherungsdatei gespeichert.'
                    : 'Download der Sicherungsdatei gestartet.',
                );
            } catch (e) {
              report(e);
            } finally {
              setFileBusy(false);
            }
          }}
        >
          {tr('Als Datei speichern')}
        </Button>
        <Button
          variant="outline"
          disabled={fileBusy}
          onClick={async () => {
            setError('');
            setMessage('');
            if (!nativeFiles) {
              fileInput.current?.click();
              return;
            }
            setFileBusy(true);
            try {
              const value = await openBackupFile();
              if (value !== null) check(value);
            } catch (e) {
              report(e);
            } finally {
              setFileBusy(false);
            }
          }}
        >
          {tr('Sicherungsdatei öffnen')}
        </Button>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept=".json,application/json,text/plain"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setFileBusy(true);
            try {
              if (file.size > MAX_BACKUP_BYTES)
                throw Error('Die Sicherungsdatei ist zu groß.');
              check(await file.text());
            } catch (e) {
              report(e);
            } finally {
              setFileBusy(false);
            }
          }}
        />
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
          {tr('Sicherung kopieren')}
        </Button>
        <details
          open={backupOpen}
          onToggle={(event) => setBackupOpen(event.currentTarget.open)}
        >
          <summary>{tr('Sicherung einfügen oder ansehen')}</summary>
          <label htmlFor="backup-text">{tr('Sicherungstext')}</label>
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
            placeholder={tr('Leuchtwege-Sicherung hier einfügen')}
          />
          {tr(
            exported && (
              <Button
                variant="outline"
                onClick={() =>
                  (
                    document.getElementById(
                      'backup-text',
                    ) as HTMLTextAreaElement
                  )?.select()
                }
              >
                {tr('Text markieren')}
              </Button>
            ),
          )}
          <Button disabled={!text.trim()} onClick={() => check(text)}>
            {tr('Sicherung prüfen')}
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
          {tr('Letzten Import rückgängig machen')}
        </Button>
      </div>
      {nativeFiles && (
        <p className="settings-note">
          {tr(
            'Für Android-Gerätesicherung und Gerätewechsel vorbereitet. Ob Android eine Sicherung erstellt, hängt von deinen Geräteeinstellungen und dem Sicherungsdienst ab. Eine eigene Dateisicherung bleibt empfehlenswert.',
          )}
        </p>
      )}
      {tr(
        message && (
          <p role="status" className="settings-note">
            {tr(message)}
          </p>
        ),
      )}
      {tr(
        error && (
          <p role="alert" className="settings-error">
            {tr(error)}
          </p>
        ),
      )}
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent className="game-dialog">
          <AlertDialogTitle>
            {tr(
              undo
                ? 'Vorherigen Stand wiederherstellen?'
                : 'Sicherung wiederherstellen?',
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {tr('Sicherung vom')}
            {tr(' ')}
            {tr(
              pending && new Date(pending.createdAt).toLocaleString(locale()),
            )}
            {tr('. Dieser Stand ersetzt deine aktuellen Daten.')}
            {tr(' ')}
            {tr(
              undo
                ? 'Auch Fortschritt seit dem Import wird ersetzt.'
                : 'Den Import kannst du anschließend rückgängig machen.',
            )}
          </AlertDialogDescription>
          {summary && (
            <dl className="backup-preview">
              <div>
                <dt>{tr('Drehpuzzles')}</dt>
                <dd>{summary.turn}</dd>
              </div>
              <div>
                <dt>{tr('Nur Schieben')}</dt>
                <dd>{summary.slide}</dd>
              </div>
              <div>
                <dt>{tr('Schieben & Drehen')}</dt>
                <dd>{summary.rotate}</dd>
              </div>
              <div>
                <dt>{tr('Level')}</dt>
                <dd>
                  {summary.level} · {summary.xp} XP
                </dd>
              </div>
              <div>
                <dt>{tr('Erfolge')}</dt>
                <dd>{summary.achievements}</dd>
              </div>
              <div>
                <dt>{tr('Geschützte Tage')}</dt>
                <dd>{summary.protectedDays}</dd>
              </div>
            </dl>
          )}
          <div className="settings-confirm">
            <AlertDialogCancel>{tr('Abbrechen')}</AlertDialogCancel>
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
              {tr('Wiederherstellen')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
