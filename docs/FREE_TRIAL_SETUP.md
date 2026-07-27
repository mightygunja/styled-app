# Free Trial Setup Guide - 7 Days (Highly Recommended)

**Why offer free trials?** Trust before payment. Users experience full value before committing.

---

## Configuration Overview

### Trial Duration
```
7 days (UNIFORM across all tiers)
```

**CRITICAL: Do NOT use different trial lengths per tier.**
- Plus: 7 days
- Premium: 7 days
- Same trial length = clarity + confidence

### Applies To
- ✅ Styled Plus ($8.99/month)
- ✅ Styled Premium ($23.99/month)

### Eligibility
```
New subscribers only
```

---

## App Store Connect Setup

### Step 1: Configure Free Trial for Plus

1. Navigate to: **App Store Connect → Subscriptions → com.styled.plus.monthly**
2. Scroll to: **Subscription Prices**
3. Click: **Add Introductory Offer**
4. Select: **Free Trial**
5. Configure:
   ```
   Duration: 7 days
   Eligibility: New Subscribers
   Countries: All territories
   ```
6. Save changes

### Step 2: Configure Free Trial for Premium

1. Navigate to: **App Store Connect → Subscriptions → com.styled.premium.monthly**
2. Scroll to: **Subscription Prices**
3. Click: **Add Introductory Offer**
4. Select: **Free Trial**
5. Configure:
   ```
   Duration: 7 days
   Eligibility: New Subscribers
   Countries: All territories
   ```
6. Save changes

---

## Display Copy

### Plus Trial Copy
```
Try Styled Plus free for 7 days. Cancel anytime.
```

### Premium Trial Copy
```
Try Styled Premium free for 7 days. Cancel anytime.
```

### Paywall CTA
```
Start Free Trial
```

### Trial Terms
```
Free for 7 days, then $8.99/month (Plus) or $23.99/month (Premium). Cancel anytime before trial ends to avoid charges. Subscription automatically renews unless cancelled.
```

---

## Implementation in App

### Update SoftPaywall Component

```typescript
// /src/components/SoftPaywall.tsx

<View style={styles.trialCallout}>
  <Text style={styles.trialText}>
    Try free for 7 days, then $8.99/month
  </Text>
  <Text style={styles.trialSubtext}>
    Cancel anytime
  </Text>
</View>

<TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
  <Text style={styles.upgradeButtonText}>Start Free Trial</Text>
</TouchableOpacity>
```

### Update PaywallScreen

```typescript
// /src/screens/PaywallScreen.tsx

{packages.map(pkg => (
  <View key={pkg.identifier} style={styles.packageCard}>
    <View style={styles.trialBadge}>
      <Text style={styles.trialBadgeText}>7 DAYS FREE</Text>
    </View>
    
    <Text style={styles.packageTitle}>{pkg.product.title}</Text>
    <Text style={styles.packagePrice}>
      Then {pkg.product.priceString}/month
    </Text>
    
    <TouchableOpacity onPress={() => handlePurchase(pkg)}>
      <Text>Start Free Trial</Text>
    </TouchableOpacity>
  </View>
))}
```

---

## RevenueCat Configuration

### Trial Handling

RevenueCat automatically handles free trials when configured in App Store Connect. No additional setup needed.

### Check Trial Status

```typescript
import { subscriptionService } from '../services/subscriptionService';

const customerInfo = await subscriptionService.getCustomerInfo();

// Check if user is in trial
const isInTrial = customerInfo.entitlements.active['plus_access']?.isActive &&
                  customerInfo.entitlements.active['plus_access']?.periodType === 'trial';

if (isInTrial) {
  const trialEndDate = customerInfo.entitlements.active['plus_access']?.expirationDate;
  console.log('Trial ends:', trialEndDate);
}
```

---

## User Experience Flow

### New User Journey

1. **Complete onboarding** → Build StyleDNA profile
2. **Generate 3 free outfits** → Experience core value
3. **Hit soft paywall** → See trial offer
4. **Start 7-day trial** → Full access, no charge
5. **Day 6 reminder** → Optional: Send notification
6. **Day 7 conversion** → Auto-converts to paid unless cancelled

### Trial Reminder (Optional)

Send push notification on Day 6:

```
Title: Your trial ends tomorrow
Body: Loving Styled? Your trial converts to $8.99/month tomorrow. Cancel anytime in settings.
```

---

## Trust-Building Messaging

### Why 7 Days Works

- **Builds trust** → Users feel value before paying
- **Reduces anxiety** → No immediate financial commitment
- **Increases conversion** → Users who trial convert at 40-60% vs 5-10% without trial
- **Lowers refunds** → Users know what they're paying for

### Messaging Principles

**Do:**
- ✅ "Try free for 7 days"
- ✅ "Cancel anytime"
- ✅ "No commitment"
- ✅ "Experience full access"

**Don't:**
- ❌ "Limited time offer"
- ❌ "Act now"
- ❌ "Don't miss out"
- ❌ Hidden terms

---

## Legal Requirements

### Trial Disclosure

Must clearly state:
1. Trial duration (7 days)
2. Price after trial ($8.99 or $23.99/month)
3. Auto-renewal terms
4. How to cancel

### Example Disclosure

```
Start your 7-day free trial. After trial, subscription continues at $8.99/month 
(Plus) or $23.99/month (Premium) unless cancelled. Cancel anytime in App Store 
settings. Subscription automatically renews.
```

---

## Testing Free Trials

### Sandbox Testing

1. **Create sandbox tester** in App Store Connect
2. **Sign out** of production App Store
3. **Launch app** and trigger paywall
4. **Start trial** with sandbox account
5. **Verify** trial status in RevenueCat dashboard
6. **Fast-forward time** using Xcode date/time settings
7. **Test conversion** after trial ends

### Test Scenarios

- ✅ Start trial successfully
- ✅ Cancel during trial (no charge)
- ✅ Convert after trial ends (charge $8.99/$23.99)
- ✅ Restore trial status after reinstall
- ✅ Trial not available to existing subscribers

---

## Analytics to Track

### Key Metrics

1. **Trial start rate** → % of users who start trial
2. **Trial completion rate** → % who complete full 7 days
3. **Trial conversion rate** → % who convert to paid
4. **Trial cancellation rate** → % who cancel during trial
5. **Time to trial start** → Days from install to trial start

### Target Benchmarks

- Trial start rate: **30-50%** of paywall views
- Trial completion rate: **60-80%** complete full 7 days
- Trial conversion rate: **40-60%** convert to paid
- Trial cancellation rate: **20-40%** cancel during trial

---

## Optimization Tips

### Increase Trial Starts

1. **Show value first** → Let users generate 3 outfits before paywall
2. **Clear messaging** → "7 days free" prominently displayed
3. **Reduce friction** → One-tap trial start
4. **Social proof** → "Join 10,000+ stylish users"

### Increase Trial Conversions

1. **Engagement emails** → Tips and tricks during trial
2. **Day 3 check-in** → "How's your trial going?"
3. **Day 6 reminder** → "Your trial ends tomorrow"
4. **Show usage stats** → "You've created 15 outfits this week!"

### Reduce Trial Cancellations

1. **Deliver value early** → Ensure users see results in first 2 days
2. **Onboarding excellence** → Make StyleDNA setup smooth
3. **Regular engagement** → Daily outfit suggestions
4. **Support access** → Easy help during trial

---

## Checklist

Before launching free trials:

- [ ] Free trial configured in App Store Connect for Plus
- [ ] Free trial configured in App Store Connect for Premium
- [ ] Trial duration set to 7 days
- [ ] Trial eligibility set to "New Subscribers"
- [ ] Paywall updated with "Start Free Trial" CTA
- [ ] Trial terms clearly displayed
- [ ] Legal disclosure added
- [ ] Sandbox testing completed
- [ ] Analytics tracking implemented
- [ ] Trial reminder notifications configured (optional)

---

## Support Resources

- App Store Connect: https://appstoreconnect.apple.com
- Apple Trial Documentation: https://developer.apple.com/app-store/subscriptions/
- RevenueCat Trial Guide: https://docs.revenuecat.com/docs/ios-subscription-offers

---

**Remember:** Free trials build trust. Users who experience value before paying convert at much higher rates. The 7-day trial is your most powerful conversion tool.
