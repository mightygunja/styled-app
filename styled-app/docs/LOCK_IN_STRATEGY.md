# Lock-In Strategy - Long-Term Retention

**Goal: Users can't imagine life without Styled after 3 months.**

---

## Core Principle

**Show them we're learning their style over time.**

The longer they use Styled, the better it gets. Make this visible and valuable.

---

## Monthly Mini-Insights (Plus Tier)

### Purpose
- Show we're paying attention to their actual behavior
- Validate their style choices
- Build trust through personalized observations
- Create "aha!" moments

### Examples

**Color Insights:**
- "You wear neutrals best when paired with structure."
- "Your go-to palette is neutral and versatile."
- "You gravitate toward earth tones in fall."

**Silhouette Insights:**
- "Your most-worn pieces have clean lines."
- "You gravitate toward comfortable, easy silhouettes."
- "You prefer pieces that define your shape."

**Styling Insights:**
- "You reach for layers on busy days."
- "Your weekday and weekend styles are distinct but cohesive."
- "You favor monochrome looks for important meetings."

### Requirements
- Minimum 5 worn outfits to generate
- Based on actual usage, not assumptions
- Always positive framing
- Specific, not generic

### Delivery
- Once per month (first week)
- In-app card (prominent placement)
- Optional push notification: "Your monthly style insight is ready"
- No email spam

---

## Premium Tease (For Plus Users)

### Copy
```
Want a stylist to review this with you?
```

### Purpose
- Show value of Premium tier
- Not pushy, just curious
- Positions Premium as next level
- Natural upgrade path

### Placement
- Below monthly insight card
- Subtle, not intrusive
- Only for Plus users
- Easy to dismiss

### When Tapped
```
Premium Upgrade Screen:

"Get expert stylist review of your monthly insights"

With Premium, a professional stylist will:
• Review your monthly style patterns
• Provide personalized recommendations
• Help you refine your wardrobe strategy
• Answer your style questions

Try Premium free for 7 days
Then $23.99/month

[Start Free Trial]
[Not now]
```

---

## Lock-In Mechanics

### Month 1: Foundation
- User completes StyleDNA
- Generates first outfits
- Marks outfits as worn
- **No insights yet** (need data)

### Month 2: First Insight
- System has 30 days of data
- Generate first monthly insight
- User sees: "We're learning your style"
- **Lock-in begins**

### Month 3: Pattern Recognition
- Second monthly insight
- More specific observations
- User thinks: "It really knows me"
- **Lock-in strengthens**

### Month 4+: Indispensable
- Consistent monthly insights
- User relies on observations
- Can't imagine not having this
- **Lock-in complete**

---

## Why This Works

### 1. Sunk Cost
- User has invested time building closet
- User has invested effort marking outfits
- User has built StyleDNA profile
- **Hard to start over elsewhere**

### 2. Data Moat
- Only Styled knows their actual wearing patterns
- Insights get better over time
- Competitor can't replicate this
- **Switching cost is high**

### 3. Emotional Connection
- Insights validate their choices
- Feels understood
- Personal relationship with app
- **Emotional lock-in**

### 4. Habit Formation
- Monthly insight becomes expected
- Part of their routine
- Look forward to it
- **Behavioral lock-in**

---

## Implementation

### Monthly Insight Generation

```typescript
import { generateMonthlyInsight } from '../services/monthlyInsights';
import MonthlyInsightCard from '../components/MonthlyInsightCard';

// Generate on first of month
const insight = generateMonthlyInsight(closet, styleDNA, history);

if (insight && tier !== 'free') {
  return (
    <MonthlyInsightCard
      insight={insight.insight}
      tier={tier}
      onStylistReview={() => navigation.navigate('PremiumUpgrade')}
    />
  );
}
```

### Insight Storage

```typescript
interface UserInsightHistory {
  userId: string;
  insights: {
    month: string; // "2026-02"
    insight: MonthlyInsight;
    viewed: boolean;
    viewedAt?: Date;
  }[];
}
```

### Notification (Optional)

```typescript
// Send on 1st of month, 9am
if (shouldSendInsightNotification(user)) {
  sendNotification({
    title: "Your monthly style insight is ready",
    body: "See what we learned about your style this month",
  });
}
```

---

## Tier Strategy

### Free Tier
- ❌ No monthly insights
- ❌ No stylist review
- ✅ Basic outfit generation
- **Upgrade incentive:** "Unlock monthly style insights"

### Plus Tier ($8.99/month)
- ✅ Monthly insights
- ✅ Premium tease
- ✅ Unlimited outfits
- **Upgrade incentive:** "Get stylist review"

### Premium Tier ($23.99/month)
- ✅ Monthly insights
- ✅ Stylist review included
- ✅ All Plus features
- **Lock-in complete**

---

## Measuring Lock-In

### Quantitative Metrics
- **Month 3 retention:** Target >50%
- **Month 6 retention:** Target >40%
- **Month 12 retention:** Target >30%
- **Insight engagement:** Target >80% view rate
- **Premium conversion:** Target >20% of Plus users

### Qualitative Signals
- ✅ "I look forward to my monthly insight"
- ✅ "It really knows my style"
- ✅ "I can't imagine not having this"
- ✅ "The insights are so accurate"

### Warning Signs
- ⚠️ Low insight view rate (<50%)
- ⚠️ Insights feel generic
- ⚠️ Users don't mark outfits as worn
- ⚠️ Month 3 retention <40%

---

## Content Strategy

### Insight Variety
- Rotate between color, silhouette, styling insights
- Never repeat same insight twice
- Always based on new data
- Keep fresh and interesting

### Insight Quality
- Specific > Generic
- Actionable > Observational
- Positive > Neutral
- Personal > Universal

### Examples of Good vs. Bad

**Good:**
- ✅ "You wear neutrals best when paired with structure."
- ✅ "Your most-worn pieces have clean lines."
- ✅ "You reach for layers on busy days."

**Bad:**
- ❌ "You like clothes." (too generic)
- ❌ "You should try more colors." (prescriptive)
- ❌ "Most people prefer..." (not personal)

---

## Premium Stylist Review (Future)

### What It Includes
- Monthly video call (15 min)
- Review of insights and patterns
- Personalized recommendations
- Q&A about style questions
- Wardrobe strategy session

### Positioning
- Not required, but valuable
- For users who want expert guidance
- Natural extension of insights
- Premium tier exclusive

---

## Success Criteria

**Lock-in is achieved when:**

1. ✅ Month 6 retention >40%
2. ✅ Users view insights within 24 hours
3. ✅ Users share insights with friends
4. ✅ Reviews mention "knows my style"
5. ✅ Low churn rate (<5% monthly)
6. ✅ High Premium conversion (>20%)
7. ✅ Users say "can't live without it"

---

## Remember

**The goal is to become irreplaceable.**

Show users we're learning their style over time. Make that learning visible and valuable. Create a data moat they can't replicate elsewhere.

**That's how you lock in long-term retention.**
