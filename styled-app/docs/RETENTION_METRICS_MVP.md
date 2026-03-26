# Retention Metrics to Watch (MVP)

**Realistic targets for a new fashion app. Don't aim for unicorn metrics on Day 1.**

---

## Core Retention Metrics

| Metric | Target | Industry Benchmark | Notes |
|--------|--------|-------------------|-------|
| **Day 7 retention** | 30–40% | 20–30% | Above average if hit |
| **Day 30 retention** | 15–20% | 10–15% | Strong for MVP |
| **Free → Plus** | 5–8% | 2–5% | Excellent conversion |
| **Plus → Premium** | 1–2% | 0.5–1% | Premium is niche |

---

## Why These Targets Are Realistic

### Day 7 Retention: 30–40%

**What this means:**
- 3-4 out of 10 users return after a week
- Industry average is 20-30%
- Target is slightly above average

**How to hit it:**
- ✅ Complete StyleDNA onboarding (builds investment)
- ✅ Generate 3 free outfits (show value)
- ✅ "Why this works" explanations (build trust)
- ✅ 1 optional notification max (no spam)

**Warning signs:**
- ⚠️ <25% = Onboarding too complex
- ⚠️ <20% = Value not clear
- ⚠️ <15% = Fundamental product issue

### Day 30 Retention: 15–20%

**What this means:**
- 1.5-2 out of 10 users still active after a month
- Industry average is 10-15%
- Target is above average

**How to hit it:**
- ✅ Habit formation (Style Me Today)
- ✅ Sparse closet handling (no shame)
- ✅ Soft paywall after value (not before)
- ✅ Monthly insights (Plus users)

**Warning signs:**
- ⚠️ <12% = Habit not forming
- ⚠️ <10% = Losing to competitors
- ⚠️ <8% = Product-market fit issue

### Free → Plus: 5–8%

**What this means:**
- 5-8 out of 100 free users upgrade
- Industry average is 2-5%
- Target is excellent conversion

**How to hit it:**
- ✅ 7-day free trial (try before buy)
- ✅ Value-based paywall copy (not feature blocking)
- ✅ Show value first (3 free outfits)
- ✅ Reference their style preferences

**Warning signs:**
- ⚠️ <3% = Paywall too early
- ⚠️ <2% = Value not clear
- ⚠️ <1% = Pricing too high

### Plus → Premium: 1–2%

**What this means:**
- 1-2 out of 100 Plus users upgrade to Premium
- Industry average is 0.5-1%
- Target is strong for premium tier

**How to hit it:**
- ✅ Monthly insights with stylist tease
- ✅ Show Premium value clearly
- ✅ Natural upgrade path
- ✅ Not pushy, just available

**Warning signs:**
- ⚠️ <0.5% = Premium value unclear
- ⚠️ <0.3% = Price too high
- ⚠️ <0.1% = Feature not compelling

---

## Tracking Implementation

### Week 1: Basic Tracking
```typescript
interface RetentionMetrics {
  day7Retention: number;  // % of users who return on Day 7
  day30Retention: number; // % of users who return on Day 30
  freeToPlus: number;     // % of free users who upgrade
  plusToPremium: number;  // % of Plus users who upgrade
}
```

### Week 2: Cohort Analysis
```typescript
interface CohortMetrics {
  cohortDate: Date;       // Sign-up date
  totalUsers: number;     // Users in cohort
  day7Active: number;     // Active on Day 7
  day30Active: number;    // Active on Day 30
  conversions: {
    freeToPlus: number;
    plusToPremium: number;
  };
}
```

### Week 3: Funnel Tracking
```typescript
interface ConversionFunnel {
  signups: number;
  onboardingComplete: number;
  firstOutfitGenerated: number;
  thirdOutfitGenerated: number;
  paywallShown: number;
  trialStarted: number;
  trialConverted: number;
}
```

---

## What Good Looks Like

### Month 1 (MVP Launch)
- Day 7: 25-30% (below target, but acceptable)
- Day 30: 12-15% (below target, but acceptable)
- Free → Plus: 3-5% (below target, but acceptable)
- Plus → Premium: 0.5-1% (at target)

**Focus:** Product-market fit, not optimization

### Month 3 (Post-Launch)
- Day 7: 30-35% (at target)
- Day 30: 15-18% (at target)
- Free → Plus: 5-7% (at target)
- Plus → Premium: 1-1.5% (at target)

**Focus:** Optimization and iteration

### Month 6 (Mature Product)
- Day 7: 35-40% (at/above target)
- Day 30: 18-20% (at/above target)
- Free → Plus: 7-8% (at/above target)
- Plus → Premium: 1.5-2% (at/above target)

**Focus:** Scale and growth

---

## Red Flags

### Critical Issues (Fix Immediately)
- 🚨 Day 7 retention <20%
- 🚨 Day 30 retention <10%
- 🚨 Free → Plus <2%
- 🚨 Churn rate >10% monthly

### Warning Signs (Monitor Closely)
- ⚠️ Day 7 retention declining week-over-week
- ⚠️ Day 30 retention not improving
- ⚠️ Conversion rate stagnant
- ⚠️ High trial start but low trial conversion

---

## Benchmarking Against Competitors

### Fashion Apps (Industry Average)
- Day 7: 20-30%
- Day 30: 10-15%
- Free → Paid: 2-5%

### Top Performers (Aspirational)
- Day 7: 40-50%
- Day 30: 20-30%
- Free → Paid: 8-12%

### Styled Targets (Realistic)
- Day 7: 30-40% (above average)
- Day 30: 15-20% (above average)
- Free → Plus: 5-8% (excellent)
- Plus → Premium: 1-2% (strong)

---

## Optimization Priorities

### If Day 7 Retention Low:
1. Simplify onboarding
2. Show value faster
3. Reduce friction
4. Improve first outfit quality

### If Day 30 Retention Low:
1. Strengthen habit formation
2. Add monthly insights
3. Improve outfit variety
4. Reduce notification spam

### If Free → Plus Low:
1. Show more value before paywall
2. Improve paywall copy
3. Extend free trial
4. Reference user's style more

### If Plus → Premium Low:
1. Clarify Premium value
2. Add stylist review tease
3. Show success stories
4. Reduce price (test)

---

## Trial Health Metrics (Critical)

| Metric | Healthy Range | Warning | Critical |
|--------|--------------|---------|----------|
| **Trial → Paid conversion** | 40–60% | 30–40% | <30% |
| **Trial cancellation before Day 7** | <30% | 30–40% | >40% |
| **Trial churn reviews** | ~0 | 1–2 | >2 |

**If conversion <40%:** Onboarding or value timing issue  
**If Day 1 cancellations spike:** Paywall too early

## Analytics to Track

### User Behavior
- Onboarding completion rate
- Outfits generated per user
- Outfits marked as worn
- Closet items added
- Time spent in app

### Engagement
- Daily active users (DAU)
- Weekly active users (WAU)
- Monthly active users (MAU)
- Session length
- Sessions per user

### Conversion
- Paywall view rate
- Trial start rate
- Trial completion rate
- Trial conversion rate
- Upgrade rate

### Trial Health
- Trial conversion by day (Day 1-7)
- Trial cancellation timing
- Trial engagement (outfits during trial)
- Trial reminder effectiveness

### Retention
- Day 1, 3, 7, 14, 30 retention
- Cohort retention curves
- Churn rate
- Resurrection rate

---

## Success Criteria

**MVP is successful if:**
- ✅ Day 7 retention >30%
- ✅ Day 30 retention >15%
- ✅ Free → Plus >5%
- ✅ Plus → Premium >1%
- ✅ Monthly churn <5%
- ✅ User feedback positive
- ✅ Word-of-mouth referrals

**MVP needs work if:**
- ⚠️ Any metric below target
- ⚠️ Metrics not improving
- ⚠️ High churn rate
- ⚠️ Negative feedback

---

## Remember

**These are MVP targets, not unicorn metrics.**

Don't expect 80% Day 7 retention on launch. Focus on:
1. Building the right product
2. Delivering clear value
3. Creating good habits
4. Iterating based on data

**Hit these targets and you have a solid foundation for growth.**
