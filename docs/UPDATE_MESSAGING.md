# "What Changed?" Update Messaging (One Screen)

**📍 Shown once after a meaningful update**  
**🧠 Tone: Informative, grounded, confident**  
**⛔ No marketing language**

---

## Screen Title

```
What's new
```

---

## Body Copy (Exact)

```
Styled has gotten better at understanding personal style — not trends.

Outfits now reflect your preferences more consistently, and explanations are clearer so you know why something works.

Nothing you need to relearn. Just better support.
```

---

## Why This Works

### ✅ Informative, Not Marketing

**"Gotten better at understanding personal style — not trends"**
- Specific improvement
- Reinforces product philosophy
- Not hype, just facts

**"Outfits now reflect your preferences more consistently"**
- Concrete benefit
- User-focused
- No superlatives

**"Explanations are clearer so you know why something works"**
- Tangible improvement
- Educational focus
- Transparency

**"Nothing you need to relearn. Just better support."**
- Reduces friction
- Reassuring
- Confident, not pushy

### ✅ Grounded, Confident Tone

- No "exciting new features!"
- No "you're going to love this!"
- No "revolutionary update!"
- Just clear improvements

---

## Design

```
┌─────────────────────────────────────┐
│                                     │
│  What's new                         │
│                                     │
│  Styled has gotten better at        │
│  understanding personal style —     │
│  not trends.                        │
│                                     │
│  Outfits now reflect your           │
│  preferences more consistently,     │
│  and explanations are clearer so    │
│  you know why something works.      │
│                                     │
│  Nothing you need to relearn.       │
│  Just better support.               │
│                                     │
│  [Continue]                         │
│                                     │
└─────────────────────────────────────┘
```

**Design notes:**
- Clean, simple layout
- Readable typography
- Single dismiss button: "Continue"
- No "upgrade now"
- No feature parade
- No illustrations or animations
- Professional, not flashy

---

## When to Show

**After meaningful updates:**
- Algorithm improvements
- New personalization features
- UX enhancements
- Core functionality changes

**Not for:**
- Bug fixes
- Minor tweaks
- Backend changes
- Performance improvements

**Frequency:**
- Maximum once per month
- Only for significant changes
- User sees it once only per update

---

## Implementation

```typescript
interface UpdateMessage {
  version: string;
  title: string;
  body: string;
  shown: boolean;
}

export function shouldShowUpdateMessage(
  currentVersion: string,
  lastShownVersion: string | null
): boolean {
  // Only show for major/minor updates, not patches
  const current = parseVersion(currentVersion);
  const lastShown = lastShownVersion ? parseVersion(lastShownVersion) : null;

  if (!lastShown) {
    return false; // Don't show on first install
  }

  // Show if major or minor version changed
  if (current.major > lastShown.major || 
      current.minor > lastShown.minor) {
    return true;
  }

  return false;
}

export function UpdateMessageScreen({ onDismiss }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>What's new</Text>

      <Text style={styles.body}>
        Styled has gotten better at understanding personal style — not trends.
        {'\n\n'}
        Outfits now reflect your preferences more consistently, and explanations are clearer so you know why something works.
        {'\n\n'}
        Nothing you need to relearn. Just better support.
      </Text>

      <TouchableOpacity 
        style={styles.button}
        onPress={onDismiss}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Styling

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#161616',
    marginBottom: 24,
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
    color: '#161616',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#2B1F1A',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1ECE7',
  },
});
```

---

## Copy Variations (For Different Updates)

### Algorithm Improvement
```
Styled has gotten better at understanding personal style — not trends.

Outfits now reflect your preferences more consistently, and explanations are clearer so you know why something works.

Nothing you need to relearn. Just better support.
```

### New Feature (Closet Health)
```
Styled now shows how your wardrobe works together.

Closet Health gives you insight into your style patterns — not to sell you things, but to help you use what you already own.

Nothing changes in how you use Styled. Just more clarity.
```

### UX Enhancement
```
We've simplified how you navigate Styled.

The core experience is the same, but getting to what you need is now more direct.

Nothing to relearn. Just less friction.
```

---

## What NOT to Say

### ❌ Marketing Language
```
❌ "Exciting new features!"
❌ "You're going to love this!"
❌ "Revolutionary update!"
❌ "Game-changing improvements!"
```

### ❌ Vague Claims
```
❌ "We've made Styled better"
❌ "Lots of improvements"
❌ "Enhanced experience"
❌ "New and improved"
```

### ❌ Forced Enthusiasm
```
❌ "Check out these amazing updates!"
❌ "We can't wait for you to try this!"
❌ "Get ready for the best Styled yet!"
```

---

## Copy Principles

### ✅ Do:
- State specific improvements
- Explain tangible benefits
- Use grounded language
- Reassure about learning curve
- Keep it brief

### ❌ Don't:
- Use marketing superlatives
- Oversell the update
- Create false excitement
- Make vague claims
- Force enthusiasm

---

## Success Metrics

### Good Signs
- ✅ Users understand what changed
- ✅ Low confusion/support tickets
- ✅ Positive sentiment about update
- ✅ High dismissal rate (they read it)

### Warning Signs
- ⚠️ "What changed?" support tickets
- ⚠️ Confusion about new features
- ⚠️ Negative sentiment
- ⚠️ Users skip without reading

---

## Remember

**Update messaging should inform, not sell.**

Users should think:
- ✅ "Oh, that's useful to know."
- ✅ "Clear explanation of what changed."
- ✅ "Nothing I need to worry about."

Not:
- ❌ "Why are they so excited about this?"
- ❌ "What actually changed?"
- ❌ "This feels like marketing."

**Grounded. Confident. Informative.**
