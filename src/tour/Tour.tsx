/**
 * The first-run walkthrough: provider, highlightable targets, and overlay.
 *
 * How it fits together
 *   - A control that the tour can point at is wrapped in <TourTarget id>. The
 *     wrapper only records a ref; it draws nothing and changes no layout.
 *   - <TourProvider> owns which step is showing. It starts the tour once for
 *     a brand-new account (flagged when the style survey finishes) and on
 *     request from Settings.
 *   - <TourOverlay> sits above the navigator. For the current step it
 *     measures the target on screen, dims everything else, pulses a ring
 *     around it and shows a short card. Tapping the lit control - or the
 *     card's button - performs the step's real navigation and moves on.
 *
 * Why the overlay takes the tap instead of letting it through: the step
 * decides where the tap goes, so a highlighted "+ ADD" explains itself
 * without dropping a first-time user into the camera mid-tour, and nothing
 * outside the ring can be pressed by accident.
 *
 * It can never trap anyone: "Skip tour" is on every card; a control that is
 * missing or off-screen turns the step into a plain centred card; signing
 * out ends it.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts, radius, shadow } from '../theme/designSystem';
import { CardPlacement, RING_RADIUS, RING_WIDTH, Rect, dimPanels, holeFor, isHighlightable, placeCard, ringFor } from './tourLayout';
import { TOUR_STEPS, TOUR_STOP_COUNT, TourStep, TourTargetId } from './tourSteps';

// ------------------------------------------------------------ target registry

/** The on-screen node for each highlightable control, while it is mounted. */
const targets = new Map<string, any>();
const refCallbacks = new Map<string, (node: any) => void>();

/**
 * A ref for a control the tour can highlight:
 *
 *   <TouchableOpacity ref={tourRef('closet.add')} ...>
 *
 * It only remembers the node so the overlay can measure it - no wrapper, no
 * style, no layout change. The same callback is returned for the same id, so
 * React does not detach and reattach it on every render.
 */
export function tourRef(id: TourTargetId): (node: any) => void {
  let callback = refCallbacks.get(id);
  if (!callback) {
    callback = (node: any) => {
      if (node) targets.set(id, node);
      else targets.delete(id);
    };
    refCallbacks.set(id, callback);
  }
  return callback;
}

/**
 * For a group that has no single node to hang a ref on (a row of chips):
 * a plain block View around the children. Use tourRef wherever a control
 * can take a ref directly.
 */
export function TourTarget({
  id,
  style,
  children,
}: {
  id: TourTargetId;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <View ref={tourRef(id)} collapsable={false} style={style}>
      {children}
    </View>
  );
}

function measure(id: string): Promise<Rect | null> {
  return measureNode(targets.get(id));
}

function measureNode(node: any): Promise<Rect | null> {
  return new Promise(resolve => {
    if (!node || typeof node.measureInWindow !== 'function') {
      resolve(null);
      return;
    }
    try {
      node.measureInWindow((x: number, y: number, width: number, height: number) => {
        resolve([x, y, width, height].every(n => typeof n === 'number' && isFinite(n)) ? { x, y, width, height } : null);
      });
    } catch {
      resolve(null);
    }
  });
}

// ---------------------------------------------------------------- persistence

const pendingKey = (uid: string) => `tour:v1:pending:${uid}`;
const doneKey = (uid: string) => `tour:v1:done:${uid}`;

/**
 * Called when a brand-new account finishes the style survey. The flag is
 * stored, not just held in memory, so closing the app on the survey's last
 * screen still gets the tour on the next open.
 */
export async function markTourPending(uid: string | null | undefined): Promise<void> {
  if (!uid) return;
  try {
    await AsyncStorage.setItem(pendingKey(uid), '1');
  } catch {
    /* the tour is a nicety; never block onboarding on it */
  }
}

async function takePending(uid: string): Promise<boolean> {
  try {
    const [pending, done] = await Promise.all([AsyncStorage.getItem(pendingKey(uid)), AsyncStorage.getItem(doneKey(uid))]);
    return !!pending && !done;
  } catch {
    return false;
  }
}

async function markDone(uid: string | null): Promise<void> {
  if (!uid) return;
  try {
    await AsyncStorage.multiSet([[doneKey(uid), new Date().toISOString()]]);
    await AsyncStorage.removeItem(pendingKey(uid));
  } catch {
    /* worst case the tour is offered once more */
  }
}

// -------------------------------------------------------------------- context

/** What the tour needs from navigation; AppNavigator supplies it from its container ref. */
export interface TourNavigator {
  isReady: () => boolean;
  /** Top-level route names currently registered (MainTabs only exists when signed in). */
  routeNames: () => string[];
  navigate: (name: string, params?: object) => void;
}

interface TourContextValue {
  /** The step on screen, or null when no tour is running. */
  step: TourStep | null;
  index: number;
  start: () => void;
  advance: () => void;
  /** Ends the tour. `openAdd` is the finish card's "Add my first piece". */
  end: (openAdd?: boolean) => void;
}

const TourContext = createContext<TourContextValue>({
  step: null,
  index: -1,
  start: () => undefined,
  advance: () => undefined,
  end: () => undefined,
});

export const useTour = () => useContext(TourContext);

/** Runs `effect` each time the tour arrives at `stepId` - e.g. to scroll a row into view. */
export function useTourStepEffect(stepId: string, effect: () => void): void {
  const { step } = useTour();
  const active = step?.id === stepId;
  const latest = useRef(effect);
  latest.current = effect;
  useEffect(() => {
    if (active) latest.current();
  }, [active]);
}

export function TourProvider({
  uid,
  ready,
  navigator,
  children,
}: {
  /** The signed-in user's id, or null. */
  uid: string | null;
  /** True once that user is past the style survey and the main tabs are mounted. */
  ready: boolean;
  navigator: TourNavigator;
  children: React.ReactNode;
}) {
  const [index, setIndexState] = useState(-1);
  // Mirrored in a ref so advancing reads the live step without doing its
  // navigation inside a state updater.
  const indexRef = useRef(-1);
  const setIndex = useCallback((next: number) => {
    indexRef.current = next;
    setIndexState(next);
  }, []);
  const navRef = useRef(navigator);
  navRef.current = navigator;

  const canRun = useCallback(() => {
    const nav = navRef.current;
    return nav.isReady() && nav.routeNames().includes('MainTabs');
  }, []);

  const start = useCallback(() => {
    if (!canRun()) return;
    navRef.current.navigate('MainTabs', { screen: 'Home' });
    setIndex(0);
  }, [canRun, setIndex]);

  const end = useCallback(
    (openAdd?: boolean) => {
      setIndex(-1);
      markDone(uid);
      if (openAdd && canRun()) {
        navRef.current.navigate('MainTabs', { screen: 'Closet' });
        navRef.current.navigate('AddClosetItem');
      }
    },
    [uid, canRun, setIndex]
  );

  const advance = useCallback(() => {
    const current = indexRef.current;
    const step = TOUR_STEPS[current];
    if (!step || current >= TOUR_STEPS.length - 1) return; // the finish card ends via end()
    if (!canRun()) {
      setIndex(-1);
      return;
    }
    if (step.go) {
      if ('tab' in step.go) navRef.current.navigate('MainTabs', { screen: step.go.tab });
      else navRef.current.navigate(step.go.screen);
    }
    setIndex(current + 1);
  }, [canRun, setIndex]);

  // First run: a new account that has just finished the survey.
  useEffect(() => {
    if (!uid || !ready) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    takePending(uid).then(pending => {
      if (!pending || cancelled) return;
      // Let Home mount, load and fade in before anything is dimmed.
      timer = setTimeout(() => {
        if (!cancelled) start();
      }, 1400);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [uid, ready, start]);

  // Signing out, or being sent back to the survey, ends a tour in progress.
  useEffect(() => {
    if (!uid || !ready) setIndex(-1);
  }, [uid, ready, setIndex]);

  const value = useMemo<TourContextValue>(
    () => ({ step: index >= 0 ? TOUR_STEPS[index] ?? null : null, index, start, advance, end }),
    [index, start, advance, end]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

// -------------------------------------------------------------------- overlay

const DIM = 'rgba(28, 28, 28, 0.62)';
const NATIVE_DRIVER = Platform.OS !== 'web';
/** How often the lit control is re-measured, so the ring follows a scroll or a late layout. */
const MEASURE_EVERY_MS = 250;

export function TourOverlay() {
  const { step, index, advance, end } = useTour();
  const windowSize = useWindowDimensions();
  // The overlay's own frame. Controls are measured in window coordinates, so
  // they are converted into the overlay's: at the app root the two are the
  // same, but nothing below should depend on that.
  const rootRef = useRef<View | null>(null);
  const [frame, setFrame] = useState<Rect | null>(null);
  const window = frame ? { width: frame.width, height: frame.height } : windowSize;
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(190);
  const pulse = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  // Follow the current step's control.
  useEffect(() => {
    setRect(null);
    if (!step?.target) return;
    let cancelled = false;
    const tick = async () => {
      const [target, root] = await Promise.all([measure(step.target!), measureNode(rootRef.current)]);
      if (cancelled) return;
      if (root) {
        setFrame(previous =>
          previous &&
          Math.abs(previous.x - root.x) < 1 &&
          Math.abs(previous.y - root.y) < 1 &&
          Math.abs(previous.width - root.width) < 1 &&
          Math.abs(previous.height - root.height) < 1
            ? previous
            : root
        );
      }
      const measured = target && root ? { ...target, x: target.x - root.x, y: target.y - root.y } : target;
      setRect(previous => {
        if (!measured) return null;
        if (
          previous &&
          Math.abs(previous.x - measured.x) < 1 &&
          Math.abs(previous.y - measured.y) < 1 &&
          Math.abs(previous.width - measured.width) < 1 &&
          Math.abs(previous.height - measured.height) < 1
        ) {
          return previous;
        }
        return measured;
      });
    };
    tick();
    const interval = setInterval(tick, MEASURE_EVERY_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step?.id, step?.target]);

  // The slow pulse on the ring.
  useEffect(() => {
    if (!step) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [step?.id, pulse, !!step]);

  // Each step fades in, so a jump between screens does not flash.
  useEffect(() => {
    if (!step) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: NATIVE_DRIVER }).start();
  }, [step?.id, fade, !!step]);

  if (!step) return null;

  const lit = step.target && isHighlightable(rect, window) ? holeFor(rect, window) : null;
  const ring = lit ? ringFor(lit) : null;
  const card: CardPlacement = placeCard(lit, window, cardHeight);
  const isLast = index === TOUR_STEPS.length - 1;
  const stop = TOUR_STEPS.slice(0, index + 1).filter(s => s.target !== null).length;
  const onPrimary = isLast ? () => end(true) : advance;

  return (
    <Animated.View
      ref={rootRef as any}
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}
      // Covers the window, so everything under it is inert until the tour moves on.
      accessibilityViewIsModal
    >
      {lit && ring ? (
        <>
          {dimPanels(lit, window).map((panel, i) => (
            <View
              key={i}
              style={[styles.dim, { left: panel.x, top: panel.y, width: panel.width, height: panel.height }]}
            />
          ))}
          {/* The halo breathes outward; the ring itself stays crisp. */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.halo,
              {
                left: ring.x - 5,
                top: ring.y - 5,
                width: ring.width + 10,
                height: ring.height + 10,
                borderRadius: RING_RADIUS + 5,
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0.1] }),
                // Grows by a fixed few points whatever the control's size - a
                // scale factor would throw a wide row's halo off the screen.
                transform: [
                  { scaleX: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + 12 / Math.max(40, ring.width)] }) },
                  { scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + 12 / Math.max(40, ring.height)] }) },
                ],
              },
            ]}
          />
          <Pressable
            onPress={onPrimary}
            accessibilityRole="button"
            accessibilityLabel={`${step.title}. ${step.cta}`}
            style={[
              styles.ring,
              { left: ring.x, top: ring.y, width: ring.width, height: ring.height, borderRadius: RING_RADIUS },
            ]}
          />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.dim]} />
      )}

      <View
        style={[styles.card, { left: card.left, top: card.top, width: card.width }]}
        onLayout={event => {
          const height = Math.round(event.nativeEvent.layout.height);
          if (Math.abs(height - cardHeight) > 1) setCardHeight(height);
        }}
        accessibilityRole="alert"
      >
        {step.target !== null && (
          <Text style={styles.count}>
            {stop} OF {TOUR_STOP_COUNT}
          </Text>
        )}
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => end(false)}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Later' : 'Skip the tour'}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skip}>{isLast ? 'Later' : 'Skip tour'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cta} onPress={onPrimary} accessibilityRole="button" activeOpacity={0.85}>
            <Text style={styles.ctaText}>{step.cta}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 1000, elevation: 1000 },
  dim: { position: 'absolute', backgroundColor: DIM },
  halo: { position: 'absolute', borderWidth: 3, borderColor: colors.bone },
  ring: { position: 'absolute', borderWidth: RING_WIDTH, borderColor: colors.bone },
  card: {
    position: 'absolute',
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 18,
    ...shadow.card,
  },
  count: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: colors.tobacco,
    marginBottom: 8,
  },
  title: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 26, color: colors.ink },
  body: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkMuted, marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  skip: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkFaint },
  cta: { borderRadius: radius.full, backgroundColor: colors.rust, paddingHorizontal: 18, paddingVertical: 10 },
  ctaText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.bone },
});
