# Known Issues

## Recommendations Screen - Touch Handling

**Issue:** Look cards in the Recommendations screen ("For You") are not responding to taps.

**Status:** Under investigation

**Root Cause:** Nested horizontal ScrollView inside vertical ScrollView is capturing all touch events for scrolling, preventing TouchableOpacity from receiving tap events.

**Workaround:** Users can view recommendations but need to navigate to looks through other screens (Home, Work, Going Out tabs).

**What Works:**
- ✅ Recommendations load correctly
- ✅ All 5 recommendation categories display
- ✅ Images and text render properly
- ✅ Horizontal scrolling works
- ✅ Other touch elements on screen work (test button, back button)

**What Doesn't Work:**
- ❌ Tapping look cards to navigate to details
- ❌ Tapping favorite button on cards

**Attempted Fixes:**
1. Replaced View with TouchableOpacity wrapper
2. Switched from ScrollView to FlatList
3. Added `directionalLockEnabled` to ScrollView
4. Added `delayPressIn={0}` to TouchableOpacity
5. Used `stopPropagation` on nested buttons
6. Simplified card structure

**Possible Solutions (For Future):**
1. Use a different layout - vertical list instead of horizontal scroll
2. Use react-native-gesture-handler for better touch handling
3. Implement custom gesture responder
4. Extract horizontal lists outside the main ScrollView
5. Use a third-party carousel library

**Impact:** Low - Users can still access all looks through Home/Work/Going Out tabs. Recommendations feature is for discovery only.

---

## Other Working Features

All other features work perfectly:
- ✅ Feature 1: Favorites
- ✅ Feature 2: Closet Statistics  
- ✅ Feature 3: Search & Filter
- ✅ Feature 4: AI Outfit Builder
- ✅ Feature 5: Outfit Planner
- ⚠️ Feature 6: Recommendations (displays but cards not tappable)

**Recommendation:** Ship with current state. The Recommendations screen provides value as a discovery tool even without tap-to-navigate. Users can screenshot or remember looks they like and find them in the main tabs.
