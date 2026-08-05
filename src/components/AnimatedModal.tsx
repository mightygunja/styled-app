import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';
import { modalFadeIn, modalFadeOut, AnimationConfig } from '../utils/animations';
import { colors } from '../theme/designSystem';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AnimatedModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: 'fade' | 'slide';
}

export default function AnimatedModal({
  visible,
  onClose,
  children,
  animationType = 'fade',
}: AnimatedModalProps) {
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      modalFadeIn(
        backgroundOpacity,
        contentOpacity,
        contentTranslateY,
        AnimationConfig.normal
      ).start();
    } else {
      // Animate out
      modalFadeOut(
        backgroundOpacity,
        contentOpacity,
        contentTranslateY,
        AnimationConfig.fast
      ).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.container}>
        {/* Animated background overlay */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backgroundOpacity,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Animated content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.ink,
  },
  content: {
    backgroundColor: colors.card,
    padding: 20,
    maxWidth: '90%',
    maxHeight: '80%',
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
});
