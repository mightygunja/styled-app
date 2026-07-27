# Animation Implementation Guide

## Overview
Professional animations have been implemented across the Styled app to enhance user experience with smooth, 60fps transitions.

## Animation Utilities (`src/utils/animations.ts`)

### Available Functions

#### Fade Animations
- `fadeIn(animatedValue, duration, toValue)` - Fade element in
- `fadeOut(animatedValue, duration, toValue)` - Fade element out

#### Slide Animations
- `slideInFromBottom(animatedValue, duration)` - Slide element up from bottom
- `slideOutToBottom(animatedValue, distance, duration)` - Slide element down

#### Scale Animations
- `scale(animatedValue, toValue, duration)` - Spring-based scale animation

#### Composition
- `parallel(animations)` - Run animations simultaneously
- `sequence(animations)` - Run animations one after another
- `stagger(animations, delay)` - Stagger animations with delay

#### Modal Animations
- `modalFadeIn(bg, content, translateY, duration)` - Complete modal entrance
- `modalFadeOut(bg, content, translateY, duration)` - Complete modal exit

### Animation Config
```typescript
AnimationConfig = {
  fast: 200ms,
  normal: 300ms,
  slow: 500ms,
  easeOut: Easing.out(Easing.cubic),
  easeIn: Easing.in(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
}
```

## Components

### AnimatedModal (`src/components/AnimatedModal.tsx`)
Modal with fade-in background (50% opacity) and slide-up content.

**Usage:**
```tsx
<AnimatedModal visible={isVisible} onClose={() => setVisible(false)}>
  <Text>Modal Content</Text>
</AnimatedModal>
```

### AnimatedButton (`src/components/AnimatedButton.tsx`)
Button with scale animation on press.

**Usage:**
```tsx
<AnimatedButton onPress={handlePress} scaleValue={0.95}>
  <Text>Press Me</Text>
</AnimatedButton>
```

### LookCard (`src/components/LookCard.tsx`)
Card with scale animation on press (0.97 scale).

## Screen Animations

### HomeScreen
- **Fade-in**: Looks container fades in after loading (300ms)
- **Trigger**: After API fetch completes

### RecommendationsScreen
- **Fade-in**: Recommendation categories fade in (300ms)
- **Trigger**: After recommendations load

### FavoritesScreen
- **Fade-in**: Favorites grid fades in (300ms)
- **Trigger**: After favorites load

### ClosetScreen
- **Fade-in**: Items grid fades in (300ms)
- **Trigger**: After items load

### LookCard (All Screens)
- **Scale**: Card scales to 0.97 on press
- **Duration**: 100ms spring animation

## Implementation Pattern

### 1. Add Animation State
```tsx
const fadeAnim = useRef(new Animated.Value(0)).current;
```

### 2. Trigger Animation After Data Load
```tsx
const fetchData = async () => {
  const data = await api.getData();
  setData(data);
  
  if (!refreshing) {
    fadeIn(fadeAnim, 300).start();
  }
};
```

### 3. Wrap Content in Animated.View
```tsx
<Animated.View style={{ opacity: fadeAnim }}>
  {/* Your content */}
</Animated.View>
```

## Performance Considerations

1. **Native Driver**: All animations use `useNativeDriver: true` for 60fps performance
2. **Avoid Layout Animations**: Only animate opacity and transform properties
3. **Cleanup**: Animations automatically cleanup on unmount
4. **Conditional Triggers**: Skip animations on refresh to avoid jarring experience

## Best Practices

1. **Consistency**: Use same duration (300ms) for similar animations
2. **Subtlety**: Keep scale animations subtle (0.95-0.97)
3. **Easing**: Use `easeOut` for entrances, `easeIn` for exits
4. **Stagger**: Use 50ms delay for list item stagger animations
5. **Modal Background**: Always use 50% opacity black background

## Future Enhancements

- [ ] Page transition animations
- [ ] List item stagger on initial load
- [ ] Skeleton loading animations
- [ ] Pull-to-refresh custom animations
- [ ] Swipe gesture animations
- [ ] Tab bar icon animations
- [ ] Success/error toast animations

## Troubleshooting

**Animation not working:**
- Check `useNativeDriver: true` is set
- Verify animated value is initialized with `useRef`
- Ensure Animated.View wraps the content
- Check animation is triggered after state update

**Choppy animations:**
- Verify using transform/opacity only
- Check no layout changes during animation
- Ensure native driver is enabled

**Animation fires on refresh:**
- Add `if (!refreshing)` check before triggering
- Reset animation value on component mount
