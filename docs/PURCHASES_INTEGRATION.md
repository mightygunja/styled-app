# Purchases Integration Guide

**How to integrate RevenueCat purchases service in your Expo app.**

---

## Service File

Location: `/src/services/purchases.ts`

This service handles:
- ✅ RevenueCat initialization with device check
- ✅ Subscription tier checking
- ✅ Purchase flow
- ✅ Restore purchases
- ✅ Simulator safety (skips on non-devices)

---

## Setup

### 1. Add API Key to Environment

Create or update `.env`:

```bash
# RevenueCat
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxx
```

**Important:** Use `EXPO_PUBLIC_` prefix so Expo can access it at runtime.

### 2. Initialize on App Start

In your main `App.tsx` or root component:

```typescript
import { useEffect } from 'react';
import { initPurchases } from './src/services/purchases';

export default function App() {
  useEffect(() => {
    // Initialize RevenueCat with user ID
    const userId = 'user-123'; // Replace with actual user ID
    initPurchases(userId);
  }, []);

  return (
    // Your app content
  );
}
```

---

## Usage Examples

### Check Subscription Tier

```typescript
import { getSubscriptionTier } from './src/services/purchases';

const tier = await getSubscriptionTier();
// Returns: 'free' | 'plus' | 'premium'

if (tier === 'free') {
  // Show paywall
} else {
  // Show premium features
}
```

### Get Available Offerings

```typescript
import { getOfferings } from './src/services/purchases';

const offering = await getOfferings();
const packages = offering?.availablePackages || [];

// Display packages to user
packages.forEach(pkg => {
  console.log(pkg.product.title);        // "Styled Plus"
  console.log(pkg.product.priceString);  // "$8.99"
});
```

### Purchase Flow

```typescript
import { purchasePackage } from './src/services/purchases';

try {
  const result = await purchasePackage(selectedPackage);
  
  if (result.success) {
    // Purchase successful
    const tier = await getSubscriptionTier();
    console.log('New tier:', tier);
  } else if (result.cancelled) {
    // User cancelled
    console.log('Purchase cancelled');
  }
} catch (error) {
  // Purchase failed
  console.error('Purchase error:', error);
}
```

### Restore Purchases

```typescript
import { restorePurchases } from './src/services/purchases';

try {
  const result = await restorePurchases();
  
  if (result.success) {
    const tier = await getSubscriptionTier();
    console.log('Restored tier:', tier);
  }
} catch (error) {
  console.error('Restore failed:', error);
}
```

---

## Integration with SubscriptionContext

Update `/src/contexts/SubscriptionContext.tsx`:

```typescript
import { getSubscriptionTier } from '../services/purchases';

const loadSubscription = async () => {
  try {
    setLoading(true);
    
    // Use purchases service instead of mock
    const tier = await getSubscriptionTier();
    setTier(tier);
  } catch (error) {
    console.error('Failed to load subscription:', error);
    setTier('free');
  } finally {
    setLoading(false);
  }
};
```

---

## Device Check Behavior

### On Physical Device
- ✅ RevenueCat initializes normally
- ✅ All purchase functions work
- ✅ Subscription status syncs

### On Simulator/Emulator
- ⚠️ RevenueCat initialization skipped
- ⚠️ All functions return safe defaults
- ⚠️ No errors thrown
- ℹ️ Console logs: "Skipping RevenueCat initialization on simulator"

This prevents crashes during development on simulators.

---

## Testing

### Development (Simulator)
```typescript
// Purchases service automatically returns:
getSubscriptionTier() // → 'free'
getOfferings()        // → null
```

### Sandbox Testing (Physical Device)
1. Create sandbox tester in App Store Connect
2. Sign out of production App Store
3. Run app on physical device
4. Make test purchase
5. Check RevenueCat dashboard

---

## Error Handling

All functions handle errors gracefully:

```typescript
// Safe defaults on error
getSubscriptionTier()  // Returns 'free' on error
getOfferings()         // Returns null on error

// Throws on critical errors
purchasePackage()      // Throws if purchase fails
restorePurchases()     // Throws if restore fails
```

---

## Environment Variables

Required in `.env`:

```bash
# RevenueCat (use EXPO_PUBLIC_ prefix)
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxx
```

Access in code:
```typescript
process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
```

---

## Entitlement Mapping

The service checks these exact entitlement identifiers:

| Entitlement | Product ID | Returns |
|-------------|-----------|---------|
| `premium` | com.styled.premium.monthly | `'premium'` |
| `plus` | com.styled.plus.monthly | `'plus'` |
| (none) | - | `'free'` |

These must match your RevenueCat dashboard configuration.

---

## Checklist

Before going live:

- [ ] API key added to `.env` with `EXPO_PUBLIC_` prefix
- [ ] `initPurchases()` called on app start with user ID
- [ ] Tested on physical device with sandbox account
- [ ] Verified entitlements in RevenueCat dashboard
- [ ] Error handling implemented in purchase flow
- [ ] Restore purchases button added to settings
- [ ] Simulator behavior tested (should skip gracefully)

---

## Common Issues

### "API key not found"
- Ensure `.env` has `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- Restart Expo dev server after adding env vars

### "Purchases only work on physical devices"
- This is expected on simulator
- Test on physical device with sandbox account

### Entitlements not showing
- Verify entitlement IDs match: `plus` and `premium`
- Check RevenueCat dashboard → Customers
- Ensure products are attached to entitlements

---

## Next Steps

1. Add API key to `.env`
2. Initialize in `App.tsx`
3. Update `SubscriptionContext` to use purchases service
4. Test on physical device
5. Implement paywall UI with purchase flow

**Total integration time: ~15 minutes** 🚀
