# Trial Reminder Copy (Non-Spammy)

**One reminder only. No urgency. No anxiety. Just clarity.**

---

## Rules We're Following

✅ **One reminder only** - Day 5 of 7-day trial  
✅ **No urgency language** - No "last chance", "don't miss out"  
✅ **No price mention** - They already know the price  
✅ **No countdown anxiety** - No "only 2 days left!"  
✅ **Clear cancellation transparency** - Easy to cancel, no tricks

---

## Trial Day 5 Reminder

### Push Notification (Primary)

**Title:**
```
Your style is coming together
```

**Body:**
```
You're still in your free trial.
If Styled's been helpful, keep exploring — no action needed yet.
```

**Why this works:**
- ✅ Reassures instead of pressures
- ✅ Reminds without triggering avoidance
- ✅ Signals trust
- ✅ "No action needed yet" = no anxiety

**Not:**
```
❌ "Only 2 days left!"
❌ "Don't miss out on unlimited outfits"
❌ "Last chance to save"
❌ "Trial ending soon"
```

---

## In-App Banner (Appears Once, Dismissible)

**When user opens app on Day 5:**

```
┌─────────────────────────────────────┐
│  ×                                  │
│                                     │
│  You're in your free trial.         │
│  Styled will keep refining outfits  │
│  based on your Style DNA.           │
│                                     │
│  Trial ends in 2 days.              │
│  Cancel anytime in App Store        │
│  settings.                          │
│                                     │
│  [View membership options]          │
│  (optional, low emphasis)           │
│                                     │
└─────────────────────────────────────┘
```

**Key elements:**
- ✅ Dismissible (× button top right)
- ✅ Appears once only
- ✅ Primary copy: Value-focused ("keep refining")
- ✅ Secondary copy: Clear timeline + cancellation
- ✅ CTA: Optional, low emphasis
- ✅ No urgency, no pressure

---

## Email (Optional — Only If User Opted In)

**Subject:**
```
You're still trying Styled
```

**Body:**
```
Just a heads up — your free trial is still active.

If Styled has helped you get dressed with less effort, you don't need to do anything.

And if not, you can cancel anytime in your App Store settings.

Either way, we're glad you tried it.
```

**Zero CTA buttons.**

**Why this exists:**
- Prevents surprise charges (Apple loves this)
- Purely informational
- No sales pitch
- No urgency
- Just transparency

**Not:**
```
❌ "Your trial is ending soon!"
❌ "Don't lose access to unlimited outfits"
❌ "Act now to keep your subscription"
❌ [Upgrade Now] button
```

---

## What Makes This Work

### 1. Shows Value Delivered
"You've created 8 outfits this week"
- Reminds them of value received
- Not a sales pitch
- Just facts

### 2. Clear Timeline
"Your trial continues through [Day]"
- No countdown anxiety
- Just clear information
- Respectful of their time

### 3. Cancellation Transparency
"Cancel anytime in Settings"
- No dark patterns
- No guilt trips
- Builds trust

### 4. No Urgency
- No "last chance"
- No "don't miss out"
- No artificial scarcity
- Just information

---

## Copy Variations (A/B Test)

### Variation A: Value Focus
```
You've created 8 outfits this week.
Your trial continues through Friday.
Cancel anytime in Settings.
```

### Variation B: Usage Focus
```
You've used Styled 5 times this week.
Your trial continues through Friday.
Cancel anytime in Settings.
```

### Variation C: Time Saved Focus
```
You've saved 20 minutes of decision time this week.
Your trial continues through Friday.
Cancel anytime in Settings.
```

---

## Timing Strategy

### When to Trigger: Day 6

**Only if:**
- ✅ Trial is active
- ✅ User opened the app at least once in the last 3 days

**Why Day 6:**
- One day before trial ends
- User has shown recent engagement
- Not too early, not spam
- Gives 1 day to decide

**Engagement Check:**
- If user hasn't opened app in 3+ days, skip reminder
- They're not engaged, reminder won't help
- Prevents spam to inactive users
- Respects their decision to disengage

### Never: Multiple Reminders
- ❌ Day 3, 5, and 6
- ❌ Daily countdowns
- ❌ Spam = distrust
- ❌ Reminders to inactive users

---

## Implementation

### Push Notification Code

```typescript
// Send on Day 5 of trial
export function getTrialReminderNotification(): NotificationContent {
  return {
    title: "Your style is coming together",
    body: "You're still in your free trial. If Styled's been helpful, keep exploring — no action needed yet.",
  };
}

// Only send if:
// - It's Day 6 of trial
// - Trial is still active
// - User opened app at least once in last 3 days
// - User has notifications enabled
// - Haven't sent reminder already

// Engagement check prevents spam to inactive users
export function shouldSendTrialReminder(
  trialDay: number,
  trialActive: boolean,
  lastOpenedDate: Date
): boolean {
  if (trialDay !== 6) return false;
  if (!trialActive) return false;
  
  const daysSinceLastOpen = getDaysSince(lastOpenedDate);
  if (daysSinceLastOpen > 3) return false; // User not engaged
  
  return true;
}

// Why this copy works:
// - Reassures instead of pressures
// - Reminds without triggering avoidance
// - Signals trust
// - "No action needed yet" removes anxiety
```

### UX Pattern: Passive Informational Card

**Placement:**
- Settings screen (always visible)
- OR bottom of Outfits screen (after content)
- **Not a modal, not blocking**

**Design (Day 6-7):**
```
┌─────────────────────────────────────┐
│  Trial ending soon                  │
│                                     │
│  Your free trial ends tomorrow.     │
│  Styled will continue with your     │
│  current plan unless you cancel.    │
│                                     │
│  [Manage in App Store]              │
└─────────────────────────────────────┘
```

**Design (Day 1-5):**
```
┌─────────────────────────────────────┐
│  Trial Status                       │
│                                     │
│  You're in your free trial.         │
│                                     │
│  [Manage in App Store]              │
└─────────────────────────────────────┘
```

**Key characteristics:**
- ✅ Passive (doesn't demand attention)
- ✅ Informational (just facts)
- ✅ Non-blocking (doesn't interrupt)
- ✅ Always accessible (in Settings)
- ✅ Low emphasis (subtle design)

**Why this works:**
- Users can check status anytime
- No interruption of workflow
- Respects user agency
- Apple-compliant (transparent)

### In-App Banner Code

```typescript
// Show banner on Day 6 when app opens (once only, dismissible)
export function TrialReminderBanner({ daysRemaining, onDismiss, onViewOptions }) {
  return (
    <View style={styles.banner}>
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Text style={styles.dismissIcon}>×</Text>
      </TouchableOpacity>

      <Text style={styles.primaryCopy}>
        You're in your free trial.{'\n'}
        Styled will keep refining outfits based on your Style DNA.
      </Text>

      <Text style={styles.secondaryCopy}>
        Trial ends in {daysRemaining} days.{'\n'}
        Cancel anytime in App Store settings.
      </Text>

      <TouchableOpacity 
        style={styles.ctaButton} 
        onPress={onViewOptions}
      >
        <Text style={styles.ctaText}>View membership options</Text>
      </TouchableOpacity>
    </View>
  );
}

// Styling notes:
// - primaryCopy: 16px, medium weight, prominent
// - secondaryCopy: 13px, regular weight, muted color
// - ctaButton: low emphasis (outline style, not filled)
// - dismissButton: top right corner, easy to tap
```

---

## What NOT to Do

### ❌ Countdown Anxiety
```
"Only 2 days left in your trial!"
"Your trial ends in 48 hours"
"Time is running out"
```

### ❌ Urgency Language
```
"Last chance to unlock unlimited outfits"
"Don't miss out on Plus features"
"Act now before your trial ends"
```

### ❌ Price Pressure
```
"Continue for just $8.99/month"
"Save 33% with annual billing"
"Limited time offer"
```

### ❌ Dark Patterns
```
"Cancel now and lose all your data"
"Your outfits will be deleted"
"You'll lose access forever"
```

---

## Success Metrics

### Good Signs
- ✅ Low opt-out rate (<5%)
- ✅ High trial completion (>70%)
- ✅ Positive feedback about reminder
- ✅ No complaints about spam

### Warning Signs
- ⚠️ High opt-out rate (>10%)
- ⚠️ Complaints about pressure
- ⚠️ Negative reviews mentioning reminder
- ⚠️ Users canceling immediately after reminder

---

## A/B Test Plan

### Test 1: Timing
- A: Day 5 reminder
- B: Day 6 reminder
- C: No reminder

**Measure:** Trial conversion rate

### Test 2: Copy Focus
- A: Value focus (outfits created)
- B: Usage focus (times used)
- C: Time saved focus

**Measure:** Engagement with reminder

### Test 3: Channel
- A: Push notification only
- B: In-app banner only
- C: Both

**Measure:** Opt-out rate + conversion

---

## What Happens If They Tap Nothing

**Apple-approved behavior:**

✅ **Subscription converts normally**
- Trial ends on Day 7
- User is charged $8.99/month as disclosed
- Subscription continues

✅ **No further nags**
- No additional reminders
- No "Are you sure?" prompts
- Clean conversion

✅ **No dark patterns**
- User agreed to terms upfront
- Terms clearly stated auto-renewal
- User was reminded on Day 6
- Cancellation was always easy

**This is correct behavior.**

Users who want to cancel will cancel. Users who don't take action have implicitly chosen to continue. This is how trials work, and Apple expects this.

---

## Remember

**One reminder. Clear information. No pressure.**

The goal is to inform, not to pressure. Users who see value will convert. Users who don't won't be convinced by urgency tactics.

**Respect builds trust. Trust builds retention.**
