'use client';
import { useEffect, useState } from 'react';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { readPreferences, savePreferences } from '@/lib/preferences.mjs';
import {
  supportsReminders,
  reminderPermission,
  enableReminders,
  openReminderSettings,
  testReminder,
  syncReminders,
} from '@/lib/reminders';
import { t as tr } from '@/lib/i18n';
export default function Reminders() {
  const [prefs, setPrefs] = useState(readPreferences);
  const [supported, setSupported] = useState(false),
    [allowed, setAllowed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    setSupported(supportsReminders());
    const update = () => {
      setPrefs(readPreferences());
      if (supportsReminders())
        void reminderPermission()
          .then((r) => setAllowed(r.allowed))
          .catch(() => setError('Erinnerungen konnten nicht geprüft werden.'));
    };
    update();
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  async function change(value: any) {
    setBusy(true);
    setError('');
    try {
      if ((value.reminderEnabled || value.streakReminderEnabled) && !allowed) {
        const r = await enableReminders();
        setAllowed(r.allowed);
        if (!r.allowed) {
          setError('Bitte Benachrichtigungen in Android erlauben.');
          return;
        }
      }
      setPrefs(savePreferences(value));
      await syncReminders();
    } catch {
      setError('Erinnerungen konnten nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>{tr('Erinnerungen')}</h2>
      {!supported ? (
        <p>{tr('Erinnerungen sind in der Android-App verfügbar.')}</p>
      ) : (
        <>
          <div className="settings-list">
            {[
              {
                key: 'reminderEnabled',
                time: 'reminderTime',
                title: 'Tägliche Spielerinnerung',
              },
              {
                key: 'streakReminderEnabled',
                time: 'streakReminderTime',
                title: 'Streak-Warnung',
              },
            ].map((item) => (
              <div key={item.key}>
                <label className="settings-row">
                  <span>
                    <strong>{tr(item.title)}</strong>
                  </span>
                  <Switch
                    disabled={busy}
                    checked={(prefs as any)[item.key]}
                    onCheckedChange={(value) =>
                      void change({ [item.key]: value })
                    }
                    aria-label={tr(item.title)}
                  />
                </label>
                <label className="settings-row">
                  <span>{tr('Uhrzeit')}</span>
                  <input
                    type="time"
                    aria-label={tr(item.title)}
                    disabled={busy}
                    value={(prefs as any)[item.time]}
                    onChange={(e) => {
                      if (e.target.value)
                        void change({ [item.time]: e.target.value });
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
          <p>
            {tr(
              'Nur solange heute noch kein Rätsel abgeschlossen ist. Die Streak-Warnung gilt nur bei laufender Serie. Bei höchstens einer Stunde Abstand erscheint nur die Streak-Warnung.',
            )}
          </p>
          <p>
            {tr(
              'Die Uhrzeiten gelten lokal. Android kann Erinnerungen im Energiesparmodus verzögern.',
            )}
          </p>
          {!allowed && (
            <Button
              variant="outline"
              onClick={() =>
                void openReminderSettings().catch(() =>
                  setError(
                    'Android-Einstellungen konnten nicht geöffnet werden.',
                  ),
                )
              }
            >
              {tr('Android-Benachrichtigungen öffnen')}
            </Button>
          )}
          {allowed && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void testReminder().catch(() =>
                  setError(
                    'Testbenachrichtigung konnte nicht angezeigt werden.',
                  ),
                )
              }
            >
              {tr('Testbenachrichtigung senden')}
            </Button>
          )}
        </>
      )}
      {error && <p role="alert">{tr(error)}</p>}
    </section>
  );
}
