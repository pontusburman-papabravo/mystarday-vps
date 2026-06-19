import Foundation
import Capacitor
import AuthenticationServices

@objc(SignInWithApple)
public class SignInWithApple: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SignInWithApple"
    public let jsName = "SignInWithApple"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise),
    ]

    @objc func authorize(_ call: CAPPluginCall) {
        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = getRequestedScopes(from: call)
        request.state = call.getString("state")
        request.nonce = call.getString("nonce")

        let defaults = UserDefaults()
        defaults.setValue(call.callbackId, forKey: "callbackId")

        self.bridge?.saveCall(call)

        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        // Required on iPad — without this Apple shows an error sheet (App Review 2.1a).
        authorizationController.presentationContextProvider = self
        authorizationController.performRequests()
    }

    func getRequestedScopes(from call: CAPPluginCall) -> [ASAuthorization.Scope]? {
        var requestedScopes: [ASAuthorization.Scope] = []

        if let scopesStr = call.getString("scopes") {
            if scopesStr.contains("name") {
                requestedScopes.append(.fullName)
            }

            if scopesStr.contains("email") {
                requestedScopes.append(.email)
            }
        }

        if requestedScopes.count > 0 {
            return requestedScopes
        }

        return nil
    }
}

extension SignInWithApple: ASAuthorizationControllerDelegate {
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else { return }

        let defaults = UserDefaults()
        let id = defaults.string(forKey: "callbackId") ?? ""
        guard let call = self.bridge?.savedCall(withID: id) else {
            return
        }

        let result = [
            "response": [
                "user": appleIDCredential.user,
                "email": appleIDCredential.email,
                "givenName": appleIDCredential.fullName?.givenName,
                "familyName": appleIDCredential.fullName?.familyName,
                "identityToken": String(data: appleIDCredential.identityToken!, encoding: .utf8),
                "authorizationCode": String(data: appleIDCredential.authorizationCode!, encoding: .utf8)
            ]
        ]

        call.resolve(result)
        self.bridge?.releaseCall(call)
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let defaults = UserDefaults()
        let id = defaults.string(forKey: "callbackId") ?? ""
        guard let call = self.bridge?.savedCall(withID: id) else {
            return
        }
        call.reject(error.localizedDescription)
        self.bridge?.releaseCall(call)
    }
}

extension SignInWithApple: ASAuthorizationControllerPresentationContextProviding {
    // iPad (and macOS) REQUIRE a presentation anchor — without a real, on-screen
    // window the request fails with ASAuthorizationError 1000 and Apple shows an
    // error sheet (App Review 2.1a). iPhone tolerates a missing anchor, which is
    // why this bug only reproduces on iPad. All APIs below are available on the
    // iOS 14 deployment target.
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // 1. Preferred: the window hosting Capacitor's WKWebView (the app's UI).
        if let window = self.bridge?.webView?.window {
            return window
        }
        // 2. The window of the Capacitor bridge view controller.
        if let window = self.bridge?.viewController?.view.window {
            return window
        }
        // 3. First foreground window scene's key/visible window.
        for scene in UIApplication.shared.connectedScenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            if windowScene.activationState == .foregroundActive || windowScene.activationState == .foregroundInactive {
                if let window = windowScene.windows.first(where: { $0.isKeyWindow }) {
                    return window
                }
                if let window = windowScene.windows.first {
                    return window
                }
            }
        }
        // 4. Any key window across the app.
        if let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) {
            return window
        }
        // 5. Last resort: any existing window, else a real visible window. Never
        //    return a detached/empty ASPresentationAnchor() — that re-triggers 1000.
        if let window = UIApplication.shared.windows.first {
            return window
        }
        let fallback = UIWindow(frame: UIScreen.main.bounds)
        fallback.makeKeyAndVisible()
        return fallback
    }
}
