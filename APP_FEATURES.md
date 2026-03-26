# Styled App - Features & Capabilities

**Last Updated:** February 11, 2026  
**Version:** 1.0.0  
**Platform:** iOS (Expo/React Native)

---

## 📱 Core App Information

### Tech Stack
- **Framework:** React Native with Expo SDK 54
- **Language:** TypeScript
- **Navigation:** React Navigation (Native Stack & Bottom Tabs)
- **State Management:** React Context API
- **Backend:** Firebase (Auth, Firestore)
- **Styling:** React Native StyleSheet
- **AI Integration:** OpenAI API

### Design System
- **Primary Colors:** #2B1F1A (dark), #F4F1ED (light background), #161616 (text)
- **Accent Colors:** #7B665A, #DED7CF, #5E5A55
- **Typography:** System fonts with accessibility-compliant contrast ratios
- **Accessibility:** WCAG AA compliant (4.5:1 for normal text, 3:1 for large text)

---

## 🎯 Main Features

### 1. Home Screen
**Location:** `src/screens/HomeScreen.tsx`

**Features:**
- Personalized discovery feed
- Three trending modules:
  - Trending This Month
  - Your Best Looks
  - Colors & Patterns
- Quick access hamburger menu
- **Style Profile Quick Access Button** ✨
  - Direct link to Style Profile Builder
  - Prominent placement below hero section
  - Icon: ✨ with white background and dark border

**Navigation:**
- Bottom tab navigation
- Pull-to-refresh functionality
- Modal menu with quick access items

---

### 2. Digital Closet
**Location:** `src/screens/ClosetScreen.tsx`

**Features:**
- Visual grid of all closet items
- Category filtering (All, Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories)
- Search functionality
- Add new items via camera or photo library
- Item detail view with:
  - Full image display
  - Category, color, brand information
  - Season tags
  - Worn count tracking
  - Last worn date
  - Edit and delete options
  - "Create Outfit" button

**Data Model:**
```typescript
interface ClosetItem {
  id: string;
  userId: string;
  imageUrl: string;
  category: ItemCategory;
  subcategory?: string;
  color: string;
  brand?: string;
  season: Season[];
  occasion?: string;
  tags: string[];
  wornCount: number;
  lastWornDate?: string;
  purchaseDate?: string;
  notes?: string;
  isFavorite?: boolean;
}
```

**Categories:** tops, bottoms, dresses, outerwear, shoes, accessories, bags

---

### 3. Outfit Builder
**Location:** `src/screens/OutfitBuilderScreen.tsx`

**Features:**
- **Two modes:**
  - Build from scratch (all closet items)
  - Build from source item (smart suggestions)
  
- **Occasion Filters:** 👕 Casual, 💼 Work, 🎩 Formal, ⚡ Athletic
  - Filter items by occasion type
  - "All" option to show everything
  - Active filter highlighted with dark background

- **Smart Pairing Algorithm:**
  - Category compatibility rules
  - Color harmony matching (based on color wheel theory)
  - Season compatibility
  - Scores and ranks suggestions

- **Interactive Features:**
  - Tap items to add/remove from outfit
  - Visual selection indicators
  - Selected items preview row
  - Save outfit with success animation

**Color Harmony Rules:**
- Neutrals (black, white, gray, beige) pair with everything
- Complementary color matching
- Analogous color schemes
- 20+ color combinations programmed

---

### 4. Style Profile Builder
**Location:** `src/screens/StyleProfileBuilderScreen.tsx`

**Features:**
- **7-step guided flow:**
  1. **Lifestyle:** Adjust wardrobe split (work, casual, social, travel)
  2. **Archetypes:** Select style vibes (classic, modern, edgy, etc.)
  3. **Colors:** Define primary, secondary, and stretch colors
  4. **Avoid Rules:** Specify items/styles to avoid
  5. **Fit Preferences:** Set fit preferences
  6. **Guidance Level:** Choose styling guidance amount
  7. **Review:** Confirm and save

- **Progress indicator**
- **Step-by-step validation**
- **Save to user profile**

**Style DNA Model:**
```typescript
interface StyleDNA {
  lifestyleWeights: {
    work: number;
    casual: number;
    social: number;
    travel: number;
  };
  styleArchetypes: string[];
  colorProfile: {
    primary: string[];
    secondary: string[];
    stretch: string[];
  };
  avoidRules: string[];
  fitPreferences: object;
  guidanceLevel: string;
}
```

---

### 5. Onboarding Flow
**Location:** `src/screens/onboarding/`

**Screens:**
1. Welcome
2. Lifestyle preferences
3. Style archetypes
4. Color preferences
5. Avoid rules (optional)
6. Guidance level
7. Complete

**Features:**
- Linear progression (can't skip steps)
- Gesture-based navigation disabled
- Saves complete StyleDNA to user profile
- Redirects to main app on completion

---

### 6. Smart Outfit Builder
**Location:** `src/screens/SmartOutfitBuilderScreen.tsx`

**Features:**
- AI-powered outfit generation
- Category-based item selection
- Visual outfit composition
- Save and share functionality

---

### 7. Styling Assistant
**Location:** `src/screens/StylingAssistantScreen.tsx`

**Features:**
- AI-powered styling recommendations
- StyleDNA validation
- Personalized outfit suggestions

---

### 8. Social Features

#### Social Feed
**Location:** `src/screens/SocialFeedScreen.tsx`
- Browse community posts
- Like and comment
- Share outfits

#### User Profiles
**Location:** `src/screens/UserProfileScreen.tsx`
- View user profiles
- Follow/unfollow
- Stats (posts, followers, following)
- Style tags

#### Messaging
**Location:** `src/screens/MessagesScreen.tsx`, `src/screens/ChatScreen.tsx`
- Direct messaging
- Real-time chat

---

### 9. Stylist Marketplace
**Location:** `src/screens/StylistMarketplaceScreen.tsx`

**Features:**
- Browse professional stylists
- Filter by specialty, price, rating
- Book sessions
- Video consultations
- Session types: closet audit, shopping assistance, event styling, wardrobe planning

---

### 10. Analytics & Insights

#### Closet Analytics
**Location:** `src/screens/ClosetAnalyticsScreen.tsx`
- Wardrobe composition breakdown
- Most/least worn items
- Cost per wear analysis
- Color distribution

#### Style Analysis
**Location:** `src/screens/StyleAnalysisScreen.tsx`
- Personal style insights
- Trend alignment

---

### 11. Shopping Features

#### Smart Recommendations
**Location:** `src/screens/SmartRecommendationsScreen.tsx`
- AI-powered product recommendations
- Occasion-based filtering
- Weather-aware suggestions

#### Shopping Assistant
**Location:** `src/screens/ShoppingAssistantScreen.tsx`
- AI chatbot for shopping help
- Product discovery

#### Secondhand Marketplace
**Location:** `src/screens/SecondhandMarketplaceScreen.tsx`
- Sustainable shopping options

---

### 12. Sustainability Features

#### Sustainability Dashboard
**Location:** `src/screens/SustainabilityScreen.tsx`
- Environmental impact tracking

#### Carbon Calculator
**Location:** `src/screens/CarbonCalculatorScreen.tsx`
- Calculate wardrobe carbon footprint

---

### 13. Advanced Features

#### AR Try-On
**Location:** `src/screens/ARTryOnScreen.tsx`
- Virtual try-on experience

#### Voice Commands
**Location:** `src/screens/VoiceCommandScreen.tsx`
- Voice-activated navigation and actions

#### Smart Mirror
**Location:** `src/screens/SmartMirrorScreen.tsx`
- Virtual outfit visualization

---

### 14. Subscription & Monetization

#### Subscription Tiers
**Location:** `src/services/subscriptionService.ts`
- **Free:** Basic features
- **Premium:** Advanced features
- **Pro:** All features + priority support

#### Subscription Management
**Documentation:** `docs/SUBSCRIPTION_MANAGEMENT_SCREEN.md`
- Dynamic status display (Free, Plus, Premium, Trial)
- Trial status with clear messaging
- Apple-compliant subscription controls
- Help and FAQ section
- Trust-based footer copy

---

### 15. Settings & Preferences

#### Language Settings
**Location:** `src/screens/LanguageSettingsScreen.tsx`

#### Accessibility Settings
**Location:** `src/screens/AccessibilitySettingsScreen.tsx`

#### Notifications
**Location:** `src/screens/PushNotificationsScreen.tsx`

---

## 🎨 UI Components

### Reusable Components
**Location:** `src/components/`

- **BackButton:** Consistent back navigation
- **Toast:** Success/error notifications
- **SuccessAnimation:** Celebration animations
- **TrialStatusCard:** Trial reminder UI

---

## 📊 Data & Services

### API Services
**Location:** `src/services/`

- **api.ts:** Main API client (REST)
- **firebaseApi.ts:** Firebase integration
- **closetService.ts:** Closet management
- **subscriptionService.ts:** Subscription handling
- **quickAccessService.ts:** Quick access menu
- **voiceCommandService.ts:** Voice command processing
- **aiStyleService.ts:** AI styling logic
- **recommendationEngine.ts:** Recommendation algorithms

### Context Providers
**Location:** `src/contexts/`

- **AuthContext:** Authentication state
- **OnboardingContext:** Onboarding flow state

---

## 📝 Documentation

### Subscription & Retention System
**Location:** `docs/`

All documentation follows a "monetization earned, not sold" philosophy with emphasis on user trust and Apple compliance.

1. **TRIAL_REMINDER_COPY.md** - Day 6/7 trial reminders
2. **BEHAVIOR_BASED_NUDGES.md** - Engagement-based upgrade prompts
3. **POST_CONVERSION_COPY.md** - Calm confidence messaging
4. **APPLE_SAFE_TRIAL_UX.md** - Compliance checklist
5. **TRUST_PHILOSOPHY.md** - Core brand values
6. **APP_STORE_REVIEW_REPLIES.md** - Professional review responses
7. **SUBSCRIPTION_MANAGEMENT_SCREEN.md** - Informational UI copy
8. **DAY_14_RETENTION_NUDGES.md** - Value reinforcement
9. **CHURN_EXIT_SURVEY.md** - Learning-focused exit survey
10. **BRAND_VOICE.md** - "Calm, confident presence"
11. **REACTIVATION_COPY.md** - Day 45-60 win-back messaging
12. **UPDATE_MESSAGING.md** - Grounded update announcements
13. **APP_STORE_COPY.md** - Metadata and descriptions
14. **ASO_REVIEW_KEYWORDS.md** - Review-driven optimization

---

## 🔐 Authentication

### Auth Screens
- **LoginScreen:** Email/password login
- **SignupScreen:** New user registration
- Firebase Authentication integration
- Session persistence

---

## 🎯 Navigation Structure

### Bottom Tabs
1. **Home** - Discovery feed
2. **Work** - Work outfit suggestions
3. **Going Out** - Social event outfits
4. **Closet** - Digital wardrobe
5. **More** - Additional features

### Stack Navigation
- Modal presentations
- Deep linking support
- Type-safe navigation with TypeScript

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. Closet items may not have `occasion` field populated
2. Firebase AsyncStorage warning (non-critical)
3. SafeAreaView deprecation warning

### Performance Considerations
- Large closets (100+ items) may have slight loading delay
- Image optimization recommended for better performance

---

## 🚀 Recent Updates

### Latest Changes (Feb 11, 2026)
1. ✅ Added occasion filters to Outfit Builder (Casual, Work, Formal, Athletic)
2. ✅ Added Style Profile quick access button to Home screen
3. ✅ Fixed React Hooks errors in StyleProfileBuilderScreen
4. ✅ Added `occasion` field to ClosetItem type
5. ✅ Improved Outfit Builder error handling and debugging
6. ✅ Enhanced empty state messaging

### Previous Updates (Nov 26, 2025)
1. ✅ TypeScript type system improvements
2. ✅ Added missing fields to Look and ClosetItem interfaces
3. ✅ Eliminated 15+ TypeScript errors

---

## 📈 Future Roadmap

### Planned Features
- Enhanced AR try-on capabilities
- Machine learning trend prediction
- Apple Watch integration
- Widget support
- Siri Shortcuts
- Offline mode
- Multi-language support

---

## 🔧 Development

### Environment Setup
- Node.js and npm/yarn
- Expo CLI
- iOS Simulator / Android Emulator
- Firebase project configuration

### Key Commands
```bash
npx expo start          # Start development server
npx expo start --ios    # Open iOS simulator
npx expo start --android # Open Android emulator
```

### Environment Variables
- EXPO_PUBLIC_FIREBASE_API_KEY
- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
- EXPO_PUBLIC_FIREBASE_PROJECT_ID
- EXPO_PUBLIC_OPENAI_API_KEY
- EXPO_PUBLIC_API_URL

---

## 📄 License & Credits

**App Name:** Styled  
**Platform:** iOS (React Native/Expo)  
**Design Philosophy:** Trust-based, user-first, accessibility-focused

---

*This document is automatically maintained and represents the single source of truth for the Styled app's features and capabilities.*
