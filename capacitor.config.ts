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
  server: isDev
    ? { url: 'http://localhost:3000', cleartext: true }
    : { url: 'https://mystarday.se', androidScheme: 'https' },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    // Google Sign-In is Android-only (platform.js). Excluding it avoids bundling
    // GoogleSignIn/GTMAppAuth/GTMSessionFetcher without Apple-required privacy manifests.
    includePlugins: [
      '@capacitor-community/apple-sign-in',
      '@capacitor/app',
      '@capacitor/camera',
      '@capacitor/push-notifications',
      '@revenuecat/purchases-capacitor',
      'capacitor-facebook-events',
      'capacitor-widget-bridge',
      'capacitor-adult-biometric',
    ],
  },
  android: {
    // Apple Sign In is iOS-only. Excluding it keeps the Android APK lean and avoids
    // shipping an unused auth plugin in Play review builds.
    includePlugins: [
      '@capacitor/app',
      '@capacitor/camera',
      '@capacitor/push-notifications',
      '@codetrix-studio/capacitor-google-auth',
      '@revenuecat/purchases-capacitor',
      'capacitor-facebook-events',
      'capacitor-widget-bridge',
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