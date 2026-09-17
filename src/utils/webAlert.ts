/**
 * Alert.alert for the web build.
 *
 * react-native-web ships `Alert.alert` as an empty function, so on the
 * Vercel build every confirmation and every error message in the app was
 * silent: Delete item, Delete account, Mark as worn, Donate, Revoke access
 * and ~80 other call sites simply did nothing (full-app audit, 2026-09-17).
 * Rather than rewrite each site, this installs a working implementation
 * once, with the same signature, using the browser's own dialogs:
 *
 *   - no buttons / one button  -> window.alert, then that button's onPress
 *   - cancel + one action      -> window.confirm; OK runs the action,
 *                                 Cancel runs the cancel handler
 *   - several actions          -> each offered in turn by confirm until one
 *                                 is accepted; declining all runs cancel
 *
 * Native is untouched. Import this file once, before anything renders.
 */

import { Alert, AlertButton, Platform } from 'react-native';

function text(title?: string, message?: string, suffix?: string): string {
  return [title, message, suffix].filter(Boolean).join('\n\n');
}

function webAlert(title?: string, message?: string, buttons?: AlertButton[]): void {
  if (typeof window === 'undefined') return;

  const list = (buttons || []).filter(Boolean);
  const cancel = list.find(b => b.style === 'cancel');
  const actions = list.filter(b => b !== cancel);

  // Informational: nothing to choose between.
  if (actions.length <= 1 && !cancel) {
    window.alert(text(title, message));
    actions[0]?.onPress?.();
    return;
  }

  // The common confirm shape: Cancel + one action.
  if (actions.length === 1) {
    if (window.confirm(text(title, message))) actions[0].onPress?.();
    else cancel?.onPress?.();
    return;
  }

  // A cancel button alone behaves like an acknowledgement.
  if (actions.length === 0) {
    window.alert(text(title, message));
    cancel?.onPress?.();
    return;
  }

  // Several actions: offer each by name until one is accepted.
  for (const action of actions) {
    if (window.confirm(text(title, message, `${action.text || 'Continue'}?`))) {
      action.onPress?.();
      return;
    }
  }
  cancel?.onPress?.();
}

if (Platform.OS === 'web') {
  (Alert as any).alert = webAlert;
}

export {};
