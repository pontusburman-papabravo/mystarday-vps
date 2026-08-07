package com.stjarndag.widgetbridge.widget;

import android.content.Context;

import com.stjarndag.widgetbridge.WidgetBridgeStore;

/** Per–app-widget instance state (R4.5f). */
public final class WidgetInstanceStore {
    public static final String MODE_PERSONAL = "personal";
    public static final String MODE_FAMILY = "family";

    private WidgetInstanceStore() {}

    private static String key(int widgetId, String suffix) {
        return "wi_" + widgetId + "_" + suffix;
    }

    public static String getWidgetMode(Context context, int widgetId) {
        return WidgetBridgeStore.publicPrefs(context).getString(key(widgetId, "mode"), "");
    }

    public static void setWidgetMode(Context context, int widgetId, String mode) {
        WidgetBridgeStore.publicPrefs(context).edit().putString(key(widgetId, "mode"), mode).apply();
    }

    public static String getLockedChildId(Context context, int widgetId) {
        return WidgetBridgeStore.publicPrefs(context).getString(key(widgetId, "locked_child"), null);
    }

    public static void setLockedChildId(Context context, int widgetId, String childId) {
        WidgetBridgeStore.publicPrefs(context).edit().putString(key(widgetId, "locked_child"), childId).apply();
    }

    public static String getInstallationId(Context context, int widgetId) {
        String inst = WidgetBridgeStore.publicPrefs(context).getString(key(widgetId, "installation_id"), null);
        if (inst != null && !inst.isEmpty()) {
            return inst;
        }
        String base = WidgetBridgeStore.getInstallationId(context);
        if (base == null || base.isEmpty()) {
            base = WidgetBridgeStore.getOrCreateInstallationId(context);
        }
        inst = base + ":w" + widgetId;
        WidgetBridgeStore.publicPrefs(context).edit().putString(key(widgetId, "installation_id"), inst).apply();
        return inst;
    }

    public static boolean isSwitchInProgress(Context context, int widgetId) {
        String inst = getInstallationId(context, widgetId);
        return WidgetBindingScope.isSwitchInProgress(context, inst);
    }

    public static void setSwitchInProgress(Context context, int widgetId, boolean value) {
        String inst = getInstallationId(context, widgetId);
        WidgetBindingScope.setSwitchInProgress(context, inst, value);
    }

    public static boolean isCompleteBlocked(Context context, int widgetId) {
        String inst = getInstallationId(context, widgetId);
        return WidgetBindingScope.isSwitchInProgress(context, inst)
            || WidgetBindingScope.isPendingActionInvalidated(context, inst);
    }
}
