# Sparse Closet Handling Guide

**CRITICAL: Sparse closets will kill confidence if mishandled.**

---

## Golden Rule

### ❌ NEVER Say:
- "You don't have enough clothes"
- "Your closet is too small"
- "Add more items to use this feature"
- "Not enough items to generate outfits"
- "Your wardrobe is incomplete"

### ✅ ALWAYS Say:
- "Let's start your closet"
- "Great start!"
- "Add a few more pieces to unlock more combinations"
- "We'll work with what you have"
- "Here's what we can create with your current pieces"

---

## Detection

### Sparse Closet Definition

```typescript
export function isClosetSparse(closet: ClosetItem[]): boolean {
  const categories = new Set(closet.map(item => item.category));
  return closet.length < 8 || categories.size < 3;
}
```

A closet is sparse if:
- **Less than 8 items total**, OR
- **Less than 3 different categories**

---

## Messaging Strategy

### Exact Copy for All Sparse Closets (0-7 items or <3 categories)

**Headline:**
```
You're off to a great start.
```

**Body:**
```
Styled works with what you already own.
As your closet grows, your outfits will too.
```

**CTA (Optional):**
```
Add 1–2 more pieces when you're ready
```

**⚠️ CRITICAL: No shopping links here.**

### Minimal but Functional (3+ items, 2+ categories)
```
Title: "Ready to create!"
Message: "We'll create outfits with what you have. Add more items anytime to see more combinations."
Action: "Generate Outfits"
```

---

## Outfit Generation Strategy

### Minimum Requirements

```typescript
export function canGenerateOutfits(closet: ClosetItem[]): boolean {
  const categories = new Set(closet.map(item => item.category));
  return closet.length >= 3 && categories.size >= 2;
}
```

**Minimum to generate outfits:**
- ✅ At least 3 items
- ✅ At least 2 different categories

**We're lenient on purpose.** Better to try and show something than block the user.

### Generation Strategies

#### Minimal Strategy (3-4 items, 2 categories)
- Generate 1-2 simple outfits
- Focus on what works
- Encourage adding more items

#### Basic Strategy (5-7 items, 2-3 categories)
- Generate 2-3 outfits
- Show variety within constraints
- Highlight what's possible

#### Full Strategy (8+ items, 3+ categories)
- Generate up to 3 outfits (per feature flags)
- Full matching algorithm
- All features enabled

---

## UI Components

### Empty State (0 items)

```tsx
<EmptyStateReassurance
  type="closet"
  onAction={() => navigation.navigate('AddItem')}
  actionText="Add Your First Item"
/>
```

**Copy:**
> "You don't need a huge wardrobe to get started. Even a few pieces are enough—we'll help you make the most of what you have."

### Sparse Closet Banner (1-7 items)

```tsx
<SparseClosetBanner
  itemCount={closet.length}
  onAddItems={() => navigation.navigate('AddItem')}
/>
```

**Copy:**
> "Great start! Add a few more items to unlock more outfit combinations."

### Outfit Generation Message (sparse closet)

```tsx
<Text style={styles.message}>
  {getOutfitGenerationMessage(closet)}
</Text>
```

**Copy:**
> "Here's what we can create with your current pieces. Add more items anytime to see more combinations!"

---

## Confidence-Building Principles

### 1. Focus on Possibility
❌ "You can't do this yet"
✅ "Here's what you can do now"

### 2. Celebrate Progress
❌ "Only 3 items"
✅ "Great start with 3 pieces!"

### 3. Show Value Immediately
❌ "Add more items first"
✅ "Let's see what we can create"

### 4. Make Adding Items Optional
❌ "You must add more items"
✅ "Add more anytime to see more combinations"

### 5. Never Apologize
❌ "Sorry, not enough items"
✅ "Here's what we can create with what you have"

---

## Implementation Examples

### Check Before Outfit Generation

```typescript
import { canGenerateOutfits, getSparseClosetStrategy } from './services/closetAnalysis';

const handleGenerateOutfits = () => {
  if (!canGenerateOutfits(closet)) {
    const strategy = getSparseClosetStrategy(closet);
    showMessage(strategy.message);
    return;
  }

  // Generate outfits...
};
```

### Show Appropriate Messaging

```typescript
import { isClosetSparse, getSparseClosetMessage } from './services/closetAnalysis';

if (isClosetSparse(closet)) {
  const message = getSparseClosetMessage(closet);
  return (
    <View>
      <Text style={styles.title}>{message.title}</Text>
      <Text style={styles.message}>{message.message}</Text>
      <Button onPress={handleAddItems}>{message.actionText}</Button>
    </View>
  );
}
```

### Provide Helpful Suggestions

```typescript
import { getSparseClosetSuggestions } from './services/closetAnalysis';

const suggestions = getSparseClosetSuggestions(closet);

return (
  <View style={styles.suggestionsContainer}>
    <Text style={styles.suggestionsTitle}>Quick tips:</Text>
    {suggestions.map((suggestion, index) => (
      <Text key={index} style={styles.suggestion}>• {suggestion}</Text>
    ))}
  </View>
);
```

---

## Testing Scenarios

### Test Case 1: Empty Closet
- **Items:** 0
- **Expected:** Encouraging message to add first item
- **Should NOT:** Block any features or show errors

### Test Case 2: Very Sparse (2 items, 1 category)
- **Items:** 2 tops
- **Expected:** "Great start!" message
- **Should NOT:** Allow outfit generation yet

### Test Case 3: Minimal Functional (3 items, 2 categories)
- **Items:** 2 tops, 1 bottom
- **Expected:** Can generate 1-2 simple outfits
- **Should:** Show encouraging message about adding more

### Test Case 4: Sparse but Usable (6 items, 2 categories)
- **Items:** 4 tops, 2 bottoms
- **Expected:** Can generate 2-3 outfits
- **Should:** Suggest adding shoes or outerwear

### Test Case 5: Balanced (8+ items, 3+ categories)
- **Items:** 3 tops, 3 bottoms, 2 shoes
- **Expected:** Full outfit generation
- **Should:** No sparse closet messaging

---

## Analytics to Track

- **Sparse closet rate:** % of users with <8 items
- **Outfit generation attempts:** With sparse vs full closets
- **Item addition rate:** After seeing sparse closet messaging
- **User retention:** Sparse closet users vs full closet users
- **Confidence metrics:** User feedback on sparse closet experience

---

## Key Metrics

### Success Indicators
- ✅ Users with sparse closets still generate outfits
- ✅ Users add items gradually over time
- ✅ No negative feedback about "not enough items"
- ✅ High confidence scores even with sparse closets

### Warning Signs
- ⚠️ Users abandoning after seeing sparse closet message
- ⚠️ Complaints about being blocked from features
- ⚠️ Low outfit generation rates with sparse closets
- ⚠️ Users not adding items after initial setup

---

## Remember

**The goal is confidence, not completeness.**

Users should feel empowered to use Styled with whatever they have, not pressured to have a "perfect" closet first.

**Start small. Build confidence. Add items naturally.**
