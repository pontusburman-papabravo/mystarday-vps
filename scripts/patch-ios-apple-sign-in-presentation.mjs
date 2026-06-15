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

const PRESENTATION_EXTENSION = `
extension SignInWithApple: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let window = self.bridge?.viewController?.view.window {
            return window
        }
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let activeScenes = scenes.filter {
            $0.activationState == .foregroundActive || $0.activationState == .foregroundInactive
        }
        for scene in activeScenes + scenes {
            if let window = scene.windows.first(where: { $0.isKeyWindow }) {
                return window
            }
            if let window = scene.windows.first {
                return window
            }
        }
        if let scene = activeScenes.first ?? scenes.first {
            return UIWindow(windowScene: scene)
        }
        preconditionFailure("Sign in with Apple: no UIWindowScene available")
    }
}
`;

if (!fs.existsSync(pluginSwift)) {
  console.log('Apple Sign In plugin not installed — skip presentation patch.');
  process.exit(0);
}

let content = fs.readFileSync(pluginSwift, 'utf8');

// Remove any previous presentation patch(es) so we can re-apply an improved anchor.
while (content.includes('ASAuthorizationControllerPresentationContextProviding')) {
  content = content.replace(
    /\nextension SignInWithApple: ASAuthorizationControllerPresentationContextProviding \{[\s\S]*?\n\}/,
    ''
  );
}

const performMarker = 'authorizationController.performRequests()';
if (!content.includes(performMarker)) {
  console.error('Could not find performRequests() in Plugin.swift');
  process.exit(1);
}

if (!content.includes('presentationContextProvider = self')) {
  content = content.replace(
    performMarker,
    `authorizationController.presentationContextProvider = self
        authorizationController.performRequests()`
  );
}

content = content.trimEnd() + PRESENTATION_EXTENSION + '\n';
fs.writeFileSync(pluginSwift, content);
console.log('Patched Apple Sign In plugin for iPad presentation context (v2).');
