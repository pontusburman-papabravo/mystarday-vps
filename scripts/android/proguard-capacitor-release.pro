# Release R8/ProGuard rules (merged into android/app/proguard-rules.pro by patch script).
# Marker: cap-release-proguard-rules-v1

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable

# Capacitor bridge + plugins
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.PluginCall <methods>;
}
-keep public class * extends com.getcapacitor.Plugin
-keep public class * extends com.getcapacitor.BridgeActivity

# WebView JavaScript bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Google Sign-In (Capacitor Google Auth)
-keep class com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# RevenueCat / Play Billing
-keep class com.revenuecat.purchases.** { *; }
-keep class com.android.billingclient.** { *; }
-dontwarn com.revenuecat.**
-dontwarn com.android.billingclient.**

# Adult biometric plugin
-keep class com.stjarndag.adultbiometric.** { *; }

# Firebase (push) — keep entry points; R8 shrinks unused SDK paths
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
