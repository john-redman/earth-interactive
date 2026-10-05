# Mobile app plan (Google Play and App Store)

Written 2026-10-05. Prices and store rules change; each fact links to where it was checked. Items marked **(unverified)** need a quick look before you rely on them.

The short version: the same web app runs inside a thin native shell made with **Capacitor 8**. The shell adds AdMob ads, consent, haptics and the Android back button. Android you can build on any Windows or Mac PC. iOS needs a Mac, but you can rent one or use free CI.

---

## 1. What's already in the repo

| Path | What it is |
|---|---|
| `app/package.json` | Capacitor 8.5 project: core, cli, android, ios, AdMob (`@capacitor-community/admob` 8.2), splash screen, status bar, haptics, app (back button), browser (external links), assets (icon generator) |
| `app/capacitor.config.json` | App id, name, dark background, `androidScheme: https`, splash and system-bar settings |
| `app/scripts/sync-web.mjs` | Copies the website into `app/www` (same files as the Pages deploy, minus `sw.js`) and adds `js/platform.js`, which marks the page as native |
| `app/resources/logo.svg` | Icon/splash source (a copy of `icons/icon.svg`) for `npm run assets` |
| `app/.gitignore` | Ignores `www/`, `node_modules/` and native build output. See §4.3 |
| `js/native.js` | Runs only in the app. Switches off the web ad slots, shows the consent form, the iOS tracking prompt, an AdMob banner, and provides `showInterstitial()`, `showRewarded()`, `haptic()` and `privacyOptions()` |
| `js/app-links.js` + `css/app-links.css` | "Get the app" links for the website. Hidden until you paste the store URLs, and always hidden inside the app |

Versions were checked with `npm view` on 2026-10-05: `@capacitor/core|cli|android|ios` 8.5.2, `@capacitor-community/admob` 8.2.0, `@capacitor/splash-screen` 8.0.2, `@capacitor/status-bar` 8.0.4, `@capacitor/haptics` 8.0.2, `@capacitor/app` 8.1.2, `@capacitor/browser` 8.0.5, `@capacitor/assets` 3.0.5.

### How the web code knows it's in the app
- Capacitor injects `window.Capacitor` before any page script runs. `window.Capacitor?.isNativePlatform?.()` is `true` only in the app.
- `sync-web.mjs` also adds `www/js/platform.js`, which sets `window.EI_PLATFORM = 'native'` and `<html data-platform="native">`. Use `:root[data-platform="native"] …` in CSS for app-only styling.
- Plugins are called as `window.Capacitor.Plugins.AdMob` etc. Both native shells export every installed plugin there (checked in Capacitor 8.5 source: `JSExport.java` / `JSExport.swift`). That's why the site needs no bundler and no `@capacitor/*` imports.

### Service worker
Both app schemes use the host `localhost` (`https://localhost` on Android, `capacitor://localhost` on iOS). `main.js` already skips service-worker registration on `localhost`, and iOS's WKWebView doesn't support service workers on custom schemes anyway. `sw.js` is left out of `app/www` as well. Every file ships inside the app, so the app works offline without it, except Google Fonts (see §9).

---

## 2. Costs

| Item | Cost | Notes |
|---|---|---|
| Google Play Console | **$25 once** | Never renews ([SaasToStore](https://saastostore.com/guides/google-play-25-dollar-fee), [Choicely](https://www.choicely.com/tutorials/how-to-create-a-google-play-developer-account-for-your-organization)) |
| Apple Developer Program | **$99 / year** | Apps leave the store if you stop paying ([Adalo](https://studio.adalo.com/blog/apple-developer-program-guide), [Magora](https://magora-systems.com/apple-developer-fee/)). Fee waivers exist only for non-profits, schools and government |
| AdMob | Free | Google pays you. Payout threshold is about $100 (unverified for your country) |
| Domain for `app-ads.txt` and privacy policy | ~$10–15 / year | Already planned in `docs/business/ads-and-domains.md` |
| Mac for iOS builds | $0 if you use free CI (§5.3) | Or a used Mac mini, or a rented cloud Mac |
| **Year one, minimum** | **≈ $135–140** | $25 + $99 + domain |

Store commission doesn't apply to ad revenue. It only applies if you later sell "Remove ads" (15% under both stores' small-business programmes).

---

## 3. Accounts to create (in this order)

1. **Domain + privacy policy page.** Both stores and AdMob require a public privacy policy URL. `app-ads.txt` must be at the **root** of the domain you list as "developer website" in the stores, e.g. `https://earthinteractive.app/app-ads.txt`. A path like `john-redman.github.io/earth-interactive/` won't verify, because the crawler only looks at the domain root ([Google: app-ads.txt](https://developers.google.com/admob/android/app-ads), [walkthrough](https://monetizationguy.com/articles/why-admob-cant-verify-your-app-ads-txt-the-fix-it-walkthrough)). Verification takes up to 24 h after the store listing goes live.
2. **Google Play Console** (personal account, $25). Identity verification with an ID card. Then note the testing rule:
   - Personal accounts created after 13 Nov 2023 must run a **closed test with at least 12 testers opted in for 14 days in a row** before they can apply for production ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)). The clock starts when the 12th tester joins. Google lowered the number from 20 to 12 on 11 Dec 2024 ([PrimeTestLab](https://primetestlab.com/blog/google-play-changed-20-to-12-testers)).
   - Organisation accounts (which need a D-U-N-S number for a registered business) are exempt. For a solo developer, the personal account plus 12 friends or family is usually the cheaper route.
   - Testers need an Android phone and a Google account. They join through an opt-in link and must stay opted in. Ask them to open the app a few times.
3. **Apple Developer Program** ($99/yr) with an Apple ID that has two-factor authentication on. As an individual, the seller name shown is your legal name. Enrolment can take 1–2 days. Then use **App Store Connect** for listings and TestFlight.
4. **AdMob**: sign in with the same Google account. Then:
   - Add two apps (Android and iOS). Each gets an **App ID** (`ca-app-pub-…~…`). Create ad units: banner, interstitial and rewarded per platform (`ca-app-pub-…/…`).
   - In **Privacy & messaging**, create a **GDPR message** (EEA/UK/Switzerland) and a **US state regulations message**. Optionally create an **IDFA explainer** for iOS. If you publish the IDFA explainer, set `umpShowsAttPrompt: true` in `js/native.js` ([plugin docs: consent](https://docs.rdlabo.dev/projects/capacitor-admob/docs/consent)).
   - Add `app-ads.txt` to the website root. AdMob shows the exact line under Apps > app-ads.txt.
   - Add your own phones as test devices (Settings > Test devices). Never tap live ads on your own phone.
   - New apps get limited ad serving until AdMob has reviewed the app. The app must be live in a store before that review.

---

## 4. Build: first-time setup

### 4.1 Tools

| | Windows | Mac |
|---|---|---|
| Node.js **22+** (Capacitor 8 needs it) | nodejs.org installer | nodejs.org or `brew install node@22` |
| Android Studio **2025.2.1+** (includes the SDK and JDK) | ✓ | ✓ |
| Xcode **26+** (App Store uploads must be built with Xcode 26 / iOS 26 SDK since 28 Apr 2026) | ✗ not possible | Mac App Store |
| CocoaPods | – | Not needed if you use Swift Package Manager (the iOS default in Capacitor 8, unverified). If `cap add ios` asks for it, run `sudo gem install cocoapods` |

Sources: [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup), [Updating to 8.0](https://capacitorjs.com/docs/updating/8-0) (Xcode 26, iOS 15+, Android Studio 2025.2.1, Android 7 / API 24+), [Apple SDK requirement](https://developer.apple.com/news/upcoming-requirements/).

Google Play requires **target API 36** (Android 16) for new apps and updates since 31 Aug 2026 ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)). Capacitor 8 projects target 36 out of the box (unverified until you run `cap add android`; check `targetSdkVersion` in `android/variables.gradle`).

### 4.2 Create the native projects (once)

Choose the **app id** first. It's `app.earthinteractive` in `capacitor.config.json`. It becomes the Android package name and the iOS bundle id, and **it can never change after the first upload**. Use reverse-domain form for a domain you own (e.g. `app.earthinteractive` for `earthinteractive.app`). Edit it before running the commands below.

```bash
cd app
npm install
npm run sync:web          # builds app/www from the repo
npx cap add android       # needs Android Studio / SDK
npx cap add ios           # Mac only
npm run assets            # icons + splash from resources/logo.svg, for both platforms
npx cap sync
```

Then add the AdMob **App IDs** (not ad unit IDs):

**Android**: `android/app/src/main/AndroidManifest.xml`, inside `<application>`:
```xml
<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id" />
```
and `android/app/src/main/res/values/strings.xml`:
```xml
<string name="admob_app_id">ca-app-pub-3940256099942544~3347511713</string> <!-- Google test app id; replace with yours -->
```

**iOS**: `ios/App/App/Info.plist`, inside the outer `<dict>`:
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-3940256099942544~1458002511</string> <!-- Google test app id; replace with yours -->
<key>NSUserTrackingUsageDescription</key>
<string>Lets ads be more relevant to you. EarthInteractive works the same either way.</string>
<key>SKAdNetworkItems</key>
<array>
  <dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict>
  <!-- add the rest of Google's list: https://developers.google.com/admob/ios/quick-start#update_your_infoplist -->
</array>
```
(These come from the [plugin README](https://www.npmjs.com/package/@capacitor-community/admob). The app crashes on start if the App ID is missing.)

Android also needs **orientation and back-button behaviour** checked in Android Studio. Leave orientation unlocked, since the globe works in both.

### 4.3 What to commit
- **Commit** `app/android/` and `app/ios/` after `cap add`. They hold things you edit by hand: AdMob App ID, Info.plist strings, icons, version numbers, signing settings. Re-creating them loses all of that. Capacitor's own guidance is to treat them as source.
- **Don't commit** `app/www/` (regenerated by every `npm run sync`), `node_modules/`, Gradle/Xcode build folders, or **keystores** (`*.jks`, `*.keystore`, `keystore.properties`). `app/.gitignore` already covers these.
- **Back up the Android upload keystore** and its passwords somewhere safe (password manager plus an offline copy). With Play App Signing, Google holds the real signing key and a lost upload key can be reset, but that takes days.

### 4.4 Everyday loop
```bash
cd app
npm run android     # sync web files + open Android Studio, then press Run
npm run ios         # sync + open Xcode (Mac)
```
Any change to the website (`js/`, `css/`, `data/`…) needs `npm run sync` before the app sees it. Chrome `chrome://inspect` (Android) and Safari > Develop (iOS) attach DevTools to the app's WebView.

---

## 5. Building for release

### 5.1 Android (Windows or Mac)
1. Bump `versionCode` (integer, +1 every upload) and `versionName` in `android/app/build.gradle`.
2. Android Studio > Build > Generate Signed App Bundle > **Android App Bundle (.aab)**. Create the upload keystore the first time.
3. Play Console > Testing > **Closed testing** > upload the .aab > add the 12+ testers' emails (or a Google Group) > share the opt-in link.
4. After 14 days with 12+ testers: Dashboard > **Apply for production** (a short questionnaire about the test). Google says review takes about 7 days or less (unverified).

### 5.2 iOS with a Mac
1. Xcode > App target > Signing & Capabilities > your team, automatic signing.
2. Set Version and Build (+1 each upload).
3. Product > Archive > Distribute App > App Store Connect > Upload.
4. In App Store Connect: **TestFlight** first (internal testers need no review), then submit for review. Reviews usually take 1–3 days.

### 5.3 iOS without a Mac (budget options)

| Option | Cost | Notes |
|---|---|---|
| **GitHub Actions macOS runners** | **Free** for public repos (this repo is public) | Standard macOS runners have no minute limit on public repos ([GitHub changelog](https://github.blog/changelog/2024-01-30-github-actions-introducing-the-new-m1-macos-runner-available-to-open-source/), [explainer](https://dev.to/maclessdev/github-actions-free-macos-minutes-explained-33p7)). Signing needs your Apple certificate and provisioning profile as repo secrets, or an App Store Connect API key with `fastlane match`. Never commit them. This takes the most setup but costs nothing |
| **Codemagic** | Free: **500 macOS M2 minutes/month** on personal accounts ([Codemagic pricing](https://docs.codemagic.io/billing/pricing/)) | Has a Capacitor/Ionic workflow and handles code signing from the App Store Connect API key. A build takes ~10–15 min, so ~30 builds a month. **Easiest** |
| ~~Ionic Appflow~~ | – | **Don't use it.** It's being wound down: no new apps from 1 Oct 2026, end of life 31 Dec 2027 ([Ionic](https://ionic.zendesk.com/hc/en-us/articles/29907381079831-Native-Builds-and-Live-Updates), [summary](https://yasha.solutions/posts/appflow-is-closing/)) |
| Cloud Mac rental (MacinCloud, Scaleway M-series) | ~$1/hour or ~$25–50/month (unverified) | Useful for the first `cap add ios`, editing Info.plist in Xcode and the first upload. You can cancel afterwards |
| Used Mac mini (M1 or newer) | ~$300–400 one-off (my estimate) | Must run the macOS version Xcode 26 needs |

Plan without a Mac: run `npx cap add ios` once on a rented Mac or in a CI job and commit `app/ios/`. Make the Info.plist edits in a text editor. Build and upload with Codemagic. Test on your own iPhone through TestFlight. Without any Mac you can't use the iOS Simulator, so TestFlight is your test device.

---

## 6. Store listing checklist

### Both stores
- [ ] App name (Play: 30 characters; Apple: 30 characters), short description / subtitle, full description
- [ ] **Privacy policy URL**. It must mention AdMob/Google, the advertising ID, consent choices, the leaderboard nickname and scores (if the backend is on), and a contact email
- [ ] Support URL / contact email
- [ ] Developer website set to the domain that hosts `app-ads.txt`
- [ ] App icon (generated by `npm run assets`; Play also needs a separate **512×512 PNG** for the listing)
- [ ] Screenshots (see below). Show real app screens; don't put device frames around them with misleading content
- [ ] Category: **Education** (or Reference). Avoid "Kids"
- [ ] Content/age rating questionnaires. Answer "ads: yes" and "user-generated content: yes" if leaderboard names are on (the profanity filter helps)

### Screenshot sizes
- **Apple**: iPhone **6.9"**: 1320×2868 (or 1290×2796 / 1260×2736), 1–10 per set. If the app runs on iPad (the Capacitor default), also **13" iPad**: 2064×2752 or 2048×2732 ([ScreenKit](https://screenkit.tools/specs/app-store-screenshot-sizes), [AppLaunchFlow](https://www.applaunchflow.com/app-store-screenshot-sizes)). If you don't want to make iPad shots, turn iPad off in Xcode (Targets > General > Supported Destinations) before the first upload.
- **Google Play**: 2–8 phone screenshots (JPEG/PNG, each side 320–3840 px, aspect ratio no more than 2:1), a **feature graphic of 1024×500**, and optional 7"/10" tablet screenshots (unverified, so check the form).
- Easy way: run the site in Chrome DevTools device mode at 440×956 with DPR 3 (gives 1320×2868) and capture the screenshot.

### Google Play forms (App content)
- [ ] **Data safety**: the Google Mobile Ads SDK collects the **device or other IDs** (advertising ID), **app interactions**, **diagnostics** and approximate **location from IP**, shared with Google for advertising and fraud prevention, encrypted in transit. Add **name** (leaderboard nickname) and **gameplay** (scores) if the backend is live. Google's own guide lists what the SDK collects; copy from it (unverified link: AdMob Help "Data disclosure").
- [ ] **Ads**: "Yes, contains ads"
- [ ] **Target audience**: choose **13–15, 16–17, 18+** (or 18+ only). **Don't include under-13 age groups.** See §7.
- [ ] Advertising ID declaration: yes, used for advertising (the SDK adds the `AD_ID` permission)
- [ ] Content rating (IARC questionnaire), news app: no, government app: no, financial features: none, health: no

### Apple forms
- [ ] **App Privacy ("nutrition label")**: Identifiers (Device ID), Usage Data (Product Interaction, Advertising Data), Diagnostics, Coarse Location. Mark them as used for **Third-Party Advertising**, "linked to user: no", and "used for tracking: **yes**" (if you show ATT and serve personalised ads). Add Name/Gameplay content for the leaderboard if it's on.
- [ ] Privacy manifest: the Google Mobile Ads SDK ships its own `PrivacyInfo.xcprivacy`. Capacitor's own manifest covers its required-reason APIs (unverified for 8.5; Xcode warns at archive time if something is missing).
- [ ] Age rating questionnaire (Apple added 13+/16+/18+ tiers in 2025): answer honestly, with ads and user-generated names. Expect **9+ or 13+** (unverified).
- [ ] **Not** "Made for Kids" category.
- [ ] Export compliance: the app uses only standard HTTPS, so answer "exempt". Add `ITSAppUsesNonExemptEncryption = NO` to Info.plist to skip the question on each upload.

---

## 7. Audience and children (COPPA / Families)

Geography attracts students, so this decision matters more than usual.

- If your Play target audience **includes any under-13 age group**, the **Families policy** applies: only Families self-certified ad SDKs, no personalised ads to children, and for mixed audiences a **neutral age screen** ([Play Families policy](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en), [AdMob Families help](https://support.google.com/admob/answer/6223431?hl=en)). Revenue per user drops sharply and the review is stricter.
- On iOS, the **Kids category** forbids third-party behavioural ads and most analytics.
- **Recommendation**: position the app for a **general audience (13+)**, as you do for the website (see `docs/business/ads-and-domains.md` §1.3). Don't use "for kids" wording, child cartoons or school-age phrasing in the listing or screenshots. Google checks whether the listing *appeals* to children, not only what you tick.
- `js/native.js` sets `maxAdContentRating: 'ParentalGuidance'`, so no Teen or Mature ads appear in an education app. Set it to `'General'` if you want to be stricter (expect a slightly lower fill rate).
- If you later want the school market, make a separate Families-compliant build with `tagForChildDirectedTreatment: true`.

---

## 8. Apple guideline 4.2 ("minimum functionality") risk

Apple rejects apps that are "a repackaged website". In 2026 this is the most common rejection for web wrappers ([MobiLoud](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper/), [StoreShot](https://storeshot.ai/blog/guideline-4-2-minimum-functionality/)). Things in our favour: everything is **bundled and works offline** (it doesn't load a URL), it's a real-time 3D experience rather than a page of text, and it has games. Our weak spots: it looks identical to the website, and the reviewer can see the website exists.

Mitigations, cheapest first:
1. **Already done**: bundled offline content; native haptics hooks; native in-app browser for links; Android back button; native ads and consent; no web chrome (no URL, no "install app" prompts, no website footer links). The `#hint` "Scroll to zoom" text should read "Pinch to zoom" in the app (CSS `:root[data-platform="native"]` can swap it).
2. **Use haptics visibly**: a tick when a quiz answer is right or wrong and when a compare piece snaps. One line each, `native.then(n => n?.haptic('success'))`.
3. **Vendor the font** (`Plus Jakarta Sans`, OFL licence) so the app looks right offline (§9).
4. **Daily Challenge reminder** as a local notification (`@capacitor/local-notifications`): "Today's challenge is ready". This is a strong "native" feature with no server.
5. **"Remove ads" in-app purchase** (one-off, about $2.99) through RevenueCat or `@capacitor-community/in-app-purchases`. Apple likes this, and it's a second income stream. Apple requires IAP (not Ko-fi) for anything unlocked inside the iOS app.
6. Later: a **home-screen widget** (country of the day). This needs native Swift/Kotlin code, so only build it if review pushes back.
7. In **App Review notes**, say: "Fully offline 3D globe built with WebGL/Three.js; all content is bundled; native haptics, ads consent and notifications. Not a website wrapper: no remote content is loaded." A screen recording helps.

If rejected under 4.2, reply in Resolution Center with the list above and ship items 2–4 before resubmitting. Android has no equivalent rule.

---

## 9. App-specific details to check before release

- **Share links**: "Copy link" in `main.js` builds the URL from `location.href`, which is `https://localhost/…` in the app. In the app, build it from the public site URL instead (e.g. `const base = window.EI_PLATFORM === 'native' ? 'https://<your domain>/' : location.href`). Also consider `navigator.share()`, which works in both WebViews.
- **Fonts**: Google Fonts load from the network. Offline, the app falls back to the system font. Vendor the WOFF2 files under `vendor/fonts/` and add them to `THIRD_PARTY_NOTICES.md`.
- **Leaderboard backend**: if `API_BASE` is set, the Worker's CORS must allow the origins `https://localhost` (Android) and `capacitor://localhost` (iOS). Otherwise every call fails in the app.
- **Safe areas**: the CSS uses `env(safe-area-inset-*)`. Capacitor 8's SystemBars (`insetsHandling: "css"`) makes that work on Android 15/16 edge-to-edge, and also injects `--safe-area-inset-*` variables for older WebViews. Test on a phone with a notch or punch-hole.
- **Banner vs. layout**: `native.js` sets `--ad-h` to the banner height plus the bottom safe area, so the stage shrinks above the banner, as the web bottom banner does. Check on a real iPhone (home indicator) and a gesture-nav Android phone that nothing sits under the ad. If there's a gap or overlap, drop the `env(…)` part in `applyInset()`.
- **Audio**: the rollercoaster crowd still unlocks on a tap. iOS's silent switch mutes WebView audio, which is expected.
- **Performance**: phones get the `low` tier automatically (touch device). Test on a low-end Android phone (~$100 class). The governor handles the rest.
- **Deep links** (`?c=FRA`) don't open the app until you set up Android App Links / iOS Universal Links (needs `assetlinks.json` and `apple-app-site-association` on the domain). That's a later step.

---

## 10. Ads strategy in the app

| Format | Where | Cap | Notes |
|---|---|---|---|
| **Adaptive banner** | Bottom, always (except during full-screen ads) | – | Already wired. Stage shrinks above it |
| **Interstitial** | After a game ends **and** the player closes the result (quiz exit), never mid-round, never on launch | ≤ 1 per **3 min**, none in the first **2 min** (`NATIVE_ADS` in `js/native.js`) | Google policy: only at natural breaks, never unexpected, never right after an app launch or on exit. Our caps are deliberately gentler than the policy |
| **Rewarded** | Opt-in button: "Watch an ad for a free hint" (keeps full points) | User chooses | Best-paid format and liked by players. `native.showRewarded()` resolves `true` when earned. Hide the button when `native.rewardedReady` is false |
| App open ads | **No** | – | They annoy people in a short-session app |

Policy reminders: no "click the ad" wording; don't put ads where accidental taps happen (the banner sits below the stage, not over controls); no ads over the consent form; never refresh banners yourself (AdMob does that).

Expected revenue: much higher per user than web banners, but small at first. Treat any number as a guess until you have 2–4 weeks of AdMob data (my estimate: ~$1–5 per 1,000 daily sessions in tier-1 countries for banner plus occasional interstitial; rewarded adds more).

Consent flow in `js/native.js` (Google's recommended order): `initialize` → `requestConsentInfo` → `showConsentForm` if required → iOS ATT prompt (unless UMP shows it) → ads only if `canRequestAds`. When `native.privacyRequired` is true (EEA/UK users), Google requires a way to change consent later. Add a "Privacy choices" item (in the Play menu or an about sheet) that calls `native.privacyOptions()`.

---

## 11. Website → stores

### Store badges
`js/app-links.js` has:
```js
export const STORE_LINKS = { ios: '', android: '' };
```
Paste the store URLs when the apps go live. Until then, and always inside the app, nothing renders. It shows small text-and-icon links, listing the visitor's own platform first. Official badge artwork is allowed only unmodified and with the trademark line, and the rules are in the file header. Text links are fine until then.

### iOS Smart App Banner
Safari on iPhone shows a native "Open / Get" bar when the page has this tag. Add it to `<head>` in `index.html` **once the App Store id exists** (the number in the App Store URL):
```html
<meta name="apple-itunes-app" content="app-id=1234567890">
```
Add `, app-argument=https://<your domain>/?c=FRA` style deep links later, once Universal Links work. Android has no equivalent tag. The badge covers it.

---

## 12. Timeline (realistic for evenings and weekends)

| Week | Work |
|---|---|
| 0 | Buy domain, publish privacy policy + `app-ads.txt` placeholder, pick the **app id**. Create Play, Apple and AdMob accounts (Apple can take 1–2 days, Play identity checks a few days) |
| 1 | `cap add android`, App IDs, icons. Run on your phone. Wire the 3 lines in `main.js`. Fix share link, font, safe areas. **Upload to closed testing and recruit 12 testers** (this starts the 14-day clock, so do it early) |
| 1–2 | iOS: `cap add ios` (Mac/CI), TestFlight build, test on iPhone. Screenshots for both stores |
| 2–3 | Haptics and the daily reminder notification (4.2 insurance). Store listings, forms and ratings. Submit iOS for review |
| 3 | Play: closed test done (14 days) → apply for production (~1 week review) |
| 4 | Both live. Paste `STORE_LINKS`, add the Smart App Banner tag, check `app-ads.txt` turns green in AdMob, request the AdMob app review |

So about **4–5 weeks** from start to both stores, with Google's 14-day test the longest fixed wait.

---

## 13. Ordered checklist

1. [ ] Decide final **app name** and **app id** (`capacitor.config.json` → `appId`). It can't change later
2. [ ] Domain live, `privacy.html` published, contact email set up
3. [ ] Create Google Play Console account ($25), Apple Developer account ($99), and AdMob account
4. [ ] AdMob: 2 apps, 6 ad units, GDPR + US-states messages, test devices
5. [ ] `cd app && npm install && npm run sync:web && npx cap add android && npm run assets`
6. [ ] Android `AndroidManifest.xml` + `strings.xml` App ID. Run on your phone and see the **test** banner, the consent form (use debug geography EEA to test it) and the back button
7. [ ] Add the 3 lines to `js/main.js` (see below). Optional: haptics on answers, rewarded hint button, "Privacy choices" menu item
8. [ ] Fix share URL, vendor the font, check safe areas and banner spacing on 2 phones
9. [ ] Signed .aab → Play **closed test** → 12 testers opted in → wait 14 days
10. [ ] iOS: `cap add ios` (Mac / cloud Mac / CI), Info.plist (App ID, ATT text, SKAdNetwork, encryption flag), TestFlight on your iPhone
11. [ ] Screenshots (iPhone 6.9", iPad 13" or iPad off; Play phone + 1024×500 graphic)
12. [ ] Forms: Data safety, App Privacy, ratings, target audience 13+, ads = yes
13. [ ] Put the real ad unit ids in `NATIVE_ADS.REAL`, set `testing: false`, bump versions, build release
14. [ ] Submit iOS (with review notes) and apply for Play production
15. [ ] After launch: `STORE_LINKS`, Smart App Banner tag, `app-ads.txt` verified, AdMob app review requested
16. [ ] Later: daily reminder notification, "Remove ads" IAP, Universal/App Links, home-screen widget

### `js/main.js` integration (3 lines)
After `const ads = mountAds(globe);`:
```js
// Native app only (Capacitor): AdMob, consent, haptics, back button. The website never loads js/native.js.
const native = window.Capacitor?.isNativePlatform?.() ? import('./native.js').then(m => m.initNative({ ads, globe, isBusy: () => mode === 'quiz' })).catch(() => null) : Promise.resolve(null);
```
In the quiz's `onMode` callback, in the `else` branch (game closed):
```js
else { mode = 'browse'; native.then(n => n?.showInterstitial()); }
```
And add `native` to `window.EarthInteractive` for scripted checks.
