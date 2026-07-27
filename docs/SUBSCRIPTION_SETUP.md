# Exact App Store Subscription Configuration (Apple + Expo)

Complete guide for setting up in-app subscriptions for Styled app.

---

## 1. App Store Connect — Subscription Setup

### Step A: Create Subscription Group

**Location:** App Store Connect → Your App → Subscriptions

**Configuration:**
```
Group Name: Styled Membership
Reference Name: styled_membership
Description (internal): Access to Style DNA and unlimited outfits
```

**Why one group?**
- Apple requires related subscription tiers to be in the same group
- Users can upgrade/downgrade within the group
- Prevents users from having multiple active subscriptions

---

### Step B: Create Subscription Products

**MVP: Monthly subscriptions only. Annual coming post-launch.**

Create two subscription tiers within the "Styled Membership" group:

#### **1. Styled Plus (Monthly)**

```
Product ID: com.styled.plus.monthly
Reference Name: Styled Plus Monthly
Subscription Duration: 1 Month
Price: $8.99 USD

Localized Information (English - US):
  Display Name: Styled Plus
  Description: Unlimited outfit generation, full Style DNA profile, and advanced closet insights.

Subscription Level: 1

Review Information:
  Screenshot: Show outfit generation screen
  Notes: "Subscription unlocks unlimited outfit generation and Style DNA personalization"
```

#### **2. Styled Premium (Monthly)**

```
Product ID: com.styled.premium.monthly
Reference Name: Styled Premium Monthly
Subscription Duration: 1 Month
Price: $23.99 USD

Localized Information (English - US):
  Display Name: Styled Premium
  Description: Personal styling support with expert reviews, capsules, and event looks.

Subscription Level: 2

Review Information:
  Screenshot: Show premium features
  Notes: "Premium tier includes personal styling support, expert reviews, capsule collections, and event planning"
```

**Note:** Do NOT create annual subscriptions yet. MVP is monthly-only to simplify initial launch.

---

### Step C: Configure Subscription Features

**For each subscription, configure:**

1. **Subscription Prices**
   - Set base price in USD
   - Apple auto-generates prices for other regions
   - Review and adjust for key markets (UK, EU, Canada, Australia)

2. **Free Trial** (Recommended)
   ```
   Trial Duration: 7 days
   Introductory Offer: None (use trial instead)
   ```

3. **Subscription Benefits** (shown in App Store)
   ```
   Plus Monthly ($8.99/month):
   - Unlimited outfit generation
   - Full Style DNA profile
   - Advanced closet analytics
   - AI styling recommendations
   
   Premium Monthly ($23.99/month):
   - Everything in Plus
   - Personal styling support
   - Expert wardrobe reviews
   - Curated capsule collections
   - Event-specific outfit planning
   - Priority support
   ```

4. **Subscription Information**
   ```
   Subscription Group: Styled Membership
   Level: 1 (Plus), 2 (Premium if added)
   ```

---

### Step D: App Store Review Information

**Provide for Apple Review:**

1. **Demo Account**
   ```
   Username: review@styled.app
   Password: [secure password]
   Notes: Account has 5 closet items pre-loaded for testing
   ```

2. **Subscription Testing Instructions**
   ```
   1. Launch app
   2. Complete Style DNA onboarding (takes 2-3 minutes)
   3. Generate 3 free outfits
   4. Soft paywall appears after 3rd outfit
   5. Tap "Unlock Unlimited" to see subscription options
   6. Use sandbox test account to complete purchase
   ```

3. **Screenshots Required**
   - Onboarding flow (Style DNA setup)
   - Free outfit generation (showing 3 limit)
   - Soft paywall screen
   - Subscription paywall with pricing
   - Unlimited outfit generation (post-purchase)

---

## 2. Expo Configuration

### Step A: Install Required Packages

```bash
cd styled-app
npx expo install expo-store-review expo-linking
npm install react-native-purchases
npx pod-install  # iOS only
```

### Step B: Configure app.json

Add to `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.styled.app",
      "buildNumber": "1",
      "infoPlist": {
        "SKAdNetworkItems": [
          {
            "SKAdNetworkIdentifier": "cstr6suwn9.skadnetwork"
          }
        ]
      }
    },
    "plugins": [
      [
        "react-native-purchases",
        {
          "ios": {
            "usesStoreKit2IfAvailable": true
          }
        }
      ]
    ]
  }
}
```

---

## 3. RevenueCat Setup (Recommended)

RevenueCat simplifies subscription management across iOS and Android.

### Step A: Create RevenueCat Account

1. Go to https://app.revenuecat.com/signup
2. Create project: "Styled"
3. Note your **API Key** (Public SDK Key)

### Step B: Configure iOS App

**In RevenueCat Dashboard:**

1. **Project Settings → Apps → Add App**
   ```
   Platform: iOS
   App Name: Styled
   Bundle ID: com.styled.app
   ```

2. **Add App Store Connect API Key**
   - Generate In-App Purchase Key in App Store Connect
   - Upload to RevenueCat
   - This allows RevenueCat to sync subscription status

3. **Configure Products**
   ```
   Product ID: com.styled.plus.monthly
   Product ID: com.styled.premium.monthly
   ```

4. **Create Entitlements**
   ```
   Entitlement ID: plus_access
   Description: Access to Styled Plus features
   Attach Products: com.styled.plus.monthly
   
   Entitlement ID: premium_access
   Description: Access to Styled Premium features
   Attach Products: com.styled.premium.monthly
   ```

### Step C: Configure Offerings

**Create Offering:**
```
Offering ID: default
Description: Default subscription offering (MVP - monthly only)

Packages:
  - Package ID: plus_monthly
    Product: com.styled.plus.monthly
    Display Name: Plus
    
  - Package ID: premium_monthly
    Product: com.styled.premium.monthly
    Display Name: Premium
```

---

## 4. Implementation Code

### Step A: Create Subscription Service

Create `/src/services/subscriptionService.ts`:

```typescript
import Purchases, { 
  PurchasesOffering, 
  PurchasesPackage,
  CustomerInfo 
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { SubscriptionTier } from '../config/features';

const REVENUECAT_API_KEY = {
  ios: 'appl_YOUR_IOS_KEY_HERE',
  android: 'goog_YOUR_ANDROID_KEY_HERE',
};

class SubscriptionService {
  private initialized = false;

  async initialize(userId?: string) {
    if (this.initialized) return;

    try {
      const apiKey = Platform.OS === 'ios' 
        ? REVENUECAT_API_KEY.ios 
        : REVENUECAT_API_KEY.android;

      await Purchases.configure({ apiKey });
      
      if (userId) {
        await Purchases.logIn(userId);
      }

      this.initialized = true;
      console.log('RevenueCat initialized');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
    }
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return null;
    }
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return this.hasActiveSubscription(customerInfo);
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('User cancelled purchase');
      } else {
        console.error('Purchase failed:', error);
      }
      return false;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return this.hasActiveSubscription(customerInfo);
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return false;
    }
  }

  async getSubscriptionTier(): Promise<SubscriptionTier> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      
      if (customerInfo.entitlements.active['plus_access']) {
        return 'plus';
      }
      
      if (customerInfo.entitlements.active['premium_access']) {
        return 'premium';
      }
      
      return 'free';
    } catch (error) {
      console.error('Failed to get subscription tier:', error);
      return 'free';
    }
  }

  private hasActiveSubscription(customerInfo: CustomerInfo): boolean {
    return Object.keys(customerInfo.entitlements.active).length > 0;
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();
```

### Step B: Create Subscription Context

Create `/src/contexts/SubscriptionContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { SubscriptionTier } from '../config/features';

interface SubscriptionContextValue {
  tier: SubscriptionTier;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  tier: 'free',
  loading: true,
  refreshSubscription: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeSubscription();
  }, []);

  const initializeSubscription = async () => {
    try {
      await subscriptionService.initialize();
      const currentTier = await subscriptionService.getSubscriptionTier();
      setTier(currentTier);
    } catch (error) {
      console.error('Failed to initialize subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    setLoading(true);
    try {
      const currentTier = await subscriptionService.getSubscriptionTier();
      setTier(currentTier);
    } catch (error) {
      console.error('Failed to refresh subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SubscriptionContext.Provider value={{ tier, loading, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
```

### Step C: Create Paywall Screen

Create `/src/screens/PaywallScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PurchasesPackage } from 'react-native-purchases';
import { subscriptionService } from '../services/subscriptionService';
import { useSubscription } from '../contexts/SubscriptionContext';

export default function PaywallScreen({ navigation }: any) {
  const { refreshSubscription } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offering = await subscriptionService.getOfferings();
      if (offering) {
        setPackages(offering.availablePackages);
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasing(true);
    try {
      const success = await subscriptionService.purchasePackage(pkg);
      if (success) {
        await refreshSubscription();
        Alert.alert('Success!', 'Your subscription is now active.', [
          { text: 'Start Styling', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Purchase Failed', 'Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const success = await subscriptionService.restorePurchases();
      if (success) {
        await refreshSubscription();
        Alert.alert('Restored!', 'Your subscription has been restored.');
        navigation.goBack();
      } else {
        Alert.alert('No Purchases', 'No active subscriptions found.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2B1F1A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Unlock Your Full Style Potential</Text>
        
        {packages.map(pkg => (
          <TouchableOpacity
            key={pkg.identifier}
            style={styles.packageCard}
            onPress={() => handlePurchase(pkg)}
            disabled={purchasing}
          >
            <Text style={styles.packageTitle}>{pkg.product.title}</Text>
            <Text style={styles.packagePrice}>{pkg.product.priceString}/month</Text>
            <Text style={styles.packageDescription}>{pkg.product.description}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity onPress={handleRestore} disabled={purchasing}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#161616',
    marginBottom: 24,
    textAlign: 'center',
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DED7CF',
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2B1F1A',
    marginBottom: 8,
  },
  packageDescription: {
    fontSize: 14,
    color: '#5E5A55',
  },
  restoreText: {
    fontSize: 16,
    color: '#5E5A55',
    textAlign: 'center',
    marginTop: 20,
  },
});
```

---

## 5. Testing

### Step A: Sandbox Testing (iOS)

1. **Create Sandbox Tester**
   - App Store Connect → Users and Access → Sandbox Testers
   - Create test account: `test@styled.app`

2. **Sign Out of Production App Store**
   - Settings → App Store → Sign Out

3. **Test Purchase Flow**
   - Run app on device/simulator
   - Trigger paywall
   - Complete purchase with sandbox account
   - Verify subscription activates

4. **Test Scenarios**
   - ✅ New subscription purchase
   - ✅ Subscription cancellation
   - ✅ Restore purchases
   - ✅ Upgrade/downgrade
   - ✅ Free trial activation

### Step B: Production Testing

1. **TestFlight**
   - Upload build to TestFlight
   - Invite internal testers
   - Test with real App Store accounts

2. **Promo Codes**
   - Generate promo codes in App Store Connect
   - Distribute to beta testers
   - Verify full subscription flow

---

## 6. Environment Variables

Create `.env`:

```bash
# RevenueCat
REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxx
REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxx

# App Store
APP_STORE_TEAM_ID=XXXXXXXXXX
BUNDLE_IDENTIFIER=com.styled.app
```

---

## 7. Checklist Before Launch

- [ ] Subscription group created in App Store Connect
- [ ] All product IDs configured and approved
- [ ] Free trial period set (7 days recommended)
- [ ] Pricing reviewed for all regions
- [ ] RevenueCat project configured
- [ ] Entitlements mapped correctly
- [ ] Sandbox testing completed
- [ ] TestFlight testing completed
- [ ] Restore purchases working
- [ ] Subscription status syncs correctly
- [ ] Analytics tracking subscription events
- [ ] Privacy policy includes subscription terms
- [ ] Terms of service includes auto-renewal language

---

## 8. Required Legal Text

Add to app and App Store listing:

**Subscription Terms:**
```
Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase.

Privacy Policy: https://styled.app/privacy
Terms of Service: https://styled.app/terms
```

---

## Next Steps

1. Complete App Store Connect setup
2. Install and configure RevenueCat
3. Implement subscription service and context
4. Add paywall screen to navigation
5. Test thoroughly with sandbox accounts
6. Submit for App Store review

**Estimated Setup Time:** 4-6 hours
**Review Time:** 24-48 hours (first submission may take longer)
