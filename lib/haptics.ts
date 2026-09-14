import { Capacitor, registerPlugin } from '@capacitor/core';
import { readPreferences } from './preferences.mjs';
const NativeFeedback = registerPlugin<{
  pulse(options: { success: boolean }): Promise<void>;
}>('LeuchtwegeFeedback');
export function haptic(success = false) {
  if (!readPreferences().haptics) return;
  if (Capacitor.isNativePlatform())
    void NativeFeedback.pulse({ success }).catch(() => {});
  else if (typeof navigator !== 'undefined' && navigator.vibrate)
    navigator.vibrate(success ? [15, 35, 25] : 10);
}
