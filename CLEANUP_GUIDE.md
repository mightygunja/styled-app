# Option 4: Clean Up 🧹

## Overview
This guide covers cleaning up the codebase after the Firebase migration.

---

## 🗑️ Files/Folders to Delete

### 1. Old Backend (PostgreSQL/Express)
**Location:** `backend/`

**What to delete:**
```
backend/
├── src/
├── prisma/
├── node_modules/
├── package.json
├── tsconfig.json
└── .env
```

**Why:** We've migrated to Firebase. The old backend is no longer needed.

**Command:**
```bash
# From project root
rm -rf backend/
```

**⚠️ Warning:** Make sure Firebase migration is complete and tested before deleting!

---

### 2. Old API Code
**Location:** `styled-app/src/services/api.ts`

**What to clean:**
- Remove or comment out old REST API code
- Keep only Firebase API exports
- Remove unused imports

**Before:**
```typescript
// Old REST API (commented out)
const oldPaletteAPI = {
  getAll: async () => {
    const response = await axios.get(`${API_URL}/palettes`);
    return response.data;
  },
};

// Firebase API (keep this)
export const paletteAPI = {
  getActive: async () => {
    const palettes = await palettesService.getActive();
    return { success: true, data: palettes };
  },
};
```

**After:**
```typescript
// Only Firebase API
export const paletteAPI = {
  getActive: async () => {
    const palettes = await palettesService.getActive();
    return { success: true, data: palettes };
  },
};
```

---

### 3. Unused Dependencies

**Check and remove:**
```bash
cd styled-app
npm uninstall axios  # If not used anymore
npm uninstall @prisma/client  # Backend dependency
```

**Review package.json for:**
- Unused testing libraries
- Deprecated packages
- Duplicate functionality

---

### 4. Development/Test Files

**Files to review:**
```
styled-app/
├── scripts/
│   ├── seedFirestore.ts  # Keep for re-seeding
│   ├── addMoreLooks.ts   # Keep for adding content
│   └── reseedWithMatchingItems.ts  # Keep for re-seeding
├── PROMPT_*.md  # Archive or delete
├── *_COMPLETE.md  # Archive or delete
└── test-*.ts  # Delete test scripts
```

**Recommendation:** Move documentation to `docs/` folder

---

## 📝 Code Cleanup

### 1. Remove MOCK_USER_ID

**Find and replace in all files:**
```typescript
// Find:
import { MOCK_USER_ID } from '../services/api';
const userId = MOCK_USER_ID;

// Replace with:
import { getCurrentUserId } from '../utils/auth';
const userId = getCurrentUserId();
```

**Files to update:**
- `src/screens/HomeScreen.tsx`
- `src/screens/WorkScreen.tsx`
- `src/screens/GoingOutScreen.tsx`
- `src/screens/ClosetScreen.tsx`
- `src/screens/LookDetailScreen.tsx`
- `src/screens/AddClosetItemScreen.tsx`
- `src/screens/ClosetItemDetailScreen.tsx`
- `src/screens/FavoritesScreen.tsx`
- `src/screens/OutfitBuilderScreen.tsx`

---

### 2. Fix TypeScript Errors

**Current errors to fix:**
```typescript
// Error 1: Missing properties
interface ClosetItem {
  id: string;
  imageUrl: string;
  category: string;
  color: string;
  brand?: string;
  wornCount: number;
  // Add missing:
  isFavorite?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Error 2: Implicit any types
// Before:
items.map((item, index) => { ... })

// After:
items.map((item: ClosetItem, index: number) => { ... })
```

---

### 3. Remove Console Logs

**Production-ready logging:**
```typescript
// Development
if (__DEV__) {
  console.log('Debug info:', data);
}

// Or use a logging service
import logger from './utils/logger';
logger.info('User action', { userId, action });
```

**Find and remove:**
```bash
# Find all console.logs
grep -r "console.log" src/

# Remove or replace with proper logging
```

---

### 4. Organize Imports

**Use consistent import order:**
```typescript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. React Native imports
import { View, Text, StyleSheet } from 'react-native';

// 3. Third-party imports
import { useNavigation } from '@react-navigation/native';

// 4. Local imports
import { useAuth } from '../contexts/AuthContext';
import { getCurrentUserId } from '../utils/auth';
import { closetAPI } from '../services/api';

// 5. Type imports
import type { ClosetItem } from '../types';
```

---

## 📁 File Organization

### Recommended Structure:
```
styled-app/
├── src/
│   ├── components/       # Reusable components
│   ├── screens/          # Screen components
│   ├── navigation/       # Navigation config
│   ├── contexts/         # React contexts
│   ├── services/         # API services
│   │   ├── firebaseApi.ts
│   │   ├── firestore.ts
│   │   └── firebaseStorage.ts
│   ├── utils/            # Utility functions
│   │   ├── auth.ts
│   │   └── helpers.ts
│   ├── hooks/            # Custom hooks
│   ├── types/            # TypeScript types
│   ├── constants/        # App constants
│   └── config/           # Configuration
│       └── firebase.ts
├── assets/               # Images, fonts
├── docs/                 # Documentation
│   ├── FEATURES_1-6_COMPLETE.md
│   ├── FIREBASE_AUTH_SETUP.md
│   ├── FIREBASE_MIGRATION_COMPLETE.md
│   └── POLISH_AND_OPTIMIZE.md
└── scripts/              # Utility scripts
    ├── seedFirestore.ts
    └── addMoreLooks.ts
```

---

## 🔍 Code Review Checklist

### Security:
- [ ] No API keys in code
- [ ] Environment variables properly used
- [ ] Firestore rules are secure
- [ ] Storage rules are secure
- [ ] No sensitive data in logs

### Performance:
- [ ] Images are optimized
- [ ] Lists use FlatList
- [ ] Components are memoized where needed
- [ ] No memory leaks
- [ ] Proper cleanup in useEffect

### Code Quality:
- [ ] No TypeScript errors
- [ ] No unused imports
- [ ] No console.logs in production
- [ ] Consistent code style
- [ ] Proper error handling

### Documentation:
- [ ] README is up to date
- [ ] API documentation exists
- [ ] Setup instructions are clear
- [ ] Environment variables documented
- [ ] Architecture documented

---

## 📋 Cleanup Commands

### 1. Remove old backend:
```bash
cd /path/to/Styled
rm -rf backend/
```

### 2. Clean node_modules:
```bash
cd styled-app
rm -rf node_modules
npm install
```

### 3. Clean build artifacts:
```bash
cd styled-app
rm -rf .expo
rm -rf android/build
rm -rf ios/build
```

### 4. Organize documentation:
```bash
mkdir -p docs
mv *_COMPLETE.md docs/
mv *_SETUP.md docs/
mv *_GUIDE.md docs/
```

### 5. Run linter:
```bash
cd styled-app
npm run lint
npm run lint -- --fix  # Auto-fix issues
```

### 6. Format code:
```bash
cd styled-app
npx prettier --write "src/**/*.{ts,tsx}"
```

---

## 🎯 Final Checklist

### Before Cleanup:
- [ ] Firebase migration is complete
- [ ] All features are tested
- [ ] Authentication is working
- [ ] Data is backed up
- [ ] Team is notified

### During Cleanup:
- [ ] Delete old backend folder
- [ ] Remove unused dependencies
- [ ] Fix TypeScript errors
- [ ] Remove console.logs
- [ ] Organize imports
- [ ] Move documentation to docs/
- [ ] Update README

### After Cleanup:
- [ ] Test app thoroughly
- [ ] Verify all features work
- [ ] Check bundle size
- [ ] Run performance tests
- [ ] Update deployment scripts
- [ ] Create git tag for release

---

## 📊 Before/After Comparison

### Before Cleanup:
```
Project Size: ~500 MB
- backend/ (150 MB)
- node_modules/ (300 MB)
- Unused files (50 MB)

Files: 500+
TypeScript Errors: 15
Console.logs: 50+
```

### After Cleanup:
```
Project Size: ~300 MB
- No backend
- Optimized dependencies
- Clean codebase

Files: 300
TypeScript Errors: 0
Console.logs: 0 (production)
```

---

## 🚀 Post-Cleanup Tasks

1. **Update README.md**
   - Remove backend setup instructions
   - Add Firebase setup instructions
   - Update architecture diagram

2. **Update package.json**
   - Remove unused scripts
   - Update dependencies
   - Add new scripts if needed

3. **Create Release Notes**
   - Document breaking changes
   - List new features
   - Migration guide for users

4. **Deploy**
   - Test in staging
   - Deploy to production
   - Monitor for issues

---

## ✅ Success Criteria

Cleanup is complete when:
- ✅ Old backend is deleted
- ✅ No TypeScript errors
- ✅ No unused dependencies
- ✅ Documentation is organized
- ✅ Code is formatted consistently
- ✅ All tests pass
- ✅ App runs smoothly
- ✅ Bundle size is optimized

---

## 🎉 You're Done!

Your codebase is now:
- 🧹 Clean and organized
- 🚀 Optimized for performance
- 📝 Well documented
- 🔒 Secure
- 🎯 Production-ready

**Next:** Deploy to production and celebrate! 🎊
