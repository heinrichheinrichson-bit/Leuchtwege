import { Capacitor, registerPlugin } from '@capacitor/core';
const files = registerPlugin<{
  save(options: {
    text: string;
    name: string;
  }): Promise<{ cancelled: boolean }>;
  open(): Promise<{ cancelled: boolean; text?: string }>;
}>('LeuchtwegeBackupFiles');
export const nativeBackupFiles = () => Capacitor.getPlatform() === 'android';
export const MAX_BACKUP_BYTES = 32000000;
export async function saveBackupFile(text: string) {
  const name = `Leuchtwege-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  if (nativeBackupFiles()) {
    try {
      return !(await files.save({ text, name })).cancelled;
    } catch {
      throw Error('Die Sicherungsdatei konnte nicht gespeichert werden.');
    }
  }
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return true;
}
export async function openBackupFile() {
  try {
    const r = await files.open();
    return r.cancelled ? null : r.text || '';
  } catch {
    throw Error(
      'Die Sicherungsdatei konnte nicht gelesen werden oder ist zu groß.',
    );
  }
}
