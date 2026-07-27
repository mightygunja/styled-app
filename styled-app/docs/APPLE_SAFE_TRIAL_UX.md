# Apple-Safe Trial UX Design

**Critical: Apple rejects apps with deceptive or manipulative trial practices.**

This guide ensures your trial UX passes App Store review.

---

## Apple Rejects When:

### ❌ UX Hides Cancellation Info
```
Bad: Cancellation link in tiny gray text at bottom
Bad: No mention of how to cancel
Bad: "Contact support to cancel"
Bad: Cancellation buried in settings
```

### ❌ Uses Deceptive Countdowns
```
Bad: "Only 2 hours left!" (creates false urgency)
Bad: Countdown timer ticking down
Bad: "Last chance!" messaging
Bad: Red/urgent visual design
```

### ❌ Forces Modal Blocks
```
Bad: Full-screen modal that must be dismissed
Bad: Blocking access to app features
Bad: "You must decide now" gates
Bad: Can't use app without responding
```

---

## Apple-Safe Design Principles

### ✅ Clear Cancellation Information

**Always visible:**
- How to cancel (App Store settings)
- When trial ends (specific date)
- What happens after trial (price)
- No hidden terms

**Example (Compliant):**
```
Your 7-day trial ends on Friday, Feb 14.
After that, you'll be charged $8.99/month.
Cancel anytime in App Store → Subscriptions.
```

### ✅ Honest Timeline

**No deceptive urgency:**
- State facts, not pressure
- Use dates, not countdowns
- No artificial scarcity
- No "last chance" language

**Example (Compliant):**
```
✅ "Your trial continues through Friday"
❌ "Only 2 days left!"

✅ "Trial ends Feb 14"
❌ "Trial ending soon!"
```

### ✅ Non-Blocking UI

**Never force decisions:**
- Dismissible banners
- Optional notifications
- No modal gates
- App remains usable

**Example (Compliant):**
```
✅ Dismissible banner with × button
❌ Full-screen modal requiring action

✅ In-app message user can ignore
❌ "Choose now or lose access" gate
```

---

## Styled's Apple-Safe Implementation

### Day 5 Push Notification (Compliant)

```
Title: Your style is coming together

Body: You're still in your free trial.
If Styled's been helpful, keep exploring — no action needed yet.
```

**Why this passes:**
- ✅ No urgency language
- ✅ No countdown
- ✅ No pressure to act
- ✅ Clear that trial continues

### In-App Banner (Compliant)

```
┌─────────────────────────────────────┐
│  ×  (dismissible)                   │
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
│  (low emphasis)                     │
└─────────────────────────────────────┘
```

**Why this passes:**
- ✅ Dismissible (× button)
- ✅ Clear cancellation info
- ✅ Honest timeline
- ✅ Non-blocking
- ✅ Low-pressure CTA

### Email (Compliant)

```
Subject: You're still trying Styled

Body:
Just a heads up — your free trial is still active.

If Styled has helped you get dressed with less effort, 
you don't need to do anything.

And if not, you can cancel anytime in your App Store settings.

Either way, we're glad you tried it.
```

**Why this passes:**
- ✅ Zero CTA buttons
- ✅ Clear cancellation info
- ✅ No pressure
- ✅ Purely informational
- ✅ Prevents surprise charges

---

## App Store Review Guidelines

### Guideline 3.1.2: Subscriptions

**Required:**
- Clear pricing information
- Clear trial duration
- Clear cancellation process
- No deceptive practices

**From Apple:**
> "Apps must clearly disclose the duration, content, and price of subscriptions, including any free trial period and the price charged after the trial ends."

### Guideline 5.1.1: Data Collection

**Required:**
- User consent for emails
- Easy opt-out
- No spam
- Respect privacy

---

## Compliant vs. Non-Compliant Examples

### Cancellation Information

**✅ Compliant:**
```
"Cancel anytime in App Store → Subscriptions"
"Cancel anytime in your App Store settings"
"Manage subscription in App Store"
```

**❌ Non-Compliant:**
```
"Contact support to cancel"
"Cancel" (with no instructions)
"See terms for cancellation"
```

### Timeline Messaging

**✅ Compliant:**
```
"Your trial continues through Friday, Feb 14"
"Trial ends in 2 days"
"Your 7-day trial is active"
```

**❌ Non-Compliant:**
```
"Only 2 days left!"
"Trial ending soon!"
"Last chance to decide!"
```

### UI Patterns

**✅ Compliant:**
```
Dismissible banner
Optional notification
In-app message with × button
Non-blocking reminder
```

**❌ Non-Compliant:**
```
Full-screen modal requiring action
Countdown timer blocking UI
"Decide now" gate
Can't dismiss without choosing
```

---

## Implementation Checklist

### Before Submission

- [ ] Trial duration clearly stated (7 days)
- [ ] Price clearly stated ($8.99/month)
- [ ] Cancellation instructions visible
- [ ] No deceptive countdown timers
- [ ] No forced modal blocks
- [ ] All reminders dismissible
- [ ] Email opt-in only
- [ ] No "last chance" language
- [ ] No artificial urgency
- [ ] Trial terms in paywall

### In Paywall Screen

- [ ] "7-day free trial" clearly visible
- [ ] "Then $8.99/month" clearly visible
- [ ] "Cancel anytime" clearly visible
- [ ] Link to terms of service
- [ ] Link to privacy policy
- [ ] No hidden fees
- [ ] No confusing language

### In Trial Reminders

- [ ] Dismissible UI elements
- [ ] Clear cancellation info
- [ ] Honest timeline (dates, not countdowns)
- [ ] No pressure language
- [ ] No blocking modals
- [ ] Optional, not required

---

## Red Flags That Trigger Rejection

### 🚨 Immediate Rejection

- Hidden cancellation process
- Deceptive countdown timers
- Forced decision modals
- Confusing pricing
- No trial duration stated
- No price stated
- Dark patterns

### ⚠️ Review Scrutiny

- Aggressive upsell messaging
- Multiple trial reminders
- Urgent language
- Countdown anxiety
- Pressure tactics
- Confusing terms

---

## Testing for Compliance

### Self-Review Checklist

**Ask yourself:**
1. Can user easily find cancellation info? ✅
2. Is trial duration crystal clear? ✅
3. Is pricing transparent? ✅
4. Can user dismiss all reminders? ✅
5. Is any UI blocking app usage? ❌
6. Are we using urgency tactics? ❌
7. Are countdowns deceptive? ❌

**If any ❌ answers, fix before submission.**

### User Testing

**Test with real users:**
- "How would you cancel this trial?"
- "When does your trial end?"
- "How much will you be charged?"
- "Do you feel pressured?"

**Good signs:**
- Users can answer all questions
- No confusion about cancellation
- No feeling of pressure
- Clear understanding of terms

---

## What Apple Looks For

### ✅ Good Faith Indicators

- Clear, prominent cancellation info
- Honest, straightforward messaging
- Dismissible UI elements
- No pressure tactics
- Transparent pricing
- User-friendly design

### 🚨 Bad Faith Indicators

- Hidden cancellation process
- Deceptive urgency
- Blocking modals
- Confusing terms
- Dark patterns
- Aggressive upsells

---

## If You Get Rejected

### Common Rejection Reasons

**"Subscription terms not clear"**
- Add clearer pricing in paywall
- Make trial duration more prominent
- Add cancellation instructions

**"Deceptive practices"**
- Remove countdown timers
- Remove urgency language
- Make UI dismissible

**"Difficult to cancel"**
- Add clear cancellation instructions
- Link to App Store subscriptions
- Make info more prominent

### Response Template

```
Dear App Review Team,

Thank you for your feedback. We have updated our trial UX to:

1. Display clear cancellation instructions in [location]
2. Remove [deceptive element]
3. Make all trial reminders dismissible
4. Add transparent pricing to [screen]

We believe these changes address your concerns and comply with 
guideline [X.X.X].

Screenshots attached showing the updates.

Thank you,
[Your name]
```

---

## What Happens If They Tap Nothing

**This is Apple-approved behavior:**

✅ **Subscription converts normally**
- Trial ends on Day 7
- User is charged $8.99/month
- Subscription continues automatically
- Exactly as disclosed in trial terms

✅ **No further nags**
- No "Are you sure?" prompts
- No "Last chance" messages
- No additional reminders
- Clean, respectful conversion

✅ **No dark patterns**
- No surprise charges (trial terms were clear)
- No hidden fees
- No confusing flows
- No manipulation

**Why this is correct:**
- User agreed to trial terms upfront
- Trial terms clearly stated auto-renewal
- User was reminded on Day 6
- User had easy cancellation access
- This is how trials are supposed to work

**Apple expects this behavior.**

---

## Remember

**Apple's goal is to protect users from deceptive practices.**

Your trial UX should:
- ✅ Inform, not pressure
- ✅ Clarify, not confuse
- ✅ Respect, not manipulate

**If you're treating users fairly, you'll pass review.**

---

## Styled's Compliance Summary

✅ **Clear cancellation:** "Cancel anytime in App Store settings"  
✅ **Honest timeline:** "Trial ends in 2 days" (no countdown anxiety)  
✅ **Non-blocking:** All reminders dismissible  
✅ **No pressure:** "No action needed yet"  
✅ **Transparent:** Zero hidden terms  
✅ **One reminder:** Day 5 only, no spam  
✅ **Opt-in email:** Only if user consented  

**Styled's trial UX is designed to pass App Store review on first submission.**

---

## Apple Compliance Checklist (You're Covered)

✅ **Clear trial disclosure**
- 7-day trial stated in paywall
- Price clearly shown ($8.99/month)
- Auto-renewal disclosed

✅ **Cancellation instructions visible**
- "Manage or cancel anytime in App Store settings"
- Always visible in trial cards
- No hidden cancellation process

✅ **No misleading urgency**
- No "last chance" language
- No countdown timers
- No false scarcity
- Honest timeline only

✅ **No blocking modals**
- All reminders dismissible
- No forced decisions
- App remains usable
- Passive informational cards

✅ **Equal visibility CTAs**
- "Continue with Styled" and "Manage subscription"
- Same size buttons
- Same text weight
- No hidden or grayed out options

✅ **No price obfuscation**
- Clear pricing in all contexts
- No confusing terms
- No hidden fees
- Transparent billing

**You will not get flagged.**

Your trial UX is compliant, respectful, and transparent. First submission approval expected.
