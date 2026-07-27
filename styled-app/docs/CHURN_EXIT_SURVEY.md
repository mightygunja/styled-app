# Churn Exit Survey — 1 Question, High Signal

**📍 Shown only after cancellation is confirmed**  
**📏 Single screen, no follow-ups**

---

## Question

```
What was the main reason you decided to cancel?

(Select one)
```

---

## Options

```
○ I didn't use it enough

○ It didn't fit my personal style

○ I prefer styling myself

○ Price wasn't right for me

○ I only needed it short-term

○ Something didn't work as expected
```

---

## Optional Text Field

```
Want to add anything? (Optional)

[Text input field]
```

**Design notes:**
- Small text
- Clearly optional
- No pressure to fill
- Short input field

---

## Why This Works

### ✅ Single Question
- Not overwhelming
- High completion rate
- Clear signal
- Respectful of their time

### ✅ Actionable Options
Each option tells you something specific:

**"I didn't use it enough"**
- Signal: Habit formation failed
- Action: Improve onboarding, reduce friction

**"It didn't fit my personal style"**
- Signal: StyleDNA mismatch
- Action: Improve personalization algorithm

**"I prefer styling myself"**
- Signal: Product-market fit issue
- Action: Not for everyone, that's okay

**"Price wasn't right for me"**
- Signal: Value perception issue
- Action: Test pricing, improve value delivery

**"I only needed it short-term"**
- Signal: Seasonal or event-based usage
- Action: Expected churn, not a problem

**"Something didn't work as expected"**
- Signal: Bug or UX issue
- Action: Follow up for details

### ✅ Optional Text
- Captures edge cases
- Allows elaboration
- Not required
- High-signal when filled

---

## When to Show

**After cancellation is confirmed:**
- User has canceled in App Store
- App detects cancellation
- Show survey on next open
- Only once, never repeat

**Not before cancellation:**
- Don't try to prevent cancellation
- Don't guilt trip
- Don't offer discounts
- Just collect data

---

## Implementation

```typescript
interface ChurnSurveyResponse {
  reason: 
    | 'didnt_use_enough'
    | 'style_mismatch'
    | 'prefer_self_styling'
    | 'price'
    | 'short_term_need'
    | 'technical_issue';
  additionalFeedback?: string;
  timestamp: Date;
}

export function ChurnExitSurvey({ onSubmit, onSkip }) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.question}>
        What was the main reason you decided to cancel?
      </Text>
      <Text style={styles.subtitle}>(Select one)</Text>

      <RadioGroup
        value={selectedReason}
        onChange={setSelectedReason}
        options={[
          { value: 'didnt_use_enough', label: "I didn't use it enough" },
          { value: 'style_mismatch', label: "It didn't fit my personal style" },
          { value: 'prefer_self_styling', label: "I prefer styling myself" },
          { value: 'price', label: "Price wasn't right for me" },
          { value: 'short_term_need', label: "I only needed it short-term" },
          { value: 'technical_issue', label: "Something didn't work as expected" },
        ]}
      />

      <Text style={styles.optionalLabel}>
        Want to add anything? (Optional)
      </Text>
      <TextInput
        style={styles.textInput}
        value={feedback}
        onChangeText={setFeedback}
        placeholder=""
        multiline
        maxLength={500}
      />

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => onSubmit({ reason: selectedReason, feedback })}
          disabled={!selectedReason}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

---

## Styling

```typescript
const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#5E5A55',
    marginBottom: 24,
  },
  optionalLabel: {
    fontSize: 13,
    color: '#5E5A55',
    marginTop: 24,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DED7CF',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#161616',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttons: {
    marginTop: 24,
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#2B1F1A',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1ECE7',
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    color: '#5E5A55',
  },
});
```

---

## What NOT to Do

### ❌ Don't Try to Prevent Cancellation
```
❌ "Are you sure you want to cancel?"
❌ "Here's a discount to stay"
❌ "You'll lose all your progress"
❌ "Give us one more chance"
```

### ❌ Don't Make It Complex
```
❌ Multiple pages of questions
❌ Required long-form answers
❌ "Rate these 10 features"
❌ Follow-up surveys
```

### ❌ Don't Guilt Trip
```
❌ "We're sad to see you go"
❌ "What did we do wrong?"
❌ "Help us improve by answering 5 questions"
```

---

## Data Analysis

### High-Signal Patterns

**"I didn't use it enough" (>40%)**
- Habit formation problem
- Onboarding needs work
- Friction too high

**"It didn't fit my personal style" (>20%)**
- StyleDNA algorithm issue
- Personalization not working
- Need better matching

**"Price wasn't right for me" (>15%)**
- Value perception issue
- Consider pricing test
- Or improve value delivery

**"Something didn't work as expected" (>10%)**
- Technical issues
- UX problems
- Follow up immediately

---

## Success Metrics

### Good Signs
- ✅ High completion rate (>60%)
- ✅ Useful optional feedback
- ✅ Clear patterns emerge
- ✅ Actionable insights

### Warning Signs
- ⚠️ Low completion rate (<30%)
- ⚠️ All "other" responses
- ⚠️ Angry optional feedback
- ⚠️ No clear patterns

---

## Follow-Up Actions

### For "Something didn't work as expected"
- Send follow-up email
- Offer support help
- Investigate technical issues
- Consider win-back if fixed

### For "I didn't use it enough"
- Improve onboarding
- Reduce friction
- Better habit formation
- Consider re-engagement campaign

### For "It didn't fit my personal style"
- Review StyleDNA algorithm
- Improve personalization
- Better outfit matching
- A/B test improvements

### For "Price wasn't right for me"
- Test pricing variations
- Improve value delivery
- Consider annual discount
- Better trial experience

---

## Thank You Screen (Important)

**After survey submission:**

```
Thanks for the feedback.
Styled will keep improving — and you're always welcome back.
```

**Design notes:**
- Simple, clean screen
- No additional CTAs
- Auto-dismiss after 2 seconds
- Or manual dismiss

**What NOT to include:**
- ❌ No discounts
- ❌ No guilt
- ❌ No last-chance offers
- ❌ No "Are you sure?"
- ❌ No win-back attempts

**Why this works:**
- Respectful closure
- Leaves door open
- No pressure
- Professional
- Builds goodwill

---

## Remember

**This survey is for learning, not retention.**

Don't:
- Try to save the subscription
- Offer discounts or deals
- Guilt trip them
- Make it complicated

Do:
- Collect clean data
- Respect their decision
- Thank them for feedback
- Use insights to improve

**One question. High signal. Respectful exit.**
