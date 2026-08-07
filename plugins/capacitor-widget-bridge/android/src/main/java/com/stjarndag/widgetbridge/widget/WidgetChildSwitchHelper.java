package com.stjarndag.widgetbridge.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;

import com.stjarndag.widgetbridge.WidgetBridgeStore;

import org.json.JSONArray;
import org.json.JSONObject;

/** Safe child switch sequence for family widget (R4.5f). */
public final class WidgetChildSwitchHelper {
    private WidgetChildSwitchHelper() {}

    public interface SwitchCallback {
        void onFinished(boolean success);
    }

    public static void switchToChild(
        Context context,
        AppWidgetManager mgr,
        int widgetId,
        String targetChildId,
        SwitchCallback callback
    ) {
        Context app = context.getApplicationContext();
        WidgetInstanceStore.setSwitchInProgress(app, widgetId, true);
        WidgetBridgeStore.invalidatePendingAction(app);
        WidgetRenderer.applySwitching(app, mgr, widgetId);

        WidgetApiClient.ApiResult result = WidgetApiClient.switchChild(app, targetChildId);
        boolean ok = false;
        try {
            if (!result.networkError && result.httpCode == 200 && result.body != null) {
                String token = result.body.optString("binding_token", "");
                String childId = result.body.optString("child_id", "");
                if (!token.isEmpty() && !childId.isEmpty()) {
                    WidgetBridgeStore.updateBindingFromSwitch(app, token, childId);
                }
                JSONObject ctx = result.body.optJSONObject("context");
                if (ctx != null) {
                    applyContext(app, ctx);
                }
                JSONObject next = result.body.optJSONObject("next");
                if (next != null) {
                    WidgetBridgeStore.setWidgetSnapshotJson(app, next.toString());
                }
                ok = true;
            }
        } catch (Exception ignored) {
            ok = false;
        } finally {
            WidgetInstanceStore.setSwitchInProgress(app, widgetId, false);
        }
        if (callback != null) {
            callback.onFinished(ok);
        }
    }

    public static void applyContext(Context app, JSONObject ctx) throws Exception {
        JSONArray allowed = ctx.optJSONArray("allowed_children");
        if (allowed != null) {
            WidgetBridgeStore.setAllowedChildrenJson(app, allowed.toString());
        }
        String profile = ctx.optString("widget_profile", "");
        JSONObject active = ctx.optJSONObject("active_child");
        if (active != null) {
            String name = active.optString("display_name", "");
            String emoji = active.optString("emoji", "");
            if (!name.isEmpty()) {
                String label = emoji.isEmpty() ? name : emoji + " " + name;
                WidgetBridgeStore.setWidgetChildDisplayLabel(app, label);
            }
        }
        if (!profile.isEmpty()) {
            // family vs personal default for new instances handled per widget id on refresh
        }
    }

    public static String resolveTargetChildId(Context context, int widgetId, String direction) {
        String json = WidgetBridgeStore.getAllowedChildrenJson(context);
        if (json == null || json.isEmpty()) {
            return null;
        }
        try {
            JSONArray arr = new JSONArray(json);
            if (arr.length() <= 1) {
                return null;
            }
            String activeId = WidgetBridgeStore.getActiveChildId(context);
            int idx = 0;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject c = arr.getJSONObject(i);
                if (activeId != null && activeId.equals(c.optString("id"))) {
                    idx = i;
                    break;
                }
            }
            if ("next".equals(direction)) {
                idx = (idx + 1) % arr.length();
            } else {
                idx = (idx - 1 + arr.length()) % arr.length();
            }
            return arr.getJSONObject(idx).optString("id", null);
        } catch (Exception e) {
            return null;
        }
    }

    public static void reconcileActiveChild(Context app, int widgetId) {
        String json = WidgetBridgeStore.getAllowedChildrenJson(app);
        if (json == null) {
            return;
        }
        try {
            JSONArray arr = new JSONArray(json);
            if (arr.length() == 0) {
                return;
            }
            String active = WidgetBridgeStore.getActiveChildId(app);
            boolean found = false;
            for (int i = 0; i < arr.length(); i++) {
                if (active != null && active.equals(arr.getJSONObject(i).optString("id"))) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                String first = arr.getJSONObject(0).optString("id");
                if (first != null && !first.isEmpty()) {
                    switchToChild(app, AppWidgetManager.getInstance(app), widgetId, first, null);
                }
            }
        } catch (Exception ignored) {
            // ignore
        }
    }
}
