# Subscription Management Screen — Exact Copy

**📍 Location:** Settings → Membership  
**📐 Tone:** Informational, not persuasive

---

## Screen Title

```
Membership
```

---

## Status Section (Dynamic)

### If Free

```
You're currently using Styled's free version.

[View Plus options]
```

### If Plus

```
You're subscribed to Styled Plus

$8.99/month
Renews on [Date]

[Manage in App Store]
```

### If Premium

```
You're subscribed to Styled Premium

$23.99/month
Renews on [Date]

[Manage in App Store]
```

### If Trial

```
Free Trial
Active

Trial ends [Date]
Then $8.99/month

[Manage in App Store]
```

---

## What's Included (Dynamic)

### Styled Plus

```
What's Included

Unlimited outfits

Full Style DNA

Closet insights
```

### Styled Premium

```
What's Included

Everything in Plus

Stylist reviews

Capsule & event styling
```

### Free Version

```
What's Included

3 outfits per month

Basic Style DNA

[View Plus options]
```

---

## Trial Status (If Active)

```
Free trial active
Ends in X days

You won't be charged until the trial ends.
```

**Design notes:**
- "Ends in X days" = large text
- "You won't be charged..." = small text underneath
- Reassuring, not alarming
- No countdown anxiety

---

## Subscription Control (Apple-Safe)

```
[Manage subscription]

Subscriptions are managed through your App Store account.
```

**Design notes:**
- Button: Primary, neutral styling (not aggressive)
- Helper text: Required for Apple compliance
- Clear, direct language
- No dark patterns

---

## Help Section

```
Need help?

• Manage subscription in App Store settings
• Cancel anytime, no questions asked
• Questions? Contact support

[Contact Support]
```

---

## Footer Trust Copy

```
Styled never auto-renews without Apple's confirmation.
You're always in control.
```

**Design notes:**
- Small text at bottom of screen
- Muted color (#5E5A55)
- Reassuring, not alarming
- Reinforces transparency

---

## Complete Screen Layout

```
┌─────────────────────────────────────┐
│  ← Settings                         │
│                                     │
│  Membership                         │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Styled Plus                   │ │
│  │ Active                        │ │
│  │                               │ │
│  │ $8.99/month                   │ │
│  │ Renews on Feb 14              │ │
│  │                               │ │
│  │ [Manage in App Store]         │ │
│  └───────────────────────────────┘ │
│                                     │
│  What's included:                   │
│                                     │
│  • Unlimited outfit generation      │
│  • Full Style DNA personalization   │
│  • Closet health insights           │
│  • Monthly style insights           │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Need help?                    │ │
│  │                               │ │
│  │ • Manage subscription in      │ │
│  │   App Store settings          │ │
│  │ • Cancel anytime, no          │ │
│  │   questions asked             │ │
│  │ • Questions? Contact support  │ │
│  │                               │ │
│  │ [Contact Support]             │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## Copy Principles

### ✅ Do:
- State facts clearly
- Show renewal date
- Link to App Store management
- Make cancellation info visible
- Offer support help

### ❌ Don't:
- Upsell to higher tier
- Use urgency language
- Hide cancellation info
- Make it hard to manage
- Guilt trip about canceling

---

## Implementation

```typescript
export function MembershipScreen({ tier, renewalDate, onContactSupport }) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Membership</Text>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.planName}>
          {tier === 'plus' ? 'Styled Plus' : 
           tier === 'premium' ? 'Styled Premium' : 
           'Free Plan'}
        </Text>
        <Text style={styles.status}>Active</Text>

        {tier !== 'free' && (
          <>
            <Text style={styles.price}>
              ${tier === 'plus' ? '8.99' : '23.99'}/month
            </Text>
            <Text style={styles.renewal}>
              Renews on {formatDate(renewalDate)}
            </Text>
          </>
        )}

        <TouchableOpacity 
          style={styles.manageButton}
          onPress={openAppStoreSubscriptions}
        >
          <Text style={styles.manageButtonText}>
            Manage in App Store
          </Text>
        </TouchableOpacity>
      </View>

      {/* What's Included */}
      <Text style={styles.sectionTitle}>What's included:</Text>
      <View style={styles.featuresList}>
        {getFeatures(tier).map((feature, index) => (
          <Text key={index} style={styles.feature}>
            • {feature}
          </Text>
        ))}
      </View>

      {/* Help Section */}
      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>Need help?</Text>
        <Text style={styles.helpItem}>
          • Manage subscription in App Store settings
        </Text>
        <Text style={styles.helpItem}>
          • Cancel anytime, no questions asked
        </Text>
        <Text style={styles.helpItem}>
          • Questions? Contact support
        </Text>
        
        <TouchableOpacity 
          style={styles.supportButton}
          onPress={onContactSupport}
        >
          <Text style={styles.supportButtonText}>
            Contact Support
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

---

## Styling Notes

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#161616',
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    color: '#5E5A55',
    marginBottom: 16,
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 4,
  },
  renewal: {
    fontSize: 14,
    color: '#5E5A55',
    marginBottom: 16,
  },
  manageButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2B1F1A',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B1F1A',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 12,
  },
  featuresList: {
    marginBottom: 24,
  },
  feature: {
    fontSize: 15,
    color: '#5E5A55',
    lineHeight: 24,
    marginBottom: 4,
  },
  helpCard: {
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 12,
  },
  helpItem: {
    fontSize: 14,
    color: '#5E5A55',
    lineHeight: 22,
    marginBottom: 4,
  },
  supportButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5E5A55',
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5E5A55',
  },
});
```

---

## Key Features

✅ **Clear status** - Shows plan name, price, renewal date
✅ **Easy management** - Direct link to App Store
✅ **Transparent cancellation** - "Cancel anytime, no questions asked"
✅ **Support access** - Easy to contact help
✅ **No upsells** - Just information, no pressure

---

## What NOT to Include

❌ **Upgrade prompts** - "Upgrade to Premium!"
❌ **Feature comparisons** - "See what you're missing"
❌ **Urgency tactics** - "Limited time offer"
❌ **Retention hooks** - "Don't lose your progress"
❌ **Guilt trips** - "Are you sure you want to cancel?"

---

## Remember

**This screen is for management, not marketing.**

Users come here to:
- Check their subscription status
- Find renewal date
- Manage or cancel
- Get help

Give them exactly that. Nothing more.
