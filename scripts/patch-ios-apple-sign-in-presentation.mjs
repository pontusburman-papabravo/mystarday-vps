#!/usr/bin/env node
/**
 * iPad requires ASAuthorizationControllerPresentationContextProviding for Sign in with Apple.
 * @capacitor-community/apple-sign-in omits this — causes error sheet on iPad (App Review 2.1a).
 *
 * Usage: node scripts/patch-ios-apple-sign-in-presentation.mjs
 */
import fs from 'fs';
import path from 'path';

const pluginSwift = path.join(
  process.cwd(),
  'node_modules',
  '@capacitor-community',
  'apple-sign-in',
  'ios',
  'Sources',
  'SignInWithApple',
  'Plugin.swift'
);

if (!fs.existsSync(pluginSwift)) {
  console.log('Apple Sign In plugin not installed — skip presentation patch.');
  process.exit(0);
}

let content = fs.readFileSync(pluginSwift, 'utf8');

if (content.includes('ASAuthorizationControllerPresentationContextProviding')) {
  console.log('Apple Sign In presentation patch already applied.');
  process.exit(0);
}

const performMarker = 'authorizationController.performRequests()';
if (!content.includes(performMarker)) {
  console.error('Could not find performRequests() in Plugin.swift');
  process.exit(1);
}

content = content.replace(
  performMarker,
  `authorizationController.presentationContextProvider = self
        authorizationController.performRequests()`
);

const extensionBlock = `

extension SignInWithApple: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let window = self.bridge?.viewController?.view.window {
            return window
        }
        if let scene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first(where: { $0.activationState == .foregroundActive }),
           let window = scene.windows.first(where: { $0.isKeyWindow }) {
            return window
        }
        return UIApplication.shared.windows.first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
`;

content = content.trimEnd() + extensionBlock + '\n';
fs.writeFileSync(pluginSwift, content);
console.log('Patched Apple Sign In plugin for iPad presentation context.');
