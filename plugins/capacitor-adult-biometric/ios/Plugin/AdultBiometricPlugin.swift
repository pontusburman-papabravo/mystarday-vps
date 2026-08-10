import Foundation
import LocalAuthentication
import Capacitor

@objc(AdultBiometricPlugin)
public class AdultBiometricPlugin: CAPPlugin {

    @objc func isAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let can = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        var ret = JSObject()
        ret["available"] = can
        ret["platform"] = "ios"
        if !can {
            ret["reason"] = error?.localizedDescription ?? "unavailable"
        }
        call.resolve(ret)
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Bekräfta att du är vuxen"
        let context = LAContext()
        context.localizedFallbackTitle = ""

        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
            if success {
                call.resolve(["ok": true])
                return
            }
            let nsError = error as NSError?
            if nsError?.code == LAError.userCancel.rawValue || nsError?.code == LAError.appCancel.rawValue {
                call.reject("BIOMETRIC_CANCEL", "User cancelled", nsError)
                return
            }
            if nsError?.code == LAError.biometryNotAvailable.rawValue
                || nsError?.code == LAError.biometryNotEnrolled.rawValue
                || nsError?.code == LAError.biometryLockout.rawValue {
                call.reject("BIOMETRIC_UNAVAILABLE", "Biometry unavailable", nsError)
                return
            }
            call.reject("BIOMETRIC_FAILED", "Authentication failed", nsError)
        }
    }
}
