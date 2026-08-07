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

/** Fetches widget state and updates RemoteViews (R4.5e). */
public final class WidgetRefreshHelper {
    private static final ExecutorService EXEC = Executors.newSingleThreadExecutor();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    private WidgetRefreshHelper() {}

    public static void refreshWidgets(
        Context context,
        AppWidgetManager mgr,
        int[] widgetIds,
        boolean switchingChild
    ) {
        for (int id : widgetIds) {
            if (switchingChild) {
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

            WidgetApiClient.ApiResult nextResult = WidgetApiClient.fetchNextAction(app);
            JSONObject next = mapNextPayload(app, nextResult);
            if (next != null) {
                WidgetBridgeStore.setWidgetSnapshotJson(app, next.toString());
            }

            syncChildLabel(app);

            boolean showFeedback = System.currentTimeMillis() < WidgetBridgeStore.getFeedbackUntil(app);
            JSONObject finalNext = next != null ? next : offlineOrErrorPayload(app, nextResult);

            MAIN.post(() -> {
                for (int id : widgetIds) {
                    WidgetRenderer.applyFromNextJson(app, mgr, id, finalNext, showFeedback);
                }
            });
        });
    }

    private static void syncChildLabel(Context app) {
        String viewer = WidgetBridgeStore.getViewerMode(app);
        if (viewer == null || viewer.isEmpty() || "child_session".equals(viewer)) {
            return;
        }
        WidgetApiClient.ApiResult ctx = WidgetApiClient.fetchContext(app);
        if (ctx.httpCode != 200 || ctx.body == null) {
            return;
        }
        JSONObject active = ctx.body.optJSONObject("active_child");
        if (active == null) {
            return;
        }
        String name = active.optString("display_name", "");
        String emoji = active.optString("emoji", "");
        if (name.isEmpty()) {
            return;
        }
        String label = emoji.isEmpty() ? name : (emoji + " " + name);
        WidgetBridgeStore.setWidgetChildDisplayLabel(app, label);
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
