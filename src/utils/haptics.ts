import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Thin wrapper so call sites don't need try/catch or platform checks - haptics
// are a nice-to-have polish signal, never something a failure should surface.
const safe = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  fn().catch(() => {});
};

export const haptics = {
  // Light tap - buttons, chips, list row taps
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  // Slightly heavier - primary actions (save, submit, confirm)
  impact: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  // Toggling a selection - segmented controls, chip groups, tab switches
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
