# Trial Behavior → Upgrade Nudges (Clean Mapping)

**This is where monetization feels earned, not sold.**

The key is to watch user behavior and respond appropriately. Don't nudge users who aren't getting value. Do nudge users who are clearly benefiting.

---

## Behavior Signals to Watch

| Signal | Meaning | What to Do |
|--------|---------|------------|
| **Generates 3+ outfits** | Value felt | Gentle continuation nudge |
| **Reads "Why this works"** | Trust forming | Reinforce personalization |
| **Adds closet items** | Commitment | Emphasize long-term benefit |
| **Revisits outfits** | Habit forming | Subscription framing |
| **Never opens outfits** | Value gap | No nudge — fix onboarding |

---

## Signal 1: Generates 3+ Outfits (High Engagement)

### Meaning
User is actively using the core feature. They're getting value from outfit generation. Best case scenario.

### Trigger
- 3+ outfits generated
- Closet revisited

### What to Do
**Gentle continuation nudge**

**Copy (Exact):**
```
Styled is learning your preferences.
Keeping it active helps your wardrobe work together over time.

[Continue with Styled]
```

**Why this works:**
- Emphasizes learning/improvement
- Long-term framing ("over time")
- No pressure, just continuation
- Single clear CTA
- No price mention (they know already)

**When to show:**
- After 3rd outfit generation
- When they revisit closet
- During trial (Day 1-6)
- In-app soft paywall

---

## Signal 2: Style DNA-Driven User

### Meaning
User engaged deeply with onboarding. They care about personalization and their style preferences.

### Trigger
- Completed onboarding carefully
- Interacted with avoid-rules or colors

### What to Do
**Reinforce personalization**

**Copy (Exact):**
```
Your Style DNA is shaping every outfit.
Keeping access lets Styled refine this with you.

[Keep my Style DNA active]
```

**Why this works:**
- References their specific input (Style DNA)
- Emphasizes personalization
- "Refine this with you" = collaborative
- CTA reinforces ownership ("my Style DNA")
- No pressure, just continuation

**When to show:**
- After completing onboarding
- When they edit Style DNA
- When they interact with preferences
- In paywall or upgrade prompt

---

## Signal 3: Adds Closet Items

### Meaning
User is investing time building their closet. They're committed to using the app long-term.

### What to Do
**Emphasize long-term benefit**

**Copy:**
```
You're building a wardrobe that works together.

The more you add, the better your outfit suggestions become.
Plus members get unlimited combinations.

Try free for 7 days
```

**Why this works:**
- Acknowledges their investment
- Shows compounding value
- Frames subscription as long-term benefit
- Emphasizes unlimited potential

**When to show:**
- After adding 5+ items
- When they're actively building closet
- In closet screen or upgrade prompt

---

## Signal 4: Revisits Outfits

### Meaning
User is returning to previously generated outfits. Habit is forming. They're using Styled as a daily tool.

### What to Do
**Subscription framing**

**Copy:**
```
You've worn 5 Styled outfits this week.

This is becoming part of your routine.
Keep it going with unlimited outfits.

Try free for 7 days
```

**Why this works:**
- Validates habit formation
- Shows real-world usage
- Frames subscription as routine support
- Emphasizes continuation

**When to show:**
- After marking 3+ outfits as worn
- When they return to outfit history
- In upgrade prompt or reminder

---

## Signal 5: Minimal Engagement (Do NOT Push)

### Meaning
User tried the app but didn't engage. Low interaction. Value gap.

### Trigger
- <2 outfits generated
- Low interaction overall

### What to Do
**Graceful exit - no pressure**

**Copy (Exact):**
```
Thanks for trying Styled.
If now's not the right time, you can always come back.

[Manage subscription]
```

**Why this works:**
- Respectful exit
- No guilt trip
- No pressure to continue
- Leaves door open
- Single CTA: manage/cancel

**What NOT to do:**
- ❌ Don't show upgrade prompts
- ❌ Don't push for conversion
- ❌ Don't use urgency tactics
- ❌ Don't ask "why are you leaving?"

**Why this is correct:**
- They're not getting value
- Pushing would create resentment
- Better to let them go gracefully
- Focus on fixing product instead

**What to investigate:**
- Is onboarding clear?
- Are outfits relevant?
- Is UI confusing?
- Are explanations helpful?

---

## Implementation

### Behavior Tracking

```typescript
interface UserBehaviorSignals {
  outfitsGenerated: number;
  explanationsRead: number;
  closetItemsAdded: number;
  outfitsRevisited: number;
  outfitsOpened: number;
}

export function analyzeUpgradeReadiness(
  signals: UserBehaviorSignals
): 'ready' | 'building_trust' | 'not_ready' {
  // No engagement = not ready
  if (signals.outfitsOpened === 0) {
    return 'not_ready';
  }

  // Strong signals = ready
  if (signals.outfitsGenerated >= 3 && signals.explanationsRead >= 2) {
    return 'ready';
  }

  // Some engagement = building trust
  if (signals.outfitsGenerated >= 1 || signals.closetItemsAdded >= 3) {
    return 'building_trust';
  }

  return 'not_ready';
}
```

### Nudge Selection

```typescript
export function selectUpgradeNudge(
  signals: UserBehaviorSignals
): UpgradeNudge | null {
  const readiness = analyzeUpgradeReadiness(signals);

  if (readiness === 'not_ready') {
    return null; // No nudge
  }

  // Prioritize strongest signal
  if (signals.outfitsRevisited >= 3) {
    return {
      type: 'habit_forming',
      copy: 'You've worn 5 Styled outfits this week...',
    };
  }

  if (signals.closetItemsAdded >= 5) {
    return {
      type: 'long_term_benefit',
      copy: 'You're building a wardrobe that works together...',
    };
  }

  if (signals.explanationsRead >= 3) {
    return {
      type: 'personalization',
      copy: 'We're learning what works for your style...',
    };
  }

  if (signals.outfitsGenerated >= 3) {
    return {
      type: 'continuation',
      copy: 'You've created 8 outfits this week...',
    };
  }

  return null;
}
```

---

## Nudge Timing

### When to Show

**Ready:**
- After 3rd outfit generation (soft paywall)
- Day 6 of trial (if engaged)
- When accessing Plus features

**Building Trust:**
- After 5th closet item added
- After reading 3+ explanations
- When revisiting outfits

**Not Ready:**
- Never show paywall
- Focus on engagement
- Improve onboarding

### When NOT to Show

- ❌ User hasn't opened any outfits
- ❌ User hasn't engaged in 3+ days
- ❌ User explicitly dismissed paywall
- ❌ User is in onboarding flow

---

## Copy Principles

### Do:
- ✅ Reference specific behavior
- ✅ Acknowledge value delivered
- ✅ Use their style preferences
- ✅ Frame as continuation
- ✅ Show long-term benefit

### Don't:
- ❌ Generic "upgrade now" messaging
- ❌ Pressure tactics
- ❌ Ignore their behavior
- ❌ Push when they're not ready
- ❌ Use same copy for everyone

---

## Success Metrics

### Good Signs
- ✅ High conversion from engaged users (>50%)
- ✅ Low conversion from unengaged users (<10%)
- ✅ Users say "worth it" not "pushy"
- ✅ Behavior-based nudges outperform generic

### Warning Signs
- ⚠️ Converting unengaged users (wrong targeting)
- ⚠️ Not converting engaged users (wrong messaging)
- ⚠️ Complaints about pressure
- ⚠️ High paywall dismissal rate

---

## A/B Test Ideas

### Test 1: Behavior-Based vs. Generic
- A: Behavior-based nudges (personalized)
- B: Generic "upgrade now" (same for everyone)

**Hypothesis:** Behavior-based converts better

### Test 2: Timing
- A: After 3rd outfit (current)
- B: After 5th outfit (more value shown)

**Hypothesis:** More value = higher conversion

### Test 3: Copy Focus
- A: Continuation framing ("keep refining")
- B: Feature framing ("unlock unlimited")

**Hypothesis:** Continuation converts better

---

## Remember

**Monetization feels earned when:**
1. User has received value
2. User shows engagement
3. Nudge references their behavior
4. Timing is appropriate
5. Copy is personalized

**Don't nudge users who aren't getting value. Fix the product first.**

**The best upgrade prompt is one that feels inevitable, not pushy.**
