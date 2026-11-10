import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

/** Web: a plain View (see GestureRoot.tsx). The one web screen that uses gestures wraps itself. */
export default function GestureRoot({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={style}>{children}</View>;
}
