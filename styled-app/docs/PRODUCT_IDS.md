# Styled App - Product IDs (Stable Forever)

**IMPORTANT:** These product IDs use reverse-DNS notation and must never change once submitted to App Store Connect.

---

## App Store Product IDs

### MVP - Monthly Subscriptions Only

| Tier | Product ID | Price | Description |
|------|-----------|-------|-------------|
| **Plus** | `com.styled.plus.monthly` | **$8.99/month** | Unlimited outfits, full StyleDNA, advanced analytics |
| **Premium** | `com.styled.premium.monthly` | **$23.99/month** | Everything in Plus + personal stylist + priority support |

---

## App Store Connect Configuration

### Step 1: Create Subscription Group

```
Location: App Store Connect → Your App → Subscriptions
Group Name: Styled Membership
Reference Name: styled_membership
```

### Step 2: Create Products

#### Product 1: Styled Plus (Monthly)

```
Product ID: com.styled.plus.monthly
Reference Name: Styled Plus Monthly
Subscription Duration: 1 Month
Price: $8.99 USD

Free Trial: 7 days (Highly Recommended)
Trial Eligibility: New subscribers only

Localized Information (English - US):
  Display Name: Styled Plus
  Description: Unlimited outfit generation, full Style DNA profile, and advanced closet insights.

Subscription Level: 1
```

#### Product 2: Styled Premium (Monthly)

```
Product ID: com.styled.premium.monthly
Reference Name: Styled Premium Monthly
Subscription Duration: 1 Month
Price: $23.99 USD

Free Trial: 7 days (Highly Recommended)
Trial Eligibility: New subscribers only

Localized Information (English - US):
  Display Name: Styled Premium
  Description: Personal styling support with expert reviews, capsules, and event looks.

Subscription Level: 2
```

---

## Feature Comparison

### Free Tier
- ❌ **3 outfit limit** per session
- ❌ No StyleDNA profile
- ❌ No advanced analytics
- ❌ Limited AI recommendations
- ✅ Basic closet management

### Plus Tier ($8.99/month)
- ✅ **Unlimited outfit generation**
- ✅ **Full StyleDNA profile**
- ✅ **Advanced closet analytics**
- ✅ **Full AI styling recommendations**
- ❌ No personal stylist
- ❌ Standard support

### Premium Tier ($23.99/month)
- ✅ **Everything in Plus**
- ✅ **Personal styling support**
- ✅ **Expert wardrobe reviews**
- ✅ **Curated capsule collections**
- ✅ **Event-specific outfit planning**
- ✅ **Priority support**

---

## RevenueCat Configuration

### Entitlements

```
Entitlement ID: plus_access
Description: Access to Styled Plus features
Products: com.styled.plus.monthly

Entitlement ID: premium_access
Description: Access to Styled Premium features
Products: com.styled.premium.monthly
```

### Offerings

```
Offering ID: default
Description: Default subscription offering

Packages:
  - Package ID: plus_monthly
    Product: com.styled.plus.monthly
    Display Name: Plus
    
  - Package ID: premium_monthly
    Product: com.styled.premium.monthly
    Display Name: Premium
```

---

## Implementation Reference

### In Code (`/src/config/features.ts`)

```typescript
export const PRODUCT_IDS = {
  PLUS_MONTHLY: 'com.styled.plus.monthly',
  PREMIUM_MONTHLY: 'com.styled.premium.monthly',
} as const;

export const TIER_PRICING: Record<SubscriptionTier, number | null> = {
  free: null,
  plus: 8.99,      // $8.99/month
  premium: 23.99,  // $23.99/month
};
```

---

## Future Expansion (Post-MVP)

When adding annual subscriptions:

```
com.styled.plus.annual      → $79.99/year (26% savings)
com.styled.premium.annual   → $199.99/year (30% savings)
```

**Do NOT create these yet.** MVP is monthly-only.

---

## Testing

### Sandbox Test Accounts

Create in App Store Connect → Users and Access → Sandbox Testers:

```
Email: test-plus@styled.app
Purpose: Test Plus subscription purchase

Email: test-premium@styled.app
Purpose: Test Premium subscription purchase
```

### Test Scenarios

1. **Free to Plus upgrade**
   - Generate 3 free outfits
   - Hit soft paywall
   - Purchase Plus subscription
   - Verify unlimited access

2. **Plus to Premium upgrade**
   - Subscribe to Plus
   - Attempt to access Premium features
   - Upgrade to Premium
   - Verify Premium features unlock

3. **Restore purchases**
   - Purchase subscription
   - Delete app
   - Reinstall and restore
   - Verify subscription active

---

## Pricing Strategy

### Why $8.99 for Plus?
- Below psychological $10 barrier
- Competitive with similar apps
- Accessible for target demographic
- Allows for annual upsell later

### Why $23.99 for Premium?
- 2.7x Plus price (strong value differentiation)
- Justifies personal stylist access
- Premium positioning
- Targets serious fashion enthusiasts

---

## Checklist Before Submission

- [ ] Product IDs created in App Store Connect
- [ ] Subscription group configured
- [ ] Pricing set for all regions
- [ ] Localized descriptions written
- [ ] Free trial configured (7 days recommended)
- [ ] RevenueCat products mapped
- [ ] Entitlements configured
- [ ] Test purchases completed
- [ ] Restore purchases working
- [ ] Feature gating tested

---

## Critical Rules

1. **NEVER change product IDs** after App Store submission
2. **Monthly only for MVP** - no annual yet
3. **Use exact pricing** - $8.99 and $23.99
4. **Test thoroughly** before production release
5. **Document all changes** to subscription structure

---

## Support Resources

- App Store Connect: https://appstoreconnect.apple.com
- RevenueCat Dashboard: https://app.revenuecat.com
- Apple Subscription Docs: https://developer.apple.com/app-store/subscriptions/
- RevenueCat Docs: https://docs.revenuecat.com
