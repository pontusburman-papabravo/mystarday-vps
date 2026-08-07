package com.stjarndag.widgetbridge;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import java.time.Instant;
import java.util.UUID;

/**
 * Secure widget binding storage (R4.5c). Bearer token in EncryptedSharedPreferences only.
 */
public final class WidgetBridgeStore {
    private static final String PREFS_PUBLIC = "stjarndag_widget_public";
    private static final String PREFS_SECRET = "stjarndag_widget_secret";
    private static final String KEY_BINDING = "binding_token";

    private WidgetBridgeStore() {}

    static void saveBinding(
        Context context,
        String bindingToken,
        String activeChildId,
        String viewerMode,
        String privacyMode,
        String installationId
    ) throws Exception {
        SharedPreferences secret = secretPrefs(context);
        secret.edit().putString(KEY_BINDING, bindingToken).apply();
        SharedPreferences pub = publicPrefs(context);
        SharedPreferences.Editor e = pub.edit();
        e.putString("active_child_id", activeChildId);
        e.putString("viewer_mode", viewerMode != null ? viewerMode : "");
        e.putString("privacy_mode", privacyMode != null ? privacyMode : "standard");
        if (installationId != null) {
            e.putString("installation_id", installationId);
        }
        e.putString("last_refresh_at", Instant.now().toString());
        e.putBoolean("pending_action_invalidated", false);
        e.apply();
    }

    static void clearAll(Context context) {
        try {
            secretPrefs(context).edit().clear().apply();
        } catch (Exception ignored) { /* ignore */ }
        publicPrefs(context).edit().clear().apply();
    }

    static void invalidatePendingAction(Context context) {
        publicPrefs(context).edit().putBoolean("pending_action_invalidated", true).apply();
    }

    static void touchRefresh(Context context) {
        publicPrefs(context).edit().putString("last_refresh_at", Instant.now().toString()).apply();
    }

    static String getOrCreateInstallationId(Context context) {
        SharedPreferences pub = publicPrefs(context);
        String existing = pub.getString("installation_id", null);
        if (existing != null && !existing.isEmpty()) {
            return existing;
        }
        String id = UUID.randomUUID().toString();
        pub.edit().putString("installation_id", id).apply();
        return id;
    }

    static boolean hasBinding(Context context) {
        try {
            String t = secretPrefs(context).getString(KEY_BINDING, null);
            return t != null && !t.isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    static SharedPreferences publicPrefs(Context context) {
        return context.getSharedPreferences(PREFS_PUBLIC, Context.MODE_PRIVATE);
    }

    private static SharedPreferences secretPrefs(Context context) throws Exception {
        MasterKey masterKey = new MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build();
        return EncryptedSharedPreferences.create(
            context,
            PREFS_SECRET,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        );
    }
}
