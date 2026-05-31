/**
 * Capacitor configuration.
 *
 * App ID: se.mystarday.app
 * App Name: Min Stjärndag
 *
 * The app loads https://mystarday.se in production (remote URL, no bundled copy).
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
  },
};

export default config;