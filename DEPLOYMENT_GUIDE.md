# 🚀 Deployment Guide - Styled App

## Overview
This guide covers building and deploying the Styled fashion app to production.

---

## 📋 Pre-Deployment Checklist

### **1. Code Quality**
- [x] All TypeScript errors resolved
- [x] All animations tested
- [x] Photo upload tested on iOS and Android
- [x] Success states working
- [x] Toast notifications working
- [ ] All API endpoints tested
- [ ] Error handling verified
- [ ] Loading states verified

### **2. Configuration**
- [ ] Firebase config updated with production keys
- [ ] API URLs point to production
- [ ] Remove `skipAuth = true` (enable real auth)
- [ ] Update app.json with correct metadata
- [ ] Set correct bundle identifiers

### **3. Assets**
- [ ] App icon (1024x1024)
- [ ] Splash screen
- [ ] App store screenshots
- [ ] Privacy policy URL
- [ ] Terms of service URL

### **4. Testing**
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Test photo upload
- [ ] Test all animations
- [ ] Test offline behavior
- [ ] Test error states

---

## 🔧 Build Configuration

### **Update app.json**

```json
{
  "expo": {
    "name": "Styled",
    "slug": "styled-fashion-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.styled",
      "buildNumber": "1",
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "Styled needs access to your photo library to upload clothing items.",
        "NSCameraUsageDescription": "Styled needs access to your camera to take photos of clothing items."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.styled",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Styled needs access to your photos to upload clothing items.",
          "cameraPermission": "Styled needs access to your camera to take photos of clothing items."
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

---

## 🏗️ Build Process

### **Option 1: Expo Application Services (EAS) - Recommended**

#### **1. Install EAS CLI**
```bash
npm install -g eas-cli
```

#### **2. Login to Expo**
```bash
eas login
```

#### **3. Configure EAS**
```bash
cd styled-app
eas build:configure
```

#### **4. Build for iOS**
```bash
# Development build
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
```

#### **5. Build for Android**
```bash
# Development build
eas build --platform android --profile development

# Production build
eas build --platform android --profile production
```

#### **6. Submit to App Stores**
```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

---

### **Option 2: Local Build (Advanced)**

#### **iOS (Requires Mac)**
```bash
cd styled-app
expo prebuild --platform ios
cd ios
pod install
open Styled.xcworkspace
# Build in Xcode
```

#### **Android**
```bash
cd styled-app
expo prebuild --platform android
cd android
./gradlew assembleRelease
# APK will be in android/app/build/outputs/apk/release/
```

---

## 🔐 Environment Configuration

### **Create .env file**
```bash
# Firebase Production
FIREBASE_API_KEY=your_production_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# API Endpoints
API_BASE_URL=https://your-api.com/api
```

### **Update firebase.ts**
```typescript
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

---

## 📱 App Store Submission

### **iOS App Store**

#### **1. Prepare Assets**
- App icon (1024x1024 PNG, no alpha)
- Screenshots (6.5", 5.5", 12.9" iPad)
- App preview video (optional)

#### **2. App Store Connect**
1. Create app in App Store Connect
2. Fill in app information
3. Add screenshots
4. Set pricing
5. Submit for review

#### **3. Required Information**
- App name
- Subtitle
- Description
- Keywords
- Support URL
- Privacy policy URL
- Category: Lifestyle
- Age rating: 4+

### **Android Play Store**

#### **1. Prepare Assets**
- App icon (512x512 PNG)
- Feature graphic (1024x500)
- Screenshots (phone, 7" tablet, 10" tablet)
- Promo video (optional)

#### **2. Play Console**
1. Create app in Play Console
2. Fill in store listing
3. Add screenshots
4. Set pricing
5. Submit for review

#### **3. Required Information**
- App name
- Short description (80 chars)
- Full description (4000 chars)
- Category: Lifestyle
- Content rating
- Privacy policy URL

---

## 🧪 Testing Builds

### **Internal Testing (TestFlight/Internal Testing)**

#### **iOS TestFlight**
```bash
eas build --platform ios --profile preview
eas submit --platform ios --latest
```
Add testers in App Store Connect → TestFlight

#### **Android Internal Testing**
```bash
eas build --platform android --profile preview
eas submit --platform android --latest
```
Add testers in Play Console → Internal Testing

---

## 📊 Analytics & Monitoring

### **Recommended Services**
1. **Firebase Analytics** - User behavior
2. **Sentry** - Error tracking
3. **Mixpanel** - Advanced analytics
4. **Firebase Crashlytics** - Crash reporting

### **Setup Firebase Analytics**
```bash
npm install @react-native-firebase/analytics
```

```typescript
// src/utils/analytics.ts
import analytics from '@react-native-firebase/analytics';

export const logEvent = (eventName: string, params?: object) => {
  analytics().logEvent(eventName, params);
};

export const logScreenView = (screenName: string) => {
  analytics().logScreenView({
    screen_name: screenName,
    screen_class: screenName,
  });
};
```

---

## 🔄 CI/CD Pipeline

### **GitHub Actions Example**

```yaml
# .github/workflows/build.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd styled-app
          npm install
      
      - name: Run tests
        run: |
          cd styled-app
          npm test
      
      - name: Build iOS
        if: github.ref == 'refs/heads/main'
        run: |
          cd styled-app
          eas build --platform ios --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
      
      - name: Build Android
        if: github.ref == 'refs/heads/main'
        run: |
          cd styled-app
          eas build --platform android --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

## 🚨 Post-Deployment

### **1. Monitor Crashes**
- Check Firebase Crashlytics daily
- Review Sentry errors
- Monitor app store reviews

### **2. Performance**
- Check Firebase Performance
- Monitor API response times
- Track photo upload success rates

### **3. User Feedback**
- Monitor app store reviews
- Track support emails
- Analyze user behavior

### **4. Updates**
- Plan OTA updates for bug fixes
- Schedule major updates
- Communicate changes to users

---

## 📝 Version Management

### **Semantic Versioning**
- **Major (1.x.x)**: Breaking changes
- **Minor (x.1.x)**: New features
- **Patch (x.x.1)**: Bug fixes

### **Update Process**
1. Update version in `app.json`
2. Update build number (iOS) / version code (Android)
3. Create git tag
4. Build and submit
5. Create release notes

---

## 🔒 Security Checklist

- [ ] All API keys in environment variables
- [ ] Firebase security rules configured
- [ ] HTTPS only for all requests
- [ ] User data encrypted
- [ ] Sensitive data not logged
- [ ] Authentication required for protected routes
- [ ] Rate limiting on API
- [ ] Input validation on all forms

---

## 📞 Support

### **App Store Metadata**
- **Support Email**: support@styled.app
- **Support URL**: https://styled.app/support
- **Privacy Policy**: https://styled.app/privacy
- **Terms of Service**: https://styled.app/terms

---

## 🎉 Launch Checklist

### **Pre-Launch**
- [ ] All features tested
- [ ] Performance optimized
- [ ] Analytics configured
- [ ] Error tracking setup
- [ ] App store listings complete
- [ ] Screenshots uploaded
- [ ] Privacy policy published
- [ ] Support email setup

### **Launch Day**
- [ ] Submit to app stores
- [ ] Monitor for crashes
- [ ] Respond to reviews
- [ ] Track analytics
- [ ] Prepare for user support

### **Post-Launch**
- [ ] Gather user feedback
- [ ] Plan first update
- [ ] Monitor metrics
- [ ] Engage with users
- [ ] Iterate based on data

---

**Good luck with your launch! 🚀**
