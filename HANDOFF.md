# Styled App — Session Handoff

Written 2026-08-02 to carry context into a fresh Claude session/account. The code, Firebase project, and EAS/Expo account are all unaffected by which Claude account is used — this file exists purely to save the next session from re-discovering the "why" behind recent decisions.

## Project

- React Native / Expo (SDK 54) app called **Styled** — AI-powered personal styling/wardrobe app.
- Backend: Firebase (Firestore, Cloud Functions, Storage, Auth), project id `styled-866b7`.
- Deploy target: iOS App Store (not yet live) via EAS Build/Submit, project slug `styled-app-tf`, owner `adilgunja`.
- `eas.json` uses `"appVersionSource": "remote"` — build numbers live on EAS's servers, **not** in `app.json`. Current iOS build number as of this session: **2** (was about to be manually set to 3 after a failed auto-increment run wasted a build).

## What changed this session (most recent work, newest first)

1. **Occasion-repetition bug in "Dress Me Today"** (`src/services/recommendationEngine.ts`, `src/screens/HomeScreen.tsx`, `src/types/index.ts`): the `Item` type used for recommendations had no `occasion` field, so each closet item's real `occasion` tag (which exists on `ClosetItem` in Firestore) was silently dropped before scoring — occasion switching only affected weak keyword-regex matching. Added `occasion?: string` to `Item`, wired it through in `HomeScreen`'s item-mapping, and gave a real occasion-tag match a strong +35 score bonus. Also fixed the tie-breaker: previously fell back to alphabetical `item.id` sort (occasion-independent) whenever scores tied — now uses an occasion-dependent hash so different occasion tabs actually surface different items even for closet items with no tags at all.

2. **AI Stylist chat now uses real color/body analysis** (`functions/src/index.ts` `chatWithStylist`, `src/services/stylingAssistantService.ts`): the app already has AI-driven Color Season Analysis (`ColorAnalysisScreen`) and Body & Fit Analysis (`BodyAnalysisScreen`), but neither was reaching the chat prompt — only generic hand-picked colors and a flat highlight/downplay list were sent. Now the color season (with undertone, flattering palette, colors to avoid) and body type (with per-category silhouette guidance: necklines/cuts for tops/bottoms/dresses/shoes/outerwear) are included and explicitly weighted as authoritative signals. **This required a Cloud Function deploy, which was done** (`firebase deploy --only functions:chatWithStylist` — succeeded).

3. **Chat screen bugs — several rounds, final state below**: went through multiple wrong turns before landing on the right fix, worth knowing so it isn't repeated:
   - Root problem was ultimately **not** styling/padding at all — it was architectural. Using an `inverted` `FlatList` for the chat message list is a well-known bad idea in React Native when list items contain async-loading images (like the outfit thumbnails): inverted lists don't reliably remeasure cell height once content resizes, causing large stale blank gaps.
   - **Final, working implementation**: plain `ScrollView` (not `FlatList`) with `.map()` over messages, `onContentSizeChange` re-triggers `scrollToEnd()` so it stays anchored at the bottom as async images load. The outfit item thumbnails no longer use a nested horizontal `ScrollView` either — they use `flexWrap` so the whole outfit is always visible with no nested-scroll measurement risk.
   - Also fixed: AI response text was rendering in an italic serif font (unreadable at paragraph length) — now regular sans, matching the user's own message bubbles.

4. **Shop screen fixes**:
   - Category filter chips ("All", "Tops", etc.) were rendering with clipped/cut-off text on iOS — root cause was the shared `Chip` component's label `Text` having no explicit `lineHeight`, relying on a custom font's (Instrument Sans via `expo-google-fonts`) auto-computed metrics, which iOS sometimes gets wrong and clips. Fixed in `src/components/Chip.tsx` with an explicit `lineHeight` and centered alignment — this fixes it everywhere `Chip` is used, not just Shop.
   - "Matched to you" filter was collapsing to almost-only-shoes: the match-scoring algorithm gives a strong "closet gap" bonus to categories the user owns zero of (this user has 0 shoes), and the qualifying threshold (60) could only be reached via that bonus or a stacked color/body/archetype match — which requires completed profile data most users won't have for every category. Lowered the threshold to 45 (shared `MATCH_THRESHOLD` constant in `src/services/marketplaceMatchingService.ts`, used consistently in `ShopScreen`, `ProductDetailScreen`) so items with no red flags surface across all categories while genuine matches still rank to the top.
   - Product `sourceUrl`s were fabricated fake product-detail deep links (guaranteed 404s). Replaced with real search-results URLs, but **only for retailers actually verified to work** (Everlane, Zara, Nike, Reformation/thereformation.com — confirmed by loading them). Everything else falls back to a Google Shopping search, since guessed-at retailer-specific search URL patterns turned out wrong for several retailers tested (DSW's `?q=` param 404s, Nordstrom blocks automated traffic, Sezane's site was unreliable). See `src/data/mockProductCatalog.ts`. **This is still a placeholder/sample catalog** — real inventory requires wiring up a real affiliate network (Sovrn Commerce or Skimlinks) via `src/services/affiliateNetwork.ts` (`MARKETPLACE_PROVIDER` flag, currently `'mock'`). The user can't get affiliate network approval until the app is live in the App Store per some networks' policies, though it's worth trying anyway since many networks accept a TestFlight/landing-page pre-launch application.

5. **Navigation redesign**:
   - Bottom tab bar rebuilt as an iOS-style floating pill (`src/navigation/FloatingTabBar.tsx`) — solid card background with shadow (deliberately **not** using `expo-blur`'s `BlurView`, after that produced an invisible tab bar on-device; a plain `View` can't fail to render the way a native blur module can).
   - Reduced from 6 tabs to 5: folded the "Profile"/Account tab into a prominent profile card at the top of the "More" tab (`src/screens/MoreScreen.tsx`), with `AccountScreen` now a pushed stack screen (`RootStackParamList`) rather than a tab.
   - All 5 remaining tabs show icon + label always (not just the active one).

6. **Closet screen**: icon row (Analytics/Outfit Builder/Organize/In-Store Check/Shop/Sustainability) redesigned from tiny unlabeled icons into labeled, scrollable action chips for discoverability.

7. **Home screen**:
   - "Morning" greeting was hardcoded literal text — now computed from actual time of day (Morning/Afternoon/Evening).
   - Weather now uses real device GPS (`expo-location`, newly installed) with IP-geolocation fallback, instead of IP-only (which was giving wrong-city weather).
   - `recommendationEngine.ts` weather-scoring previously only branched at <50°F/>80°F, leaving the common 50–80°F range unaffected by weather. Broadened to a 5-band temperature scale plus rain/snow-aware keyword matching.
   - Added a "Shop" promo banner (previously Shop had almost no visibility beyond a small header icon — the user's explicit "biggest monetization potential" concern).

8. **Closet freeze bug (critical, pre-existing, not introduced this session)**: `SmartOutfitBuilderScreen` froze on real closets with 100+ items due to `outfitPairing.ts` brute-force generating the full combinatorial power set (13M+ combinations for 129 items). Rewritten to bucket items by category with a capped `MAX_PER_CATEGORY = 25`.

## Known baseline — do not treat these as new bugs

`npx tsc --noEmit -p .` has had a stable baseline of **14 pre-existing TypeScript errors** throughout this entire session, all unrelated to anything touched here (mostly `ClosetItem` type duplication between `src/types/index.ts` and `src/services/api.ts`, a couple of unrelated screens). Always diff against this baseline (`grep -c "error TS"` should stay at 14) rather than assuming any tsc error is new.

## Still open / not done this session

- **Task: Migrate remaining mock `'current-user'` domains** (Groups, Challenges, Payments, `premiumStylistService`) — in progress, not finished.
- **Task: Update Firestore security rules to require real auth** — pending. `firestore.rules` currently has a `devSkipAuthChecks()` function hardcoded to `return false` (safe), but real per-collection rules still need the final auth-enforcement pass.
- **Task: Final verification + deploy for the auth rollout** — pending, blocked on the above two.
- **EAS build number**: was at 2, user was in the middle of manually setting it to 3 via `npx eas-cli build:version:set --platform ios` after a previous auto-increment run failed and wasted a build. Confirm this actually got set before the next build.
- **Shop real inventory**: still fully mock/placeholder (see #4 above) — pending real affiliate network signup + Cloud Function wiring.
- User has **0 shoes** in their real closet (confirmed via live Firestore query earlier in the project) — this is real signal, not a bug, and explains why shoe-related recommendations/matches have historically dominated in a couple of features until fixed.

## Useful commands

```bash
# Typecheck (compare error count against the 14-error baseline above)
npx tsc --noEmit -p .

# Deploy a single Cloud Function
cd functions && npx firebase deploy --only functions:<functionName>

# Check/set EAS iOS build number (appVersionSource is "remote")
npx eas-cli build:version:get --platform ios --non-interactive
npx eas-cli build:version:set --platform ios

# Build + auto-submit to App Store in one step
npx eas-cli build --platform ios --profile production --auto-submit
```

(`eas-cli` was installed globally this session via `npm install -g eas-cli`, so a plain `eas` command should also work in new terminal sessions — `npx eas-cli` works either way.)
