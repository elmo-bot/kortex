import * as Haptics from 'expo-haptics';

function quietly(effect: Promise<void>) {
  void effect.catch(() => undefined);
}

export const haptics = {
  wake() { quietly(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)); },
  beginCapture() { quietly(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)); },
  endCapture() { quietly(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)); },
  selectNode() { quietly(Haptics.selectionAsync()); },
  saved() { quietly(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)); },
  warning() { quietly(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)); },
};
