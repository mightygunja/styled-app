/**
 * The login stage: the product loop, acted out.
 *
 * Four fabric cards - a blazer, a sweater, trousers, a shirt - play a scene
 * on repeat: they sit as a closet, compose themselves into a work outfit,
 * recompose into a weekend one, then regroup while the caption makes the
 * point that every look arrives with its reason. That IS the app: your own
 * pieces, recombined per occasion, explained. The old version showed pretty
 * cards; this one demonstrates the promise before a word of the form is read.
 *
 * Still real perspective space - per-card rotate/scale/opacity, drag
 * parallax on top of whatever pose the scene is in, and everything springs
 * back. No new dependencies; the card faces are the woven textures generated
 * from the design system's own palette.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors, fonts } from '../theme/designSystem';

const CARD_W = 168;
const CARD_H = CARD_W * 1.36;
const SCENE_MS = 4200;
const MOVE_MS = 950;

interface Pose {
  x: number;
  y: number;
  rot: number;
  scale: number;
  opacity: number;
}

interface CardDef {
  label: string;
  meta: string;
  ground: string;
  ink: string;
  image: ImageSourcePropType;
  /** One pose per scene, same length for every card. */
  poses: Pose[];
}

/**
 * Render order is fixed back-to-front (shirt deepest, blazer on top) and the
 * poses are choreographed so no scene ever needs the depth order to change -
 * z-order swaps mid-animation read as glitches, not motion.
 *
 * Scenes: 0 closet fan · 1 work look · 2 weekend look · 3 regroup.
 */
const CARDS: CardDef[] = [
  {
    label: 'Shirt',
    meta: 'LINEN',
    ground: colors.sand,
    ink: colors.ink,
    image: require('../../assets/textures/linen.png'),
    poses: [
      { x: -104, y: 16, rot: -9, scale: 0.78, opacity: 0.92 },
      { x: -58, y: -26, rot: -6, scale: 0.8, opacity: 0.88 },
      { x: -142, y: -48, rot: -12, scale: 0.6, opacity: 0.2 },
      { x: -64, y: 8, rot: -7, scale: 0.8, opacity: 0.92 },
    ],
  },
  {
    label: 'Trousers',
    meta: 'TWILL',
    ground: colors.camel,
    ink: colors.ink,
    image: require('../../assets/textures/twill.png'),
    poses: [
      { x: -35, y: 2, rot: -3, scale: 0.83, opacity: 0.96 },
      { x: 62, y: 30, rot: 5, scale: 0.85, opacity: 0.92 },
      { x: 58, y: 28, rot: 6, scale: 0.87, opacity: 0.92 },
      { x: -21, y: -2, rot: -2, scale: 0.85, opacity: 0.96 },
    ],
  },
  {
    label: 'Sweater',
    meta: 'RIB KNIT',
    ground: colors.tobacco,
    ink: colors.bone,
    image: require('../../assets/textures/knit.png'),
    poses: [
      { x: 35, y: 2, rot: 3, scale: 0.87, opacity: 1 },
      { x: -150, y: 58, rot: -14, scale: 0.6, opacity: 0.2 },
      { x: 0, y: 2, rot: 0, scale: 1.02, opacity: 1 },
      { x: 22, y: -2, rot: 2, scale: 0.89, opacity: 1 },
    ],
  },
  {
    label: 'Blazer',
    meta: 'HERRINGBONE',
    ground: colors.ink,
    ink: colors.bone,
    image: require('../../assets/textures/tailored.png'),
    poses: [
      { x: 104, y: 16, rot: 9, scale: 0.9, opacity: 1 },
      { x: 0, y: 0, rot: 0, scale: 1.02, opacity: 1 },
      { x: 148, y: -54, rot: 13, scale: 0.6, opacity: 0.2 },
      { x: 66, y: 8, rot: 7, scale: 0.92, opacity: 1 },
    ],
  },
];

/** The words carry the story; the cards carry the proof. */
const CAPTIONS = [
  { eyebrow: 'YOUR CLOSET', line: 'Four pieces you actually own.' },
  { eyebrow: 'MONDAY · 8 AM', line: 'Blazer, shirt, trousers — pitched for the office.' },
  { eyebrow: 'SATURDAY', line: 'Same closet, softer — the knit leads.' },
  { eyebrow: 'THE DIFFERENCE', line: 'Every look arrives with its reason.' },
];

export default function LoginHero() {
  const [scene, setScene] = useState(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    const timer = setInterval(() => setScene(s => (s + 1) % CAPTIONS.length), SCENE_MS);
    return () => clearInterval(timer);
  }, []);

  const pan = Gesture.Pan()
    .onChange(event => {
      dragX.value = Math.max(-110, Math.min(110, dragX.value + event.changeX));
      dragY.value = Math.max(-55, Math.min(55, dragY.value + event.changeY));
    })
    .onFinalize(() => {
      dragX.value = withSpring(0, { damping: 14, stiffness: 90 });
      dragY.value = withSpring(0, { damping: 14, stiffness: 90 });
    });

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View style={styles.stage} pointerEvents="box-only">
          {CARDS.map((card, index) => (
            <StoryCard key={card.label} card={card} index={index} scene={scene} dragX={dragX} dragY={dragY} />
          ))}
        </View>
      </GestureDetector>
      <StageCaption {...CAPTIONS[scene]} />
    </View>
  );
}

interface CardProps {
  card: CardDef;
  index: number;
  scene: number;
  dragX: ReturnType<typeof useSharedValue<number>>;
  dragY: ReturnType<typeof useSharedValue<number>>;
}

function StoryCard({ card, index, scene, dragX, dragY }: CardProps) {
  const first = card.poses[0];
  const x = useSharedValue(first.x);
  const y = useSharedValue(first.y);
  const rot = useSharedValue(first.rot);
  const scale = useSharedValue(first.scale);
  const opacity = useSharedValue(first.opacity);

  useEffect(() => {
    const pose = card.poses[scene];
    // A slight stagger per card is what makes the change read as garments
    // being picked, not a layout snapping.
    const delay = index * 110;
    const config = { duration: MOVE_MS, easing: Easing.inOut(Easing.cubic) };
    x.value = withDelay(delay, withTiming(pose.x, config));
    y.value = withDelay(delay, withTiming(pose.y, config));
    rot.value = withDelay(delay, withTiming(pose.rot, config));
    scale.value = withDelay(delay, withTiming(pose.scale, config));
    opacity.value = withDelay(delay, withTiming(pose.opacity, config));
  }, [scene, card, index, x, y, rot, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    // Front cards move more under drag - that differential is the depth.
    const depth = scale.value;
    return {
      opacity: opacity.value,
      transform: [
        { perspective: 1000 },
        { translateX: x.value + dragX.value * 0.45 * depth },
        { translateY: y.value + dragY.value * 0.3 * depth },
        { rotateY: `${dragX.value * 0.055 * depth}deg` },
        { rotateX: `${-dragY.value * 0.045 * depth}deg` },
        { rotateZ: `${rot.value}deg` },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View style={[styles.card, { backgroundColor: card.ground }, animatedStyle]}>
      <Image source={card.image} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardFace}>
        <Text style={[styles.cardMeta, { color: card.ink }]}>{card.meta}</Text>
        <View style={{ flex: 1 }} />
        <View style={[styles.cardRule, { backgroundColor: card.ink }]} />
        <Text style={[styles.cardLabel, { color: card.ink }]}>{card.label}</Text>
      </View>
    </Animated.View>
  );
}

/** Crossfades when the scene's words change; holds still otherwise. */
function StageCaption({ eyebrow, line }: { eyebrow: string; line: string }) {
  const [shown, setShown] = useState({ eyebrow, line });
  const opacity = useSharedValue(1);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (shown.eyebrow === eyebrow && shown.line === line) return;
    const next = { eyebrow, line };
    opacity.value = withTiming(0, { duration: 260 }, finished => {
      if (finished) runOnJS(setShown)(next);
    });
    lift.value = withTiming(-6, { duration: 260 });
  }, [eyebrow, line, shown, opacity, lift]);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
    lift.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) });
  }, [shown, opacity, lift]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }],
  }));

  return (
    <Animated.View style={[styles.caption, style]}>
      <Text style={styles.captionEyebrow}>{shown.eyebrow}</Text>
      <Text style={styles.captionLine}>{shown.line}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: CARD_H + 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    // The one shadow in the app; without it the layers read as flat
    // rectangles rather than depth.
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
  cardImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardFace: { flex: 1, padding: 16 },
  cardMeta: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 8,
    letterSpacing: 1.6,
    opacity: 0.75,
  },
  cardRule: { height: 1, width: 22, marginBottom: 9, opacity: 0.5 },
  cardLabel: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 24 },

  caption: { alignItems: 'center', marginTop: 2, minHeight: 46 },
  captionEyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 1.8,
    color: colors.tobacco,
    marginBottom: 5,
  },
  captionLine: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});
