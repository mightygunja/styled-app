# App Store Connect — App Privacy declaration

Derived from the codebase, not from intent. Every entry below names the code
that causes the collection, so it can be re-verified when features change.

Enter these under **App Store Connect → your app → App Privacy**.

> Two rules Apple enforces that catch people out: data sent to a third party is
> still *collected* even if your servers never store it, and "Linked to You"
> means linked to identity, which includes a Firebase uid. Almost everything in
> this app is linked, because it is all keyed by uid.

---

## Contact Info

### Email Address — **Collected · Linked to You**
- **Purpose:** App Functionality
- **Tracking:** No
- **Why:** Firebase Authentication accounts. Email/password sign-up, plus Apple
  and Google sign-in. `src/contexts/AuthContext.tsx`

### Name — **Collected · Linked to You**
- **Purpose:** App Functionality
- **Tracking:** No
- **Why:** Display name on the account and on community posts. Captured from
  Apple/Google sign-in or entered in Edit Profile.

---

## User Content

### Photos or Videos — **Collected · Linked to You**
- **Purpose:** App Functionality
- **Tracking:** No
- **Why:** This is the app's core data. Garment photos, selfies for colour
  analysis, full-length photos for body analysis and virtual try-on, receipt
  photos, in-store item photos, before/after session photos. Stored in Firebase
  Storage; sent to OpenAI for analysis.
  `firebaseStorage.ts`, `firebaseApi.ts`, `functions/src/index.ts`

### Photos — sent to a third party
Selfies and body photos are transmitted to **OpenAI** for colour season and body
type analysis (`analyzeColorSeason`, `analyzeBodyType`, `renderTryOn`). Declare
as collected; note in your privacy policy that images are processed by a
third-party AI provider.

### Customer Support / Other User Content — **Collected · Linked to You**
- **Purpose:** App Functionality
- **Why:** AI stylist chat messages, direct messages, community posts, comments,
  challenge entries, Edit briefs.

---

## Identifiers

### User ID — **Collected · Linked to You**
- **Purpose:** App Functionality
- **Tracking:** No
- **Why:** Firebase uid keys every document the user owns.

---

## Usage Data

### Product Interaction — **Collected · Linked to You**
- **Purpose:** App Functionality, Analytics
- **Tracking:** No
- **Why:** Affiliate link taps recorded to Firestore for commission reporting
  (`affiliateClicksService`), and product impressions, taps, saves and
  dismissals stored **on-device only** to rank Shop results
  (`shopperSignals.ts`). The on-device set never leaves the device.

---

## Location

### Coarse Location — **Collected · NOT Linked to You**
- **Purpose:** App Functionality
- **Tracking:** No
- **Why:** Weather for outfit recommendations. Device GPS via `expo-location`,
  falling back to IP geolocation (`ipapi.co`). Coordinates go to Open-Meteo for
  a forecast and are **not stored** — declare as not linked, since nothing
  persists against the user record. `weatherService.ts`

> Declare **Coarse**, not Precise: the app requests
> `Location.Accuracy.Balanced` and only ever uses it to look up local weather.

---

## Sensitive Info

### Sensitive Info — **Collected · Linked to You**
- **Purpose:** App Functionality
- **Tracking:** No
- **Why:** Body type analysis infers physical characteristics from a
  full-length photo. Apple treats this category broadly; declaring it is the
  defensible call even though it is used solely for fit guidance.

---

## Other Data

### Other Data — **Collected · Linked to You**
- **Purpose:** App Functionality
- **Why:** Calendar event titles, times and locations are read to plan outfits
  around the user's schedule (`schedulePlanningService.ts`). Events are read,
  passed to OpenAI to infer a dress code, and **never written back or stored**.
  Nothing is written to the user's calendar.

---

## NOT collected — confirm these stay true

| Category | Status |
|---|---|
| Payment Info | **Not collected.** No payment processor is integrated. `paymentMethodsService` stores card metadata only and is unreachable from live navigation; verify before shipping if that changes. |
| Contacts | Not collected. |
| Browsing History | Not collected. |
| Search History | Not collected — Shop queries are not persisted. |
| Health & Fitness | Not collected. |
| Financial Info | Not collected. |
| Advertising Data | Not collected. No ad SDK. |

---

## Tracking — answer "No"

The app does **not** track users across apps or websites owned by other
companies, so **no ATT prompt is required**.

Relevant configuration, worth being able to point at if asked:
- `advertiserIDCollectionEnabled: false` and `autoLogAppEventsEnabled: false`
  on the Facebook SDK (`app.config.js`)
- `Settings.setAdvertiserTrackingEnabled(false)` called explicitly at sign-in
- `iosUserTrackingPermission: false` — no ATT prompt requested
- No IDFA is read anywhere in the codebase

**Caveat:** affiliate links are attribution mechanisms. Sovrn and Rakuten set
their own cookies once the user lands on a retailer site in the browser. That
happens outside your app, in Safari, and is not App Tracking Transparency's
subject — but your privacy policy should disclose that affiliate links carry
tracking parameters.

---

## Third parties receiving user data

Disclose each in your privacy policy.

| Recipient | Receives | Trigger |
|---|---|---|
| Google Firebase | All account and app data | Auth, Firestore, Storage, Functions |
| OpenAI | Garment/selfie/body/receipt images, chat text, closet metadata, calendar event titles | All AI features |
| Open-Meteo | Coordinates, destination names | Weather and trip forecasts |
| ipapi.co | IP address | Location fallback when GPS is denied |
| Sovrn Commerce | Search brief, click referrals | Shop, once enabled |
| Rakuten Advertising | Search keywords, click referrals | Shop, once enabled |
| Mailgun | Forwarded email content | E-receipt forwarding, once enabled |
| Apple / Google | Auth tokens | Social sign-in |

---

## Also required before submission

- **Privacy Policy URL** — mandatory. Must cover every third party above.
- **Account deletion** — implemented in-app (Account → Delete account) with a
  server-side data cascade (`onUserDeleted`). Required for Sign in with Apple.
- **Support URL** — mandatory.
- **Demo account** — reviewers need working credentials, and the account should
  have a populated closet so the app does not look empty.
