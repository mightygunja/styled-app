# RevenueCat Quick Setup - Minimal Configuration

**Fast setup for Styled MVP. No complexity, just what you need.**

---

## Dashboard Configuration

### Step 1: Create Project

1. Go to https://app.revenuecat.com
2. Click **Create New Project**
3. Enter:
   ```
   Project Name: Styled
   ```

### Step 2: Add iOS App

1. Click **Add App**
2. Configure:
   ```
   Platform: iOS
   App Name: Styled
   Bundle ID: com.styled.app
   ```

### Step 3: Add Products

1. Navigate to **Products**
2. Click **Add Product**
3. Add both products:

   **Product 1:**
   ```
   Product ID: com.styled.plus.monthly
   Type: Subscription
   ```

   **Product 2:**
   ```
   Product ID: com.styled.premium.monthly
   Type: Subscription
   ```

### Step 4: Create Entitlements

1. Navigate to **Entitlements**
2. Click **Create Entitlement**

   **Entitlement 1:**
   ```
   Identifier: plus
   Display Name: Plus Access
   Attached Products: com.styled.plus.monthly
   ```

   **Entitlement 2:**
   ```
   Identifier: premium
   Display Name: Premium Access
   Attached Products: com.styled.premium.monthly
   ```

### Step 5: Create Offering

1. Navigate to **Offerings**
2. Click **Create Offering**
   ```
   Identifier: default
   Description: Default subscription offering
   ```

3. Add packages:
   ```
   Package 1:
   - Identifier: plus_monthly
   - Product: com.styled.plus.monthly
   
   Package 2:
   - Identifier: premium_monthly
   - Product: com.styled.premium.monthly
   ```

### Step 6: Get API Key

1. Navigate to **Project Settings → API Keys**
2. Copy **Public SDK Key** (starts with `appl_`)
3. Save for next step

---

## Entitlement Mapping (Final)

| Entitlement | Product ID | Price |
|-------------|-----------|-------|
| **plus** | com.styled.plus.monthly | $8.99/month |
| **premium** | com.styled.premium.monthly | $23.99/month |

---

## Code Implementation

### Add API Key to .env

```bash
# .env
REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxx
```

### Initialize RevenueCat

```typescript
// App.tsx or index.tsx
import Purchases from 'react-native-purchases';

useEffect(() => {
  Purchases.configure({ 
    apiKey: process.env.REVENUECAT_IOS_API_KEY 
  });
}, []);
```

### Check Entitlements

```typescript
import Purchases from 'react-native-purchases';

// Check if user has Plus
const customerInfo = await Purchases.getCustomerInfo();
const hasPlus = customerInfo.entitlements.active['plus'] !== undefined;
const hasPremium = customerInfo.entitlements.active['premium'] !== undefined;

// Determine tier
const tier = hasPremium ? 'premium' : hasPlus ? 'plus' : 'free';
```

### Purchase Flow

```typescript
// Get offerings
const offerings = await Purchases.getOfferings();
const packages = offerings.current?.availablePackages || [];

// Purchase a package
const { customerInfo } = await Purchases.purchasePackage(packages[0]);

// Check new entitlements
const hasAccess = customerInfo.entitlements.active['plus'] !== undefined;
```

---

## Testing

### Sandbox Testing

1. Create sandbox tester in App Store Connect
2. Sign out of production App Store on device
3. Run app and make test purchase
4. Check RevenueCat dashboard → Customers
5. Verify entitlement appears

---

## Verification Checklist

- [ ] RevenueCat project created: "Styled"
- [ ] iOS app added with bundle ID: `com.styled.app`
- [ ] Products added: `com.styled.plus.monthly`, `com.styled.premium.monthly`
- [ ] Entitlements created: `plus`, `premium`
- [ ] Products attached to entitlements
- [ ] Default offering created with both packages
- [ ] API key copied and added to `.env`
- [ ] RevenueCat initialized in app
- [ ] Sandbox test purchase completed
- [ ] Entitlements verified in dashboard

---

## That's It!

**Total setup time: ~10 minutes**

RevenueCat handles:
- ✅ Receipt validation
- ✅ Subscription status
- ✅ Entitlement checking
- ✅ Cross-platform support
- ✅ Analytics and webhooks

You just check entitlements and show/hide features. Simple.
