# Habit Formation - Reduce Daily Friction

**Goal: Make getting dressed effortless.**

The less friction between "What should I wear?" and "I'm dressed," the stronger the habit.

---

## Core Principle

**Reduce decisions, not options.**

Users don't want to think about what to wear. They want to feel confident in what they're wearing.

---

## Features

### 1. "Style Me Today" (1 Tap)

**The Problem:**
- Opening app → Browse closet → Generate outfits → Pick one → See details
- Too many steps = friction = habit doesn't form

**The Solution:**
- Opening app → Tap "Style Me Today" → Done
- 1 tap = instant outfit for right now

**Implementation:**
```typescript
// /src/services/styleMeToday.ts
export function styleMeToday(closet, styleDNA, context): Outfit | null
```

**UI:**
```
┌─────────────────────────────────┐
│  ✨  Style Me Today             │
│      1-tap outfit for right now │
└─────────────────────────────────┘
```

**Context-Aware:**
- Weekday morning → Work outfit
- Weekend → Casual outfit
- No decisions required

---

### 2. Weather-Aware Outfits (Light Logic)

**The Problem:**
- User checks weather → Thinks about appropriate clothes → Opens app
- Too much mental work before even using app

**The Solution:**
- App already knows weather → Suggests appropriate outfit
- User doesn't think about weather, app does

**Light Logic (Not Complex):**
```typescript
if (temperature < 50°F) {
  // Include outerwear, layers
} else if (temperature > 80°F) {
  // Light, breathable items only
} else {
  // Normal outfit
}
```

**No Complex Weather:**
- ❌ Rain probability calculations
- ❌ Humidity adjustments
- ❌ Wind speed considerations
- ✅ Just basic temperature ranges

**Display:**
```
Today's outfit (62°F, Sunny)
[outfit image]
Perfect for today's weather
```

---

### 3. Notification (1 Max Per Day)

**The Problem:**
- Most apps spam notifications
- Users disable all notifications
- App loses engagement channel

**The Solution:**
- Only 1 notification per day, max
- Only on weekday mornings (7-9am)
- Only if user is engaged (3+ uses)
- Never on weekends

**Exact Copy:**
```
Title: "Good morning!"
Body: "Want an outfit that already works for today?"
```

**Rules:**
- ✅ Weekday mornings only (7-9am)
- ✅ Only if used app 3+ times
- ✅ Only 1 per day max
- ✅ Never on weekends
- ✅ Easy to disable
- ❌ Never "You haven't opened the app"
- ❌ Never generic reminders
- ❌ Never evening notifications

**Implementation:**
```typescript
export function shouldShowStyleMeTodayNotification(
  lastNotificationDate: Date | null,
  userEngagementCount: number
): boolean
```

---

## Friction Points to Eliminate

### Before: High Friction Flow
1. Wake up
2. Think "What should I wear?"
3. Open closet
4. Stare at clothes
5. Try combinations mentally
6. Get frustrated
7. Pick something safe
8. Still unsure

**Total time:** 10-15 minutes
**Mental energy:** High
**Confidence:** Low

### After: Low Friction Flow
1. Wake up
2. See notification: "Want an outfit that already works for today?"
3. Tap notification
4. See outfit with explanation
5. Get dressed

**Total time:** 30 seconds
**Mental energy:** Minimal
**Confidence:** High

---

## Habit Loop

```
Trigger: Morning routine (getting dressed)
   ↓
Action: Tap "Style Me Today"
   ↓
Reward: Instant outfit, confidence boost
   ↓
Investment: Mark as worn, add feedback
```

**Each cycle:**
- Reduces friction
- Builds trust
- Increases investment
- Strengthens habit

---

## Implementation Checklist

### Style Me Today Feature
- [x] Create styleMeToday() service function
- [x] Add context detection (weekday/weekend)
- [x] Create StyleMeTodayButton component
- [ ] Add to home screen (prominent placement)
- [ ] Track usage analytics
- [ ] A/B test button copy

### Weather-Aware Logic
- [x] Create getWeatherAwareOutfit() function
- [x] Implement basic temperature logic
- [ ] Integrate weather API
- [ ] Display weather context on outfit
- [ ] Test in different climates

### Notification System
- [x] Create shouldShowStyleMeTodayNotification() function
- [x] Define exact notification copy
- [ ] Implement notification scheduling
- [ ] Add user preference toggle
- [ ] Track notification engagement
- [ ] Monitor opt-out rate

---

## Success Metrics

### Friction Reduction
- **Time to outfit:** <30 seconds (target)
- **Taps to outfit:** 1-2 max
- **Decision points:** 0 (app decides)

### Habit Formation
- **Daily active users:** >50% of Week 2 users
- **Morning usage:** >60% of opens before 10am
- **Style Me Today usage:** >70% of daily users
- **Return rate:** >80% next-day return

### Engagement
- **Notification opt-in:** >60% keep enabled
- **Outfit acceptance:** >70% mark as worn
- **Session length:** <2 minutes (quick and easy)

---

## A/B Test Ideas

### Button Copy
- A: "Style Me Today"
- B: "What Should I Wear?"
- C: "Today's Outfit"

### Notification Timing
- A: 7am (early birds)
- B: 8am (most users)
- C: 9am (late risers)

### Weather Display
- A: Show temperature + weather
- B: Show weather icon only
- C: No weather display

---

## User Feedback to Monitor

### Positive Signals
- ✅ "So fast and easy"
- ✅ "Saves me time every morning"
- ✅ "Love the 1-tap feature"
- ✅ "Perfect for my routine"

### Warning Signals
- ⚠️ "Outfits don't match weather"
- ⚠️ "Too many notifications"
- ⚠️ "Not appropriate for work"
- ⚠️ "Takes too long to load"

---

## Remember

**The goal is to become part of their morning routine, not an app they have to remember to check.**

**Reduce friction → Build habit → Win retention**

---

## Next Steps

1. Implement "Style Me Today" button on home screen
2. Integrate weather API for context
3. Set up notification system with exact copy
4. Track friction metrics
5. Iterate based on usage data

**Make getting dressed effortless. That's how you build a habit.**
