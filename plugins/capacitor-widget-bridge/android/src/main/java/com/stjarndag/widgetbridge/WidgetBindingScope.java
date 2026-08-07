package com.stjarndag.widgetbridge;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import java.time.Instant;

/**
 * Per–widget-installation binding + presentation state (R4.5g).
 * Keyed by installation_id (includes :w{appWidgetId} suffix for home-screen widgets).
 */
public final class WidgetBindingScope {
    private static final String PREFS_PUBLIC = "stjarndag_widget_public";
    private static final String PREFS_SECRET = "stjarndag_widget_secret";

    private WidgetBindingScope() {}

    public static String normalizeScope(String installationId) {
        if (installationId == null || installationId.isEmpty()) {
            return "default";
        }
        return installationId.replaceAll("[^a-zA-Z0-9._:-]", "_");
    }

    private static String secretBindingKey(String scope) {
        return "binding_" + scope;
    }

    private static String pubKey(String scope, String suffix) {
        return "s_" + scope + "_" + suffix;
    }

    public static void saveBinding(
        Context context,
        String installationId,
        String bindingToken,
        String activeChildId,
        String viewerMode,
        String privacyMode
    ) throws Exception {
        String scope = normalizeScope(installationId);
        secretPrefs(context).edit().putString(secretBindingKey(scope), bindingToken).apply();
        SharedPreferences pub = publicPrefs(context);
        SharedPreferences.Editor e = pub.edit();
        e.putString(pubKey(scope, "active_child_id"), activeChildId);
        e.putString(pubKey(scope, "viewer_mode"), viewerMode != null ? viewerMode : "");
        e.putString(pubKey(scope, "privacy_mode"), privacyMode != null ? privacyMode : "standard");
        e.putString(pubKey(scope, "last_refresh_at"), Instant.now().toString());
        e.putBoolean(pubKey(scope, "pending_invalidated"), false);
        e.apply();
        if ("default".equals(scope)) {
            legacyMirror(context, bindingToken, activeChildId, viewerMode, privacyMode);
        }
    }

    private static void legacyMirror(
        Context context,
        String bindingToken,
        String activeChildId,
        String viewerMode,
        String privacyMode
    ) throws Exception {
        secretPrefs(context).edit().putString("binding_token", bindingToken).apply();
        publicPrefs(context).edit()
            .putString("active_child_id", activeChildId)
            .putString("viewer_mode", viewerMode != null ? viewerMode : "")
            .putString("privacy_mode", privacyMode != null ? privacyMode : "standard")
            .apply();
    }

    public static boolean hasBinding(Context context, String installationId) {
        String token = getBindingToken(context, installationId);
        return token != null && !token.isEmpty();
    }

    public static String getBindingToken(Context context, String installationId) {
        try {
            String scope = normalizeScope(installationId);
            String token = secretPrefs(context).getString(secretBindingKey(scope), null);
            if (token != null && !token.isEmpty()) {
                return token;
            }
            if (!"default".equals(scope)) {
                return secretPrefs(context).getString(secretBindingKey("default"), null);
            }
            return secretPrefs(context).getString("binding_token", null);
        } catch (Exception e) {
            return null;
        }
    }

    public static String getActiveChildId(Context context, String installationId) {
        String scope = normalizeScope(installationId);
        String v = publicPrefs(context).getString(pubKey(scope, "active_child_id"), null);
        if (v != null) {
            return v;
        }
        if (!"default".equals(scope)) {
            return publicPrefs(context).getString(pubKey("default", "active_child_id"), null);
        }
        return publicPrefs(context).getString("active_child_id", null);
    }

    public static String getViewerMode(Context context, String installationId) {
        String scope = normalizeScope(installationId);
        String v = publicPrefs(context).getString(pubKey(scope, "viewer_mode"), null);
        if (v != null) {
            return v;
        }
        return publicPrefs(context).getString("viewer_mode", "");
    }

    public static String getPrivacyMode(Context context, String installationId) {
        String scope = normalizeScope(installationId);
        String mode = publicPrefs(context).getString(pubKey(scope, "privacy_mode"), null);
        if (mode == null) {
            mode = publicPrefs(context).getString("privacy_mode", "standard");
        }
        if (mode == null || mode.isEmpty()) {
            return "full";
        }
        return mode;
    }

    public static void invalidatePendingAction(Context context, String installationId) {
        String scope = normalizeScope(installationId);
        publicPrefs(context).edit().putBoolean(pubKey(scope, "pending_invalidated"), true).apply();
    }

    public static boolean isPendingActionInvalidated(Context context, String installationId) {
        String scope = normalizeScope(installationId);
        return publicPrefs(context).getBoolean(pubKey(scope, "pending_invalidated"), false);
    }

    public static void clearPendingInvalidated(Context context, String installationId) {
        String scope = normalizeScope(installationId);
        publicPrefs(context).edit().putBoolean(pubKey(scope, "pending_invalidated"), false).apply();
    }

    public static void setSwitchInProgress(Context context, String installationId, boolean value) {
        String scope = normalizeScope(installationId);
        publicPrefs(context).edit().putBoolean(pubKey(scope, "switching"), value).apply();
    }

    public static boolean isSwitchInProgress(Context context, String installationId) {
        String scope = normalizeScope(installationId);
        return publicPrefs(context).getBoolean(pubKey(scope, "switching"), false);
    }

    public static void setSnapshotJson(Context context, String installationId, String json) {
        String scope = normalizeScope(installationId);
        publicPrefs(context).edit().putString(pubKey(scope, "snapshot"), json).apply();
    }

    public static void setAllowedChildrenJson(Context context, String installationId, String json) {
        String scope = normalizeScope(installationId);
        publicPrefs(context).edit().putString(pubKey(scope, "allowed_children"), json).apply();
    }

    public static String getAllowedChildrenJson(Context context, String installationId) {
        String scope = normalizeScope(installationId);
        return publicPrefs(context).getString(pubKey(scope, "allowed_children"), null);
    }

    public static void setChildDisplayLabel(Context context, String installationId, String label) {
        String scope = normalizeScope(installationId);
        publicPrefs(context).edit().putString(pubKey(scope, "child_label"), label).apply();
    }

    public static String getChildDisplayLabel(Context context, String installationId) {
        String scope = normalizeScope(installationId);
        return publicPrefs(context).getString(pubKey(scope, "child_label"), null);
    }

    public static void setFeedback(
        Context context,
        String installationId,
        long untilMs,
        int stars,
        String title,
        String childNameForParent
    ) {
        String scope = normalizeScope(installationId);
        publicPrefs(context).edit()
            .putLong(pubKey(scope, "feedback_until"), untilMs)
            .putInt(pubKey(scope, "feedback_stars"), stars)
            .putString(pubKey(scope, "feedback_title"), title != null ? title : "")
            .putString(pubKey(scope, "feedback_child_name"), childNameForParent != null ? childNameForParent : "")
            .apply();
    }

    public static long getFeedbackUntil(Context context, String installationId) {
        return publicPrefs(context).getLong(pubKey(normalizeScope(installationId), "feedback_until"), 0L);
    }

    public static int getFeedbackStars(Context context, String installationId) {
        return publicPrefs(context).getInt(pubKey(normalizeScope(installationId), "feedback_stars"), 0);
    }

    public static String getFeedbackTitle(Context context, String installationId) {
        return publicPrefs(context).getString(pubKey(normalizeScope(installationId), "feedback_title"), "");
    }

    public static String getFeedbackChildName(Context context, String installationId) {
        return publicPrefs(context).getString(pubKey(normalizeScope(installationId), "feedback_child_name"), "");
    }

    public static void clearPresentationCache(Context context, String installationId) {
        String scope = normalizeScope(installationId);
        publicPrefs(context).edit()
            .remove(pubKey(scope, "snapshot"))
            .remove(pubKey(scope, "child_label"))
            .remove(pubKey(scope, "feedback_until"))
            .remove(pubKey(scope, "feedback_stars"))
            .remove(pubKey(scope, "feedback_title"))
            .remove(pubKey(scope, "feedback_child_name"))
            .apply();
    }

    public static void clearScope(Context context, String installationId) {
        String scope = normalizeScope(installationId);
        try {
            secretPrefs(context).edit().remove(secretBindingKey(scope)).apply();
        } catch (Exception ignored) {
            // ignore
        }
        SharedPreferences pub = publicPrefs(context);
        SharedPreferences.Editor e = pub.edit();
        for (String suffix : new String[] {
            "active_child_id", "viewer_mode", "privacy_mode", "last_refresh_at",
            "pending_invalidated", "switching", "snapshot", "allowed_children",
            "child_label", "feedback_until", "feedback_stars", "feedback_title", "feedback_child_name",
        }) {
            e.remove(pubKey(scope, suffix));
        }
        e.apply();
    }

    public static void clearAll(Context context) {
        try {
            secretPrefs(context).edit().clear().apply();
        } catch (Exception ignored) {
            // ignore
        }
        publicPrefs(context).edit().clear().apply();
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
