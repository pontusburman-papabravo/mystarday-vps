package com.stjarndag.adultbiometric;

import android.os.Build;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "AdultBiometric")
public class AdultBiometricPlugin extends Plugin {

    @PluginMethod
    public void isAvailable(PluginCall call) {
        BiometricManager manager = BiometricManager.from(getContext());
        int can = manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
        JSObject ret = new JSObject();
        ret.put("platform", "android");
        ret.put("available", can == BiometricManager.BIOMETRIC_SUCCESS);
        if (can != BiometricManager.BIOMETRIC_SUCCESS) {
            ret.put("reason", biometricReason(can));
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        FragmentActivity activity = getActivity();
        if (activity == null) {
            call.reject("BIOMETRIC_UNAVAILABLE", "No activity");
            return;
        }

        BiometricManager manager = BiometricManager.from(getContext());
        int can = manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
        if (can != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject("BIOMETRIC_UNAVAILABLE", biometricReason(can));
            return;
        }

        String reason = call.getString("reason");
        if (reason == null || reason.isEmpty()) {
            reason = "Bekräfta att du är vuxen";
        }

        Executor executor = ContextCompat.getMainExecutor(getContext());
        BiometricPrompt prompt = new BiometricPrompt(
            activity,
            executor,
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                    if (errorCode == BiometricPrompt.ERROR_USER_CANCELED
                        || errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON
                        || errorCode == BiometricPrompt.ERROR_CANCELED) {
                        call.reject("BIOMETRIC_CANCEL", errString.toString());
                    } else if (errorCode == BiometricPrompt.ERROR_NO_BIOMETRICS
                        || errorCode == BiometricPrompt.ERROR_HW_UNAVAILABLE
                        || errorCode == BiometricPrompt.ERROR_HW_NOT_PRESENT) {
                        call.reject("BIOMETRIC_UNAVAILABLE", errString.toString());
                    } else {
                        call.reject("BIOMETRIC_FAILED", errString.toString());
                    }
                }

                @Override
                public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                    call.resolve(new JSObject().put("ok", true));
                }

                @Override
                public void onAuthenticationFailed() {
                    call.reject("BIOMETRIC_FAILED", "Authentication failed");
                }
            }
        );

        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
            .setTitle(reason)
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .setNegativeButtonText("Avbryt")
            .build();

        activity.runOnUiThread(() -> prompt.authenticate(info));
    }

    private static String biometricReason(int code) {
        switch (code) {
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                return "no_hardware";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                return "hw_unavailable";
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                return "none_enrolled";
            case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                return "security_update_required";
            default:
                return "unavailable";
        }
    }
}
