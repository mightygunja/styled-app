# Upgrade Without Resentment

**Goal: Users upgrade because they want more value, not because they feel blocked.**

---

## Core Principle

**Show value delivered, then offer to deliver more.**

Never:
- ❌ "Upgrade to unlock features"
- ❌ "This feature is locked"
- ❌ "Premium users only"
- ❌ "You need to upgrade"

Always:
- ✅ "Based on your style preferences, Styled can keep refining this"
- ✅ "We can do even more for you"
- ✅ "Keep refining your style"
- ✅ "Deeper personalization"

---

## Upgrade Triggers

### 1. Free Outfit Limit (Primary)

**When:** User generates 3rd outfit
**Feeling:** "I've gotten value, I want more"
**Copy:**
```
You're getting the hang of this!

Based on [your style preferences], Styled can keep refining this.

Try free for 7 days
Then $8.99/month • Cancel anytime
```

**Not:**
```
You've reached your limit
Upgrade to unlock unlimited outfits
```

### 2. Trend Translation (Plus Feature)

**When:** User taps on trend translation feature
**Feeling:** "This looks useful for me"
**Copy:**
```
Based on your [minimal/classic] style, we can translate trends into looks that work for you.

Try Plus free for 7 days
```

**Not:**
```
This feature requires Plus
Upgrade to unlock
```

### 3. Closet Health (Plus Feature)

**When:** User taps on blurred closet health
**Feeling:** "I want to see my insights"
**Copy:**
```
Your wardrobe is working together. 
Want to see how?

Unlock insights about your wardrobe's versatility and style alignment.

Try Plus free for 7 days
```

**Not:**
```
Closet Health is a Plus feature
Upgrade to view
```

---

## Copy Pattern

### Template:
```
[Acknowledgment of value received]

Based on [their specific style preferences], Styled can [specific benefit for them].

[7-day free trial offer]
```

### Examples:

**For minimal/classic user:**
```
You're getting the hang of this!

Based on your minimal and classic style, Styled can keep refining outfits that feel authentically you.

Try free for 7 days
```

**For bold/creative user:**
```
You're getting the hang of this!

Based on your bold and creative style, Styled can keep exploring combinations that express your personality.

Try free for 7 days
```

**For work-focused user:**
```
You're getting the hang of this!

Based on your 60% work wardrobe needs, Styled can keep creating professional looks that work for your lifestyle.

Try free for 7 days
```

---

## What Makes This Work

### 1. Acknowledge Value Delivered
"You're getting the hang of this!" = You've already gotten value

### 2. Reference Their Specific Preferences
"Based on your [style]" = We know YOU, not generic

### 3. Frame as Continuation
"Keep refining" = More of what's working, not new features

### 4. Offer Trial
"Try free for 7 days" = No risk, experience first

### 5. Easy Exit
"Maybe later" button = No pressure

---

## Benefits Copy (Value-Focused)

### Don't Say:
- ❌ "Unlimited outfits" (feature-focused)
- ❌ "Full Style DNA" (technical)
- ❌ "Advanced analytics" (jargon)

### Do Say:
- ✅ "Keep refining your style" (benefit-focused)
- ✅ "Deeper personalization" (outcome)
- ✅ "See what's working" (value)

---

## Implementation

### SoftPaywall Component

```typescript
<SoftPaywall
  visible={showPaywall}
  onClose={() => setShowPaywall(false)}
  onUpgrade={() => navigation.navigate('Paywall')}
  userStylePreferences="your minimal and classic style"
/>
```

**Key Props:**
- `userStylePreferences` - Reference their actual StyleDNA
- `onClose` - Easy "Maybe later" exit
- `onUpgrade` - Leads to trial, not hard paywall

### Copy Personalization

```typescript
function getPersonalizedUpgradeCopy(styleDNA: StyleDNA): string {
  const archetypes = styleDNA.styleArchetypes.join(' and ');
  return `Based on your ${archetypes} style, Styled can keep refining this.`;
}
```

---

## Upgrade Triggers (Technical)

### Free Outfit Limit
```typescript
if (tier === 'free' && outfitCount >= 3) {
  setShowPaywall(true);
}
```

### Feature Access
```typescript
if (!FEATURES.trendTranslation.includes(tier)) {
  showUpgradePrompt({
    feature: 'Trend Translation',
    message: 'Based on your style, we can translate trends into looks that work for you.',
  });
}
```

### Closet Health
```typescript
if (tier === 'free') {
  return (
    <ClosetHealthTeaser
      tier="free"
      onUpgrade={() => navigation.navigate('Paywall')}
    />
  );
}
```

---

## Measuring Success

### Good Signs:
- ✅ High trial conversion rate (>40%)
- ✅ Low paywall bounce rate (<30%)
- ✅ Positive reviews mentioning value
- ✅ Users say "worth it" not "forced to upgrade"

### Warning Signs:
- ⚠️ High paywall dismissal rate
- ⚠️ Complaints about being "blocked"
- ⚠️ Low trial start rate
- ⚠️ Reviews mention "paywall" negatively

---

## A/B Test Ideas

### Copy Variations:
- A: "Based on your style preferences, Styled can keep refining this"
- B: "We can do even more for your [style] wardrobe"
- C: "Keep building outfits that work for you"

### CTA Variations:
- A: "Start Free Trial"
- B: "Try Plus Free"
- C: "Continue with Plus"

### Trial Duration:
- A: 7 days (standard)
- B: 14 days (longer trial)
- C: 3 days (shorter trial)

---

## Remember

**Users upgrade when they:**
1. Have already received value
2. Want MORE of that value
3. Feel understood (personalized copy)
4. Can try risk-free (7-day trial)
5. Don't feel blocked or forced

**The goal is "I want this" not "I need this to continue."**

---

## Examples in Context

### After 3rd Outfit:
```
[User generates 3rd outfit]
[Outfit appears with explanation]
[Soft paywall slides up from bottom]

"You're getting the hang of this!

Based on your minimal and classic style, 
Styled can keep refining this.

Try free for 7 days
Then $8.99/month • Cancel anytime

[Start Free Trial]
[Maybe later]"
```

### Tapping Closet Health:
```
[User taps blurred Closet Health card]

"Your wardrobe is working together.

Based on your style preferences, we can show you 
exactly how your pieces complement each other.

Try Plus free for 7 days

[Start Free Trial]
[Not now]"
```

---

**Upgrade without resentment = Show value, offer more, make it easy.**
