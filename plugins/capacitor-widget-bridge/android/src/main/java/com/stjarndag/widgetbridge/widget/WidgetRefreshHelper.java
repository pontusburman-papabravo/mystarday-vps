package com.stjarndag.widgetbridge.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.stjarndag.widgetbridge.R;
import com.stjarndag.widgetbridge.WidgetBridgeStore;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Fetches widget state and updates RemoteViews (R4.5e / R4.5f). */
public final class WidgetRefreshHelper {
    private static final ExecutorService EXEC = Executors.newSingleThreadExecutor();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    private WidgetRefreshHelper() {}

    public static void refreshSingleWidget(
        Context context,
        AppWidgetManager mgr,
        int widgetId,
        boolean switchingChild
    ) {
        refreshWidgets(context, mgr, new int[] { widgetId }, switchingChild);
    }

    public static void refreshWidgets(
        Context context,
        AppWidgetManager mgr,
        int[] widgetIds,
        boolean switchingChild
    ) {
        for (int id : widgetIds) {
            if (switchingChild || WidgetInstanceStore.isSwitchInProgress(context, id)) {
                WidgetRenderer.applySwitching(context, mgr, id);
            } else {
                WidgetRenderer.applyLoading(context, mgr, id);
            }
        }

        EXEC.execute(() -> {
            Context app = context.getApplicationContext();
            if (!WidgetBridgeStore.hasBinding(app)) {
                MAIN.post(() -> {
                    for (int id : widgetIds) {
                        WidgetRenderer.applyStatus(
                            app,
                            mgr,
                            id,
                            app.getString(R.string.widget_reauth)
                        );
                    }
                });
                return;
            }

            if (WidgetBridgeStore.isPendingActionInvalidated(app)) {
                WidgetBridgeStore.publicPrefs(app).edit()
                    .putBoolean("pending_action_invalidated", false)
                    .apply();
            }

            syncContextFromServer(app);

            for (int widgetId : widgetIds) {
                ensureBindingMatchesWidgetInstance(app, mgr, widgetId);
                WidgetChildSwitchHelper.reconcileActiveChild(app, widgetId);
            }

            boolean showFeedback = System.currentTimeMillis() < WidgetBridgeStore.getFeedbackUntil(app);

            for (int widgetId : widgetIds) {
                WidgetApiClient.ApiResult nextResult = WidgetApiClient.fetchNextAction(app);
                JSONObject next = mapNextPayload(app, nextResult);
                if (next != null) {
                    WidgetBridgeStore.setWidgetSnapshotJson(app, next.toString());
                }
                syncChildLabel(app);
                JSONObject finalNext = next != null ? next : offlineOrErrorPayload(app, nextResult);
                MAIN.post(() -> WidgetRenderer.applyFromNextJson(app, mgr, widgetId, finalNext, showFeedback));
            }
        });
    }

    private static void ensureBindingMatchesWidgetInstance(
        Context app,
        AppWidgetManager mgr,
        int widgetId
    ) {
        String locked = WidgetInstanceStore.getLockedChildId(app, widgetId);
        if (locked != null && !locked.isEmpty()) {
            WidgetInstanceStore.setWidgetMode(app, widgetId, WidgetInstanceStore.MODE_PERSONAL);
            String active = WidgetBridgeStore.getActiveChildId(app);
            if (active == null || !locked.equals(active)) {
                WidgetChildSwitchHelper.switchToChild(app, mgr, widgetId, locked, null);
            }
            return;
        }
        String allowedJson = WidgetBridgeStore.getAllowedChildrenJson(app);
        if (allowedJson != null && allowedJson.length() > 2) {
            try {
                int count = new org.json.JSONArray(allowedJson).length();
                if (count > 1) {
                    WidgetInstanceStore.setWidgetMode(app, widgetId, WidgetInstanceStore.MODE_FAMILY);
                }
            } catch (Exception ignored) {
                // ignore
            }
        }
    }

    private static void syncContextFromServer(Context app) {
        String viewer = WidgetBridgeStore.getViewerMode(app);
        if (viewer == null || viewer.isEmpty() || "child_session".equals(viewer)) {
            return;
        }
        WidgetApiClient.ApiResult ctx = WidgetApiClient.fetchContext(app);
        if (ctx.httpCode != 200 || ctx.body == null) {
            return;
        }
        try {
            WidgetChildSwitchHelper.applyContext(app, ctx.body);
        } catch (Exception ignored) {
            // ignore
        }
    }

    private static void syncChildLabel(Context app) {
        String viewer = WidgetBridgeStore.getViewerMode(app);
        if (viewer == null || viewer.isEmpty() || "child_session".equals(viewer)) {
            return;
        }
        String json = WidgetBridgeStore.getAllowedChildrenJson(app);
        String activeId = WidgetBridgeStore.getActiveChildId(app);
        if (json != null && activeId != null) {
            try {
                org.json.JSONArray arr = new org.json.JSONArray(json);
                for (int i = 0; i < arr.length(); i++) {
                    org.json.JSONObject c = arr.getJSONObject(i);
                    if (activeId.equals(c.optString("id"))) {
                        String name = c.optString("display_name", "");
                        String emoji = c.optString("emoji", "");
                        if (!name.isEmpty()) {
                            String label = emoji.isEmpty() ? name : (emoji + " " + name);
                            WidgetBridgeStore.setWidgetChildDisplayLabel(app, label);
                        }
                        return;
                    }
                }
            } catch (Exception ignored) {
                // ignore
            }
        }
    }

    private static JSONObject mapNextPayload(Context app, WidgetApiClient.ApiResult result) {
        if (result.networkError) {
            return null;
        }
        if (result.httpCode == 200 && result.body != null) {
            return result.body;
        }
        return null;
    }

    private static JSONObject offlineOrErrorPayload(Context app, WidgetApiClient.ApiResult result) {
        try {
            if (result.networkError) {
                return new JSONObject().put("status", "offline");
            }
            JSONObject body = result.body != null ? result.body : new JSONObject();
            String status = body.optString("status", "");
            if (result.httpCode == 401 || "reauth_required".equals(status)) {
                return new JSONObject().put("status", "reauth");
            }
            if (result.httpCode == 403 && "device_revoked".equals(status)) {
                return new JSONObject().put("status", "revoked");
            }
            if (result.httpCode == 403) {
                return new JSONObject().put("status", "reauth");
            }
            return new JSONObject().put("status", "offline");
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    public static JSONObject statusMessagePayload(Context app, JSONObject next) {
        String status = next.optString("status", "");
        switch (status) {
            case "offline":
                try {
                    return new JSONObject().put("status", "offline");
                } catch (Exception e) {
                    return next;
                }
            case "reauth":
            case "revoked":
                return next;
            default:
                return next;
        }
    }
}
