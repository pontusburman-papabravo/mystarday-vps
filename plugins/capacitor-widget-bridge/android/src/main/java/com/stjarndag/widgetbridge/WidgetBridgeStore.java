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
        WidgetBindingScope.saveBinding(
            context,
            installationId,
            bindingToken,
            activeChildId,
            viewerMode,
            privacyMode
        );
    }

    static void clearAll(Context context) {
        WidgetBindingScope.clearAll(context);
    }

    static void invalidatePendingAction(Context context) {
        invalidatePendingAction(context, null);
    }

    static void invalidatePendingAction(Context context, String installationId) {
        WidgetBindingScope.invalidatePendingAction(context, installationId);
    }

    public static void touchRefresh(Context context) {
        publicPrefs(context).edit().putString("last_refresh_at", Instant.now().toString()).apply();
    }

    public static String getOrCreateInstallationId(Context context) {
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
        return WidgetBindingScope.hasBinding(context, null);
    }

    public static String getBindingToken(Context context) {
        return WidgetBindingScope.getBindingToken(context, null);
    }

    public static String getActiveChildId(Context context) {
        return publicPrefs(context).getString("active_child_id", null);
    }

    public static String getViewerMode(Context context) {
        return publicPrefs(context).getString("viewer_mode", "");
    }

    public static String getPrivacyMode(Context context) {
        String mode = publicPrefs(context).getString("privacy_mode", "standard");
        if (mode == null || mode.isEmpty()) return "full";
        return mode;
    }

    public static String getInstallationId(Context context) {
        return publicPrefs(context).getString("installation_id", null);
    }

    public static boolean isPendingActionInvalidated(Context context) {
        return publicPrefs(context).getBoolean("pending_action_invalidated", false);
    }

    public static void setWidgetChildDisplayLabel(Context context, String label) {
        publicPrefs(context).edit().putString("widget_child_display_label", label).apply();
    }

    public static String getWidgetChildDisplayLabel(Context context) {
        return publicPrefs(context).getString("widget_child_display_label", null);
    }

    public static void setWidgetSnapshotJson(Context context, String json) {
        publicPrefs(context).edit().putString("widget_snapshot_json", json).apply();
    }

    public static String getWidgetSnapshotJson(Context context) {
        return publicPrefs(context).getString("widget_snapshot_json", null);
    }

    public static void setFeedbackUntil(Context context, long epochMs, int stars, String title) {
        setFeedbackUntil(context, epochMs, stars, title, null);
    }

    public static void setFeedbackUntil(
        Context context,
        long epochMs,
        int stars,
        String title,
        String childNameForParent
    ) {
        publicPrefs(context).edit()
            .putLong("widget_feedback_until", epochMs)
            .putInt("widget_feedback_stars", stars)
            .putString("widget_feedback_title", title != null ? title : "")
            .putString("widget_feedback_child_name", childNameForParent != null ? childNameForParent : "")
            .apply();
    }

    public static String getFeedbackChildName(Context context) {
        return publicPrefs(context).getString("widget_feedback_child_name", "");
    }

    public static void setAllowedChildrenJson(Context context, String json) {
        publicPrefs(context).edit().putString("widget_allowed_children_json", json).apply();
    }

    public static String getAllowedChildrenJson(Context context) {
        return publicPrefs(context).getString("widget_allowed_children_json", null);
    }

    public static void updateBindingFromSwitch(
        Context context,
        String installationId,
        String bindingToken,
        String activeChildId
    ) throws Exception {
        WidgetBindingScope.saveBinding(
            context,
            installationId,
            bindingToken,
            activeChildId,
            WidgetBindingScope.getViewerMode(context, installationId),
            WidgetBindingScope.getPrivacyMode(context, installationId)
        );
    }

    public static void updateBindingFromSwitch(Context context, String bindingToken, String activeChildId)
        throws Exception {
        updateBindingFromSwitch(context, null, bindingToken, activeChildId);
    }

    public static long getFeedbackUntil(Context context) {
        return publicPrefs(context).getLong("widget_feedback_until", 0L);
    }

    public static int getFeedbackStars(Context context) {
        return publicPrefs(context).getInt("widget_feedback_stars", 0);
    }

    public static String getFeedbackTitle(Context context) {
        return publicPrefs(context).getString("widget_feedback_title", "");
    }

    public static SharedPreferences publicPrefs(Context context) {
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
