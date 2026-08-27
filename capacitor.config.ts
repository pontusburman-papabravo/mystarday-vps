/**
 * Capacitor configuration.
 *
 * App ID: se.mystarday.app
 * App Name: Min Stjärndag
 *
 * The app loads https://mystarday.se in production (remote URL, no bundled copy). // pragma: allowlist secret
 * In development (CAP_DEV=true), connects to http://localhost:3000.
 *
 * Plugins configured: SplashScreen, StatusBar, Keyboard, SignInWithApple, Camera.
 */
import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.CAP_DEV === 'true';

const config: CapacitorConfig = {
  appId: 'se.mystarday.app',
  appName: 'Min Stjärndag',
  webDir: 'public',
  // WKWebView/Android WebView background behind the web document, used by the
  // native bridge (CAPBridgeViewController on iOS) whenever the current
  // document has not painted anything yet — e.g. the brief window between
  // window.location.replace() unloading the picker and the destination
  // page's first paint. Without this, iOS defaults to UIColor.systemBackground
  // (white), which is the native white flash seen on physical iOS during
  // child->adult profile-switch navigation (2026-08-25 physical QA). Matches
  // the app's canonical parent-magic dark background (#07071a — see
  // parent-magic-common.css / platform-html.js early-magic style).
  // Requires `npx cap sync ios` + a new native build to take effect on
  // device — this is compiled into the app bundle, not delivered by the
  // web deploy.
  backgroundColor: '#07071a',
  server: isDev
    ? { url: 'http://localhost:3000', cleartext: true }
    : { url: 'https://mystarday.se', androidScheme: 'https' },
  ios: {
    // Explicit iOS override (same value) — CAPBridgeViewController reads
    // this before falling back to the global backgroundColor above.
    backgroundColor: '#07071a',
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    // Google Sign-In is Android-only (platform.js). Excluding it avoids bundling
    // GoogleSignIn/GTMAppAuth/GTMSessionFetcher without Apple-required privacy manifests.
    //
    // Meta App Events native SDK is not included on either platform (NO-TRACKING release).
    // Home-screen widget is PAUSED for this release: `capacitor-widget-bridge` is excluded
    // from includePlugins so the WidgetBridge Capacitor plugin is not compiled into the App
    // target. WidgetRoutine's own Xcode extension target is separately excluded from the
    // archive via scripts/patch-ios-widget-release-hold.mjs. Widget source stays in the repo
    // (plugins/capacitor-widget-bridge/, ios/App/WidgetRoutine/) for when the feature resumes.
    includePlugins: [
      '@capacitor-community/apple-sign-in',
      '@capacitor/app',
      '@capacitor/camera',
      '@capacitor/push-notifications',
      '@revenuecat/purchases-capacitor',
      'capacitor-adult-biometric',
    ],
  },
  android: {
    // Apple Sign In is iOS-only. Excluding it keeps the Android APK lean and avoids
    // shipping an unused auth plugin in Play review builds.
    //
    // Meta App Events (`capacitor-facebook-events`) and the home-screen widget
    // (`capacitor-widget-bridge`) are PAUSED for this release — excluded here so neither
    // native SDK/resources/manifest metadata is bundled into the AAB. Source for both stays
    // in the repo (node_modules/capacitor-facebook-events via npm dependency,
    // plugins/capacitor-widget-bridge/) for when either feature resumes.
    includePlugins: [
      '@capacitor/app',
      '@capacitor/camera',
      '@capacitor/push-notifications',
      '@codetrix-studio/capacitor-google-auth',
      '@revenuecat/purchases-capacitor',
      'capacitor-adult-biometric',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#F5A623',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1B2340',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SignInWithApple: {},   // @capacitor-community/apple-sign-in
    Camera: {},            // @capacitor/camera
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;