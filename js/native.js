// Native app glue (Android / iOS via Capacitor). Loaded only inside the app: main.js imports it
// dynamically when window.Capacitor says it is a native platform, so the website never fetches it.
// Plugins are reached through window.Capacitor.Plugins (injected by the native shell), never imported.
//
// What it does in the app:
//  - turns off the web ad slots and shows an AdMob adaptive banner at the bottom instead;
//  - asks for ad consent with Google's UMP form (EEA/UK/Swiss and US-state rules), then the iOS
//    App Tracking Transparency prompt, before any ad is requested;
//  - exposes showInterstitial() (frequency capped, for breaks between games) and showRewarded();
//  - light haptics, Android back button, external links in the in-app browser.
//
// Ad IDs: Google's public TEST units are used until you fill in REAL and set testing to false.
// Never click your own live ads; add your phone under AdMob > Settings > Test devices.

export const NATIVE_ADS = {
  enabled: true,
  testing: true,                    // set false for the store build, after the REAL ids below are filled in
  // Your AdMob ad unit ids (AdMob > Apps > EarthInteractive > Ad units). App ids go in the native
  // projects (AndroidManifest.xml / Info.plist), not here. See docs/mobile-app.md.
  REAL: {
    android: { banner: '', interstitial: '', rewarded: '' },
    ios: { banner: '', interstitial: '', rewarded: '' },
  },
  // Google's demo units: always safe to load, never pay out.
  TEST: {
    android: { banner: 'ca-app-pub-3940256099942544/6300978111', interstitial: 'ca-app-pub-3940256099942544/1033173712', rewarded: 'ca-app-pub-3940256099942544/5224354917' },
    ios: { banner: 'ca-app-pub-3940256099942544/2934735716', interstitial: 'ca-app-pub-3940256099942544/4411468910', rewarded: 'ca-app-pub-3940256099942544/1712485313' },
  },
  interstitialGapMs: 3 * 60 * 1000, // at most one full-screen ad per 3 minutes…
  interstitialFirstMs: 2 * 60 * 1000, // …and none in the first 2 minutes of a session
  // true once you publish an "IDFA explainer" message in AdMob > Privacy & messaging: UMP then shows
  // the iOS tracking prompt itself and we must not ask a second time.
  umpShowsAttPrompt: false,
  maxAdContentRating: 'ParentalGuidance', // General | ParentalGuidance | Teen | MatureAudience
};

/** True inside the Capacitor app (Android or iOS), false on the website. */
export const isNative = () => !!window.Capacitor?.isNativePlatform?.();

const noop = async () => false;
const OFF = Object.freeze({ native: false, platform: 'web', showInterstitial: noop, showRewarded: noop, haptic: () => {}, privacyOptions: noop, privacyRequired: false });

/**
 * initNative({ ads, globe, isBusy, onBack }) → Promise<api>
 *   ads     the object mountAds() returned (used to switch the web slots off)
 *   globe   for globe.resize() when the banner changes the stage height
 *   isBusy  optional () => boolean; true while a full-screen ad must not interrupt (e.g. mid-round)
 *   onBack  optional () => boolean; Android back button. Return true if you closed something.
 * api: { native, platform, showInterstitial(), showRewarded(), haptic(kind), privacyOptions(), privacyRequired }
 * Never throws: on any failure the app just runs without ads.
 */
export async function initNative({ ads, globe, isBusy = () => false, onBack } = {}) {
  if (!isNative()) return OFF;
  const Cap = window.Capacitor;
  const P = Cap.Plugins || {};
  const platform = Cap.getPlatform(); // 'android' | 'ios'
  const started = Date.now();
  const state = { lastFull: 0, bannerH: 0, interstitialReady: false, rewardedReady: false, consentOk: false, privacyRequired: false, earned: false };
  const units = () => {
    const real = NATIVE_ADS.REAL[platform] || {};
    const test = NATIVE_ADS.TEST[platform] || {};
    const pick = k => (!NATIVE_ADS.testing && real[k]) || test[k];
    return { banner: pick('banner'), interstitial: pick('interstitial'), rewarded: pick('rewarded') };
  };
  const isTesting = () => NATIVE_ADS.testing || !NATIVE_ADS.REAL[platform]?.banner;

  // Web ad slots off; the native banner reserves its own space through --ad-h (the stage shrinks).
  ads?.enable(false);
  const applyInset = () => {
    const h = state.bannerH;
    document.documentElement.style.setProperty('--ad-h', h ? `calc(${h}px + env(safe-area-inset-bottom, 0px))` : '0px');
    globe?.resize();
  };
  // ads.js resets --ad-h on resize; this listener is added later, so it runs after and wins.
  window.addEventListener('resize', () => { if (state.bannerH) applyInset(); });

  setupLinks(P);
  setupBack(P, onBack);
  P.SplashScreen?.hide?.().catch(() => {});

  const api = {
    native: true,
    platform,
    get privacyRequired() { return state.privacyRequired; },
    /** Opens Google's privacy options form (needed as a menu entry when privacyRequired is true). */
    async privacyOptions() {
      try { await P.AdMob?.showPrivacyOptionsForm(); return true; } catch { return false; }
    },
    /** kind: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' */
    haptic(kind = 'light') {
      const H = P.Haptics;
      if (!H) return;
      const n = { success: 'SUCCESS', warning: 'WARNING', error: 'ERROR' }[kind];
      (n ? H.notification({ type: n }) : H.impact({ style: (kind || 'light').toUpperCase() })).catch(() => {});
    },
    /**
     * Shows a full-screen ad if one is loaded, consent allows it, nothing is busy and the caps allow.
     * Call it only at natural breaks (a game just ended and the player closed the result), never mid-round.
     * Resolves true if an ad was shown.
     */
    async showInterstitial() {
      const now = Date.now();
      if (!P.AdMob || !state.consentOk || !state.interstitialReady || isBusy()) return false;
      if (now - started < NATIVE_ADS.interstitialFirstMs || now - state.lastFull < NATIVE_ADS.interstitialGapMs) return false;
      state.interstitialReady = false;
      try { await P.AdMob.showInterstitial(); state.lastFull = Date.now(); return true; } catch { prepareInterstitial(); return false; }
    },
    /** Opt-in rewarded ad (e.g. "Watch an ad for a free hint"). Resolves true if the reward was earned. */
    async showRewarded() {
      if (!P.AdMob || !state.consentOk || !state.rewardedReady) return false;
      state.rewardedReady = false; state.earned = false;
      try {
        const item = await P.AdMob.showRewardVideoAd();
        state.lastFull = Date.now();
        return state.earned || (item?.amount ?? 0) > 0;
      } catch { return false; } finally { prepareRewarded(); }
    },
    /** True when a rewarded ad is loaded, so you can show or hide the offer button. */
    get rewardedReady() { return state.rewardedReady; },
  };

  async function prepareInterstitial() {
    try { await P.AdMob.prepareInterstitial({ adId: units().interstitial, isTesting: isTesting() }); state.interstitialReady = true; }
    catch { state.interstitialReady = false; }
  }
  async function prepareRewarded() {
    try { await P.AdMob.prepareRewardVideoAd({ adId: units().rewarded, isTesting: isTesting() }); state.rewardedReady = true; }
    catch { state.rewardedReady = false; }
  }

  if (!NATIVE_ADS.enabled || !P.AdMob) return api;
  const AdMob = P.AdMob;
  try {
    await AdMob.initialize({ maxAdContentRating: NATIVE_ADS.maxAdContentRating });

    // 1. Consent (UMP). Shows Google's form only where the law requires it.
    let info = await AdMob.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === 'REQUIRED') info = await AdMob.showConsentForm();
    state.privacyRequired = info.privacyOptionsRequirementStatus === 'REQUIRED';

    // 2. iOS App Tracking Transparency, after consent (Google's recommended order).
    if (platform === 'ios' && !NATIVE_ADS.umpShowsAttPrompt) {
      const { status } = await AdMob.trackingAuthorizationStatus();
      if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
    }

    if (!info.canRequestAds) return api;
    state.consentOk = true;

    // 3. Banner: adaptive, bottom. Its real height arrives through SizeChanged.
    await AdMob.addListener('bannerAdSizeChanged', size => { state.bannerH = Math.round(size?.height || 0); applyInset(); });
    await AdMob.addListener('interstitialAdDismissed', () => prepareInterstitial());
    await AdMob.addListener('interstitialAdFailedToShow', () => prepareInterstitial());
    await AdMob.addListener('onRewardedVideoAdReward', () => { state.earned = true; });
    await AdMob.showBanner({ adId: units().banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: isTesting() });

    // 4. Full-screen ads load in the background, ready for the next break.
    prepareInterstitial();
    prepareRewarded();
  } catch (e) {
    console.warn('[native] ads unavailable', e);
  }
  return api;
}

// target=_blank links (Wikipedia "Learn more", store pages) open in the in-app browser
// (SFSafariViewController / Custom Tabs) instead of replacing the app.
function setupLinks(P) {
  document.addEventListener('click', e => {
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.origin === location.origin || !/^https?:$/.test(url.protocol)) return;
    e.preventDefault();
    if (P.Browser) P.Browser.open({ url: url.href }).catch(() => window.open(url.href, '_blank'));
    else window.open(url.href, '_blank');
  }, true);
}

// Android back: close the top-most thing (same as Escape); on a second press with nothing to close,
// send the app to the background like other Android apps.
function setupBack(P, onBack) {
  if (!P.App) return;
  let armed = 0;
  P.App.addListener('backButton', () => {
    const handled = onBack ? onBack() : (window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), null);
    if (handled) { armed = 0; return; }
    const now = Date.now();
    if (handled === false || now - armed < 1500) { armed = 0; P.App.minimizeApp?.().catch(() => P.App.exitApp()); return; }
    armed = now;
  });
}
