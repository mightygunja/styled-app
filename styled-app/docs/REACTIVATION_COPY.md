# Reactivation Copy (Day 45–60)

**🎯 Goal: Invite, not persuade**  
**📏 Frequency: One message only**  
**📬 Channels: Push or Email (not both unless opted-in)**

---

## Option A: Push Notification (Best Default)

### Title
```
Your style is still here
```

### Body
```
If getting dressed has felt harder lately, Styled can help — no pressure, no rush.
```

### Why This Works

✅ **Invites, doesn't persuade**
- "Your style is still here" = welcoming
- "If getting dressed has felt harder" = empathy
- "No pressure, no rush" = respects their space

✅ **Acknowledges reality**
- Doesn't pretend they didn't leave
- Validates potential pain point
- Offers help without pushing

✅ **No guilt trip**
- No "we miss you"
- No "come back"
- No urgency
- Just availability

---

## Trigger Conditions

**Day 45-60 since last activity**

**Must meet ALL:**
- User has not opened app in 45+ days
- User previously had engagement (3+ outfits generated)
- Subscription is canceled or expired
- User has not opted out of notifications
- No previous reactivation message sent

**Why Day 45-60:**
- Enough time to miss the value
- Not too soon (respects their decision)
- Not too late (still remember the app)
- One attempt only

---

## Option B: Email (If Opted-In)

### Subject
```
If you want help getting dressed again
```

### Body
```
Just a note — Styled is still here if you want a little less friction when getting dressed.

No updates required, no pressure to resubscribe.

Open the app whenever it feels useful again.
```

### Why This Works

✅ **No CTA button**
- Apple + users trust this restraint
- Not trying to drive action
- Just making them aware
- Maximum respect

✅ **Acknowledges their autonomy**
- "If you want" = their choice
- "No pressure to resubscribe" = explicit
- "Whenever it feels useful" = on their terms

✅ **Minimal friction message**
- Short, simple
- No sales pitch
- Just availability
- Professional restraint

---

## Option C: In-App (If They Reopen Without Subscription)

### Copy
```
Welcome back.
Styled still works with what you already own.
```

### Design
- Subtle banner at top of home screen
- Dismissible
- Appears once only
- Neutral styling
- No CTA

### Why This Works

✅ **Minimal, welcoming**
- "Welcome back" = simple acknowledgment
- No "we missed you"
- No celebration

✅ **Reminds of core value**
- "Works with what you already own" = no shopping pressure
- Reinforces product benefit
- Not about subscription

✅ **No pressure to resubscribe**
- Doesn't mention subscription
- Doesn't mention pricing
- Just welcomes them back
- They can use free tier

---

## When NOT to Send

❌ **Don't send if:**
- User explicitly deleted account
- User left negative review
- User requested no contact
- User churned within first 7 days (never engaged)
- User has been inactive 90+ days (too late)

---

## Implementation

```typescript
interface ReactivationConditions {
  daysSinceLastActivity: number;
  previousEngagement: number; // outfits generated
  subscriptionStatus: 'canceled' | 'expired' | 'active';
  notificationsEnabled: boolean;
  reactivationMessageSent: boolean;
  accountDeleted: boolean;
}

export function shouldSendReactivation(
  conditions: ReactivationConditions
): boolean {
  // Must be in reactivation window
  if (conditions.daysSinceLastActivity < 45 || 
      conditions.daysSinceLastActivity > 60) {
    return false;
  }

  // Must have previous engagement
  if (conditions.previousEngagement < 3) {
    return false;
  }

  // Must not be active subscriber
  if (conditions.subscriptionStatus === 'active') {
    return false;
  }

  // Must have notifications enabled
  if (!conditions.notificationsEnabled) {
    return false;
  }

  // Must not have sent before
  if (conditions.reactivationMessageSent) {
    return false;
  }

  // Must not have deleted account
  if (conditions.accountDeleted) {
    return false;
  }

  return true;
}
```

---

## Alternative Variations (A/B Test)

### Variation A (Recommended)
```
Title: Your style is still here
Body: If getting dressed has felt harder lately, Styled can help — no pressure, no rush.
```

### Variation B (More Direct)
```
Title: We're still here
Body: Styled is ready when you are. Your closet and Style DNA are waiting.
```

### Variation C (Value-Focused)
```
Title: Your wardrobe is waiting
Body: All your style preferences and closet items are still here, ready to help you get dressed.
```

---

## What NOT to Say

### ❌ Don't Guilt Trip
```
❌ "We miss you!"
❌ "Come back to Styled"
❌ "Your account is about to expire"
❌ "Don't lose your progress"
```

### ❌ Don't Offer Discounts
```
❌ "50% off to come back"
❌ "Special win-back offer"
❌ "Limited time deal"
```

### ❌ Don't Create Urgency
```
❌ "Last chance to reactivate"
❌ "Your data will be deleted soon"
❌ "Act now or lose access"
```

---

## Success Metrics

### Good Signs
- ✅ 5-10% reactivation rate
- ✅ Reactivated users stay 30+ days
- ✅ Positive sentiment
- ✅ Low opt-out rate (<2%)

### Warning Signs
- ⚠️ High opt-out rate (>5%)
- ⚠️ Complaints about spam
- ⚠️ Reactivated users churn immediately
- ⚠️ Negative reviews mentioning message

---

## Follow-Up Strategy

### If They Reactivate
- Welcome back quietly
- No celebration
- No "we're glad you're back"
- Just normal app experience

### If They Don't Reactivate
- Respect their decision
- No follow-up messages
- No additional attempts
- Let them go gracefully

---

## Copy Principles

### ✅ Do:
- Acknowledge they left
- Offer help without pressure
- Remind them their data is safe
- Keep it brief
- One message only

### ❌ Don't:
- Guilt trip
- Offer discounts
- Create urgency
- Send multiple messages
- Beg them to come back

---

## Remember

**This is an invitation, not a sales pitch.**

Users should think:
- ✅ "Oh, that's nice. Maybe I'll check it out."
- ✅ "They're not pushy. I appreciate that."
- ✅ "My stuff is still there if I need it."

Not:
- ❌ "Ugh, another spam message."
- ❌ "They're desperate for me to come back."
- ❌ "I feel guilty for leaving."

**Invite once. Respect their decision. Move on.**
