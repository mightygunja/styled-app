# Day-14 Retention Nudges (Post-Trial, Post-Conversion)

**🎯 Goal: Reinforce value without reminding them they're paying.**

---

## Trigger Conditions

**Day 14 since install**

**User has:**
- Generated ≥2 outfits OR
- Revisited closet at least once

**Why these conditions:**
- Shows engagement
- Not too early (let trial/conversion settle)
- Not too late (before habit breaks)
- Only nudge active users

---

## In-App Message (Preferred)

### Header
```
Your wardrobe is starting to work together
```

### Body
```
Styled has been learning your preferences and refining how pieces work together. This gets better the longer you use it.
```

### CTA (Soft)
```
[Style me today]
```

**CTA notes:**
- No mention of subscription
- No pricing
- No upsell
- Just encourages usage
- Optional, low emphasis

### Design
- Dismissible banner
- Appears once only
- Neutral styling
- Soft CTA (optional)

---

## Push Notification (Optional, 1 Only)

### Title
```
Getting dressed should feel easier
```

### Body
```
Styled has a look ready for you based on what you already own.
```

**Why this works:**
- Reframes value as relief, not features
- "Should feel easier" = empathy
- "Ready for you" = effortless
- "What you already own" = no shopping pressure
- No subscription mention
- No urgency

**When to send:**
- Day 14 morning (7-9am)
- Only if user hasn't opened app in 2-3 days
- Only 1 notification ever for Day 14
- User must have notifications enabled

---

## Why This Works

✅ **Reinforces value without mentioning payment**
- "Starting to work together" = progress
- "Learning your preferences" = personalization
- "Gets better the longer you use it" = long-term value
- No mention of subscription or money

✅ **Emphasizes improvement over time**
- Not "you're paying for this"
- But "this is getting better for you"
- Focuses on benefit, not cost

✅ **Builds habit**
- Reminds them of value
- Encourages continued use
- No pressure

---

## Alternative Variations (A/B Test)

### Variation A (Recommended)
```
Header: Your wardrobe is starting to work together
Body: Styled has been learning your preferences and refining how pieces work together. This gets better the longer you use it.
```

### Variation B (More Personal)
```
Header: We're learning your style
Body: After 2 weeks, Styled is starting to understand what works for you. The more you use it, the better your outfit suggestions become.
```

### Variation C (Usage-Focused)
```
Header: You've created [N] outfits with Styled
Body: Each outfit helps us understand your style better. Keep using Styled to see how your wardrobe works together.
```

---

## When NOT to Show

❌ **Don't show if:**
- User hasn't engaged (0-1 outfits)
- User canceled subscription
- User hasn't opened app in 7+ days
- User dismissed similar message recently

**Why:**
- They're not getting value
- Nudge won't help
- Would feel like spam

---

## Implementation

```typescript
interface Day14NudgeConditions {
  daysSinceInstall: number;
  outfitsGenerated: number;
  closetRevisited: boolean;
  lastOpenedDate: Date;
  subscriptionActive: boolean;
}

export function shouldShowDay14Nudge(
  conditions: Day14NudgeConditions
): boolean {
  // Must be day 14
  if (conditions.daysSinceInstall !== 14) {
    return false;
  }

  // Must be engaged
  const isEngaged = 
    conditions.outfitsGenerated >= 2 || 
    conditions.closetRevisited;
  
  if (!isEngaged) {
    return false;
  }

  // Must be recently active
  const daysSinceLastOpen = getDaysSince(conditions.lastOpenedDate);
  if (daysSinceLastOpen > 7) {
    return false;
  }

  // Should have active subscription (or trial)
  if (!conditions.subscriptionActive) {
    return false;
  }

  return true;
}
```

### Banner Component

```typescript
export function Day14RetentionBanner({ onDismiss }) {
  return (
    <View style={styles.banner}>
      <TouchableOpacity 
        style={styles.dismissButton} 
        onPress={onDismiss}
      >
        <Text style={styles.dismissIcon}>×</Text>
      </TouchableOpacity>

      <Text style={styles.header}>
        Your wardrobe is starting to work together
      </Text>

      <Text style={styles.body}>
        Styled has been learning your preferences and refining how pieces work together. This gets better the longer you use it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#DED7CF',
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissIcon: {
    fontSize: 28,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  header: {
    fontSize: 18,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 8,
    paddingRight: 32,
  },
  body: {
    fontSize: 15,
    color: '#5E5A55',
    lineHeight: 22,
  },
});
```

---

## Timing Strategy

### Day 14 (Recommended)
- Post-trial for most users
- Post-conversion settled
- Habit forming period
- Not too early, not too late

### Alternative: Day 21
- More time to see value
- Stronger habit formation
- Test against Day 14

---

## Success Metrics

### Good Signs
- ✅ Continued engagement after nudge
- ✅ Low dismissal rate (<30%)
- ✅ Positive sentiment
- ✅ Increased usage in following week

### Warning Signs
- ⚠️ High dismissal rate (>50%)
- ⚠️ Decreased engagement after nudge
- ⚠️ Complaints about spam
- ⚠️ Churn spike after nudge

---

## What NOT to Say

### ❌ Don't Mention Payment
```
❌ "Thanks for subscribing!"
❌ "Your Plus membership is active"
❌ "You're getting great value for $8.99"
❌ "Keep your subscription active"
```

### ❌ Don't Create Anxiety
```
❌ "Don't lose your progress"
❌ "Keep your streak going"
❌ "You've invested 2 weeks"
```

### ❌ Don't Upsell
```
❌ "Upgrade to Premium for more"
❌ "Unlock advanced features"
❌ "See what you're missing"
```

---

## Copy Principles

### ✅ Do:
- Focus on value received
- Emphasize improvement over time
- Reference their specific usage
- Build confidence
- Encourage continued use

### ❌ Don't:
- Mention payment or subscription
- Create urgency or anxiety
- Upsell to higher tier
- Guilt trip
- Spam with multiple messages

---

## Remember

**Day 14 is about reinforcing value, not reminding them they're paying.**

Users should think:
- ✅ "This is working for me"
- ✅ "It's getting better"
- ✅ "I'm glad I'm using this"

Not:
- ❌ "Oh right, I'm paying for this"
- ❌ "Is this worth the money?"
- ❌ "Should I cancel?"

**Reinforce value. Build habit. Stay silent about payment.**
