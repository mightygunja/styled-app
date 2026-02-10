# Testing Guide - Phase 1 Features

## Prerequisites
- Backend running: `cd c:\dev\Styled\backend && npm run dev`
- Frontend running: `cd c:\dev\Styled\styled-app && npm start` (press `w` for web)
- Browser console open (F12)

---

## Test 1: Tap Look Card → Opens Detail Screen

### Steps:
1. Open the app in your browser
2. You should see "Cozy Weekend Vibes" look card on Home tab
3. **Click anywhere on the card** (not the heart icon)
4. Should navigate to detail screen

### Expected Result:
- ✅ Detail screen loads
- ✅ Shows full look image
- ✅ Shows look title and description
- ✅ Shows trend palette with color swatches
- ✅ Shows all items with images

### If It Doesn't Work:
**Check browser console for:**
- "Fetching look detail for ID: [some-id]"
- "Look detail response: {...}"
- Any error messages

**Common Issues:**
- If you see "Look not found" → Backend might not have seeded data
- If nothing happens → Navigation might not be set up
- If you see network error → Backend not running

### Fix:
Run this in backend terminal:
```bash
npm run prisma:seed
```

---

## Test 2: Tap Heart Icon → Favorites/Unfavorites

### Steps:
1. On Home screen, find the **heart icon** (🤍) in top-right of look card
2. **Tap the heart icon** (not the card itself)
3. Should see alert: "Look added to favorites!"
4. Heart should change to ❤️
5. Tap again → "Look removed from favorites!"

### Expected Result:
- ✅ Alert appears confirming action
- ✅ Heart icon toggles between 🤍 and ❤️
- ✅ No navigation happens (stays on same screen)

### If It Doesn't Work:
**Check browser console for:**
- "Toggling favorite for look: [some-id]"
- "Favorite response: {...}"
- Any error messages

**Common Issues:**
- If card navigates instead → Event propagation issue (should be fixed now)
- If no alert appears → API call failing
- If error about user → Mock user ID issue

### Debug:
Check if backend endpoint works:
```bash
# In a new terminal or browser
curl -X POST http://localhost:3000/api/looks/[LOOK_ID]/favorite \
  -H "Content-Type: application/json" \
  -d '{"userId":"mock-user-123"}'
```

---

## Test 3: Tap "Shop Now" → Opens Retailer Link

### Steps:
1. Tap a look card to open detail screen
2. Scroll down to "Shop This Look" section
3. Find an item card
4. **Tap "Shop Now →" button**
5. Should open external link in new browser tab

### Expected Result:
- ✅ Console shows: "Shopping item: [item name]"
- ✅ Console shows: "Can open URL: true"
- ✅ New browser tab opens with retailer website
- ✅ No error alerts

### If It Doesn't Work:
**Check browser console for:**
- "Shopping item: [name] Link: [url]"
- "Can open URL: [true/false]"
- Any error messages

**Common Issues:**
- Alert "No affiliate link available" → Item doesn't have link in database
- Alert "Invalid link URL" → Link format is wrong
- Alert "Failed to open shop link" → Browser blocking popup

### Fix for Missing Links:
The seed data should have affiliate links. Check database:
```bash
# In backend terminal
npx prisma studio
# Navigate to Item table, check affiliateLink column
```

---

## Quick Diagnostic Commands

### Check if backend is responding:
```bash
# In browser or new terminal
curl http://localhost:3000/api/looks?occasion=home
```
Should return JSON with looks array.

### Check specific look:
```bash
curl http://localhost:3000/api/looks/[LOOK_ID]
```
Should return look with items array.

### Check if seed data exists:
```bash
# In backend terminal
npx prisma studio
```
- Check Look table → Should have 3 looks
- Check Item table → Should have 8 items
- Check LookItem table → Should have relationships

---

## Browser Console Commands

Open browser console (F12) and try:

```javascript
// Check if API is reachable
fetch('http://localhost:3000/api/looks?occasion=home')
  .then(r => r.json())
  .then(d => console.log('Looks:', d));

// Check specific look
fetch('http://localhost:3000/api/looks/[LOOK_ID]')
  .then(r => r.json())
  .then(d => console.log('Look detail:', d));
```

---

## Expected Console Output

### When app loads:
```
Fetching home looks...
API Response: {success: true, data: [...], pagination: {...}}
Looks data: [...]
```

### When tapping look card:
```
Fetching look detail for ID: clxxx...
Look detail response: {success: true, data: {...}}
Look data: {id: "...", title: "...", items: [...]}
```

### When tapping heart:
```
Toggling favorite for look: clxxx...
Favorite response: {success: true, isFavorited: true, message: "..."}
```

### When tapping Shop Now:
```
Shopping item: Oversized Knit Sweater Link: https://...
Can open URL: true
```

---

## If Nothing Works

### 1. Restart Backend:
```bash
cd c:\dev\Styled\backend
# Ctrl+C to stop
npm run dev
```

### 2. Restart Frontend:
```bash
cd c:\dev\Styled\styled-app
# Ctrl+C to stop
npm start
# Press 'w' for web
```

### 3. Clear Browser Cache:
- Press Ctrl+Shift+R (hard refresh)
- Or clear cache in DevTools

### 4. Re-seed Database:
```bash
cd c:\dev\Styled\backend
npm run prisma:seed
```

### 5. Check Ports:
- Backend should be on: http://localhost:3000
- Frontend should be on: http://localhost:8082 (or 8081)

---

## Success Criteria

✅ **All 3 features working:**
1. Tapping look card opens detail screen with all items
2. Tapping heart icon favorites/unfavorites (with alert)
3. Tapping "Shop Now" opens retailer link in new tab

If all 3 work → Phase 1 is fully functional! 🎉

If any fail → Check the specific test section above for debugging steps.
