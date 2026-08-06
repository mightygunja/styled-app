/**
 * The login hero.
 *
 * A stack of cards sitting in real perspective space: each layer drifts on its
 * own timing, tilts to a drag, and settles with spring. Depth comes from
 * `perspective` plus per-layer rotateY/rotateX, scale and opacity, which is
 * the one approach that behaves identically on both platforms - React Native's
 * translateZ is unreliable on Android, so nothing here depends on it.
 *
 * Card faces are composed from the design system rather than photographed.
 * The repo carries no photography, and rather than reach for stock imagery -
 * which is exactly what made the seeded social content read as fake - each
 * card is a palette field with an archetype set in Playfair. Drop a real
 * image into a card's `image` field and it renders instead, no other change
 * needed.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ImageSourcePropType } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { colors, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');
const CARD_W = Math.min(230, width * 0.58);
const CARD_H = CARD_W * 1.36;

interface HeroCard {
  label: string;
  meta: string;
  ground: string;
  ink: string;
  /** Supply a require()'d asset and it replaces the composed face entirely. */
  image?: ImageSourcePropType;
}

/**
 * Front of the stack last, so the array reads back-to-front the way it is
 * drawn. Grounds walk the palette from deepest to lightest.
 */
const CARDS: HeroCard[] = [
  {
    label: 'Tailored',
    meta: 'HERRINGBONE',
    ground: colors.ink,
    ink: colors.bone,
    image: require('../../assets/textures/tailored.png'),
  },
  {
    label: 'Knitwear',
    meta: 'RIB',
    ground: colors.tobacco,
    ink: colors.bone,
    image: require('../../assets/textures/knit.png'),
  },
  {
    label: 'Twill',
    meta: 'EVERY DAY',
    ground: colors.camel,
    ink: colors.ink,
    image: require('../../assets/textures/twill.png'),
  },
  {
    label: 'Linen',
    meta: 'WARM WEATHER',
    ground: colors.sand,
    ink: colors.ink,
    image: require('../../assets/textures/linen.png'),
  },
];

const REST_OFFSET = 26;
const REST_LIFT = 16;

export default function LoginHero() {
  // Drag state, shared across every layer.
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  // Idle drift, so the stack is never completely still.
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [drift]);

  const pan = Gesture.Pan()
    .onChange(event => {
      // Clamped so the stack can be pushed around but never thrown apart.
      dragX.value = Math.max(-120, Math.min(120, dragX.value + event.changeX));
      dragY.value = Math.max(-60, Math.min(60, dragY.value + event.changeY));
    })
    .onFinalize(() => {
      dragX.value = withSpring(0, { damping: 14, stiffness: 90 });
      dragY.value = withSpring(0, { damping: 14, stiffness: 90 });
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.stage} pointerEvents="box-only">
        {CARDS.map((card, index) => (
          <HeroLayer
            key={card.label}
            card={card}
            index={index}
            total={CARDS.length}
            dragX={dragX}
            dragY={dragY}
            drift={drift}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

interface LayerProps {
  card: HeroCard;
  index: number;
  total: number;
  dragX: ReturnType<typeof useSharedValue<number>>;
  dragY: ReturnType<typeof useSharedValue<number>>;
  drift: ReturnType<typeof useSharedValue<number>>;
}

function HeroLayer({ card, index, total, dragX, dragY, drift }: LayerProps) {
  // 0 for the deepest card, 1 for the front one.
  const depth = index / (total - 1);

  const animatedStyle = useAnimatedStyle(() => {
    // Layers further back move less, which is what reads as distance.
    const parallax = 0.35 + depth * 0.65;
    const wobble = interpolate(drift.value, [0, 1], [-1, 1]);

    return {
      transform: [
        { perspective: 1000 },
        { translateX: (total - 1 - index) * -REST_OFFSET + dragX.value * parallax + wobble * (4 + index * 2) },
        { translateY: (total - 1 - index) * -REST_LIFT + dragY.value * parallax * 0.6 + wobble * (2 + index) },
        { rotateY: `${dragX.value * 0.06 * parallax + wobble * 1.5}deg` },
        { rotateX: `${-dragY.value * 0.05 * parallax}deg` },
        { rotateZ: `${(total - 1 - index) * -1.6 + wobble * 0.6}deg` },
        { scale: 0.86 + depth * 0.14 },
      ],
      opacity: 0.55 + depth * 0.45,
    };
  });

  return (
    <Animated.View style={[styles.card, { backgroundColor: card.ground }, animatedStyle]}>
      {/* The weave sits behind the type rather than replacing it. The
          background colour underneath is the same hue the texture was
          generated from, so a slow-decoding image never flashes a wrong
          colour. */}
      {card.image && (
        <Image source={card.image} style={styles.cardImage} resizeMode="cover" />
      )}
      <View style={styles.cardFace}>
        <Text style={[styles.cardMeta, { color: card.ink }]}>{card.meta}</Text>
        <View style={{ flex: 1 }} />
        <View style={[styles.cardRule, { backgroundColor: card.ink }]} />
        <Text style={[styles.cardLabel, { color: card.ink }]}>{card.label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: CARD_H + 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    // The one shadow in the app, and it earns its place: without it the
    // layers read as flat overlapping rectangles rather than as depth.
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  cardImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardFace: { flex: 1, padding: 20 },
  cardMeta: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 1.8,
    opacity: 0.75,
  },
  cardRule: { height: 1, width: 28, marginBottom: 12, opacity: 0.5 },
  cardLabel: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 30 },
});
