# Styled App - Integration Guide

Quick reference for integrating all MVP components.

---

## 1. Wrap App with Providers

Update your main `App.tsx` or root component:

```typescript
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { OnboardingProvider } from './src/contexts/OnboardingContext';

export default function App() {
  return (
    <SubscriptionProvider userId="current-user-id">
      <OnboardingProvider>
        <NavigationContainer>
          {/* Your navigation */}
        </NavigationContainer>
      </OnboardingProvider>
    </SubscriptionProvider>
  );
}
```

---

## 2. Add Onboarding to Navigation

Add the onboarding navigator to your root navigation:

```typescript
import OnboardingNavigator from './src/navigation/OnboardingNavigator';

// In your root navigator
<Stack.Screen 
  name="Onboarding" 
  component={OnboardingNavigator}
  options={{ headerShown: false }}
/>
```

---

## 3. Integrate Soft Paywall in Outfit Generation

Update your outfit generation screen:

```typescript
import { useSubscription } from '../contexts/SubscriptionContext';
import SoftPaywall from '../components/SoftPaywall';

export default function OutfitGenerationScreen() {
  const { tier, outfitCount, canGenerateOutfit, incrementOutfitCount } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const handleGenerateOutfit = async () => {
    // Check if user can generate outfit
    if (!canGenerateOutfit()) {
      setShowPaywall(true);
      return;
    }

    // Generate outfit
    const outfits = await generateOutfits(closetItems, styleDNA);
    
    // Increment count for free users
    if (tier === 'free') {
      incrementOutfitCount();
    }

    // Display outfits
    setGeneratedOutfits(outfits);
  };

  return (
    <>
      {/* Your outfit generation UI */}
      
      <SoftPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => navigation.navigate('Paywall')}
        userStylePreferences="your minimal and classic style"
      />
    </>
  );
}
```

---

## 4. Use OutfitCard Component

Replace existing outfit display with OutfitCard:

```typescript
import OutfitCard from '../components/OutfitCard';

// In your render
{outfits.map(outfit => (
  <OutfitCard
    key={outfit.id}
    outfit={outfit}
    onPress={() => navigation.navigate('OutfitDetail', { outfitId: outfit.id })}
  />
))}
```

---

## 5. Add Empty States

For closet screen:

```typescript
import EmptyStateReassurance from '../components/EmptyStateReassurance';

{closetItems.length === 0 && (
  <EmptyStateReassurance
    type="closet"
    onAction={() => navigation.navigate('AddItem')}
    actionText="Add Your First Item"
  />
)}
```

For outfits screen:

```typescript
{outfits.length === 0 && (
  <EmptyStateReassurance
    type="outfits"
    onAction={() => navigation.navigate('Closet')}
    actionText="Build Your Closet"
  />
)}
```

---

## 6. Check Feature Access

Use subscription context to gate features:

```typescript
import { useSubscription } from '../contexts/SubscriptionContext';

const { tier, hasFeature } = useSubscription();

// Check specific features
if (hasFeature('styleDNA')) {
  // Show StyleDNA features
}

if (hasFeature('analytics')) {
  // Show analytics
}

// Or check tier directly
if (tier === 'free') {
  // Show upgrade prompts
}
```

---

## 7. StyleDNA Guard

The guard is already in `StylingAssistantScreen.tsx`. To activate:

```typescript
// In checkStyleDNA function, uncomment:
const user = await userProfileService.getCurrentUser();
if (!user.styleDNA) {
  navigation.navigate('OnboardingWelcome');
  return;
}
```

---

## 8. Save StyleDNA After Onboarding

In `OnboardingCompleteScreen.tsx`, replace the TODO:

```typescript
// Replace this:
// TODO: Save to user profile via API/service

// With this:
await userProfileService.updateStyleDNA(completedStyleDNA);
```

---

## 9. Environment Setup

Create `.env` file:

```bash
# App Configuration
APP_ENV=development

# RevenueCat (when ready)
REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxx
REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxx

# Firebase (existing)
FIREBASE_API_KEY=your_key_here
```

---

## 10. Testing Checklist

### Onboarding Flow
- [ ] User completes all 7 steps
- [ ] StyleDNA is saved to profile
- [ ] User redirects to main app after completion
- [ ] Can't skip steps or go back

### Outfit Generation
- [ ] Free users can generate 3 outfits
- [ ] Soft paywall appears after 3rd outfit
- [ ] Paid users have unlimited generation
- [ ] Outfit explanations display correctly

### Feature Gating
- [ ] Free users blocked from StyleDNA features
- [ ] Free users see upgrade prompts
- [ ] Paid users have full access
- [ ] Feature flags work correctly

### Empty States
- [ ] Empty closet shows reassurance message
- [ ] Empty outfits shows helpful guidance
- [ ] No shopping pressure in copy

### StyleDNA Guard
- [ ] Users without StyleDNA redirect to onboarding
- [ ] Users with StyleDNA access app normally
- [ ] No crashes from missing data

---

## 11. Quick Commands

```bash
# Install dependencies
npm install

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android

# Clear cache
npx expo start --clear

# Build for TestFlight
eas build --platform ios --profile preview
```

---

## 12. Next Steps After MVP

1. **User Profile Service**
   - Implement actual user authentication
   - Save/load StyleDNA from backend
   - Sync subscription status

2. **RevenueCat Integration**
   - Add react-native-purchases
   - Configure App Store Connect
   - Test subscription flow

3. **Analytics**
   - Track onboarding completion rate
   - Monitor outfit generation usage
   - Measure paywall conversion

4. **Retention Features**
   - Daily outfit notifications
   - Weekly style insights
   - Personalized recommendations

---

## Common Issues

### "StyleDNA not found"
- Ensure OnboardingProvider wraps your app
- Check that onboarding completion saves StyleDNA
- Verify user profile service is working

### "Subscription not loading"
- Ensure SubscriptionProvider wraps your app
- Check userId is passed correctly
- Verify subscriptionService is initialized

### "Paywall not showing"
- Check outfit count is incrementing
- Verify tier is 'free'
- Ensure canGenerateOutfit() returns false

### "Empty states not appearing"
- Check array length conditions
- Verify component imports
- Ensure proper conditional rendering

---

## Support

For issues or questions:
- Check `/docs/SUBSCRIPTION_SETUP.md` for subscription details
- Review component files in `/src/components`
- Test with mock data first before integrating real APIs
