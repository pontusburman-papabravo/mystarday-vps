package com.stjarndag.widgetbridge.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.stjarndag.widgetbridge.R;
import com.stjarndag.widgetbridge.WidgetBindingScope;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Fetches widget state and updates RemoteViews (R4.5e / R4.5g per-instance binding). */
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
            String inst = WidgetInstanceStore.getInstallationId(context, id);
            if (switchingChild || WidgetBindingScope.isSwitchInProgress(context, inst)) {
                WidgetRenderer.applySwitching(context, mgr, id);
            } else {
                WidgetRenderer.applyLoading(context, mgr, id);
            }
        }

        EXEC.execute(() -> {
            Context app = context.getApplicationContext();
            for (int widgetId : widgetIds) {
                refreshOneWidget(app, mgr, widgetId);
            }
        });
    }

    private static void migrateBindingIfNeeded(Context app, String inst) {
        if (WidgetBindingScope.hasBinding(app, inst)) {
            return;
        }
        if ("default".equals(WidgetBindingScope.normalizeScope(inst))) {
            return;
        }
        String token = WidgetBindingScope.getBindingToken(app, "default");
        if (token == null || token.isEmpty()) {
            return;
        }
        try {
            WidgetBindingScope.saveBinding(
                app,
                inst,
                token,
                WidgetBindingScope.getActiveChildId(app, "default"),
                WidgetBindingScope.getViewerMode(app, "default"),
                WidgetBindingScope.getPrivacyMode(app, "default")
            );
        } catch (Exception ignored) {
            // ignore
        }
    }

    private static void refreshOneWidget(Context app, AppWidgetManager mgr, int widgetId) {
        String inst = WidgetInstanceStore.getInstallationId(app, widgetId);
        migrateBindingIfNeeded(app, inst);
        if (!WidgetBindingScope.hasBinding(app, inst)) {
            MAIN.post(() -> WidgetRenderer.applyStatus(
                app, mgr, widgetId, app.getString(R.string.widget_reauth)
            ));
            return;
        }

        if (WidgetBindingScope.isPendingActionInvalidated(app, inst)) {
            WidgetBindingScope.clearPendingInvalidated(app, inst);
        }

        syncContextFromServer(app, inst);
        ensureBindingMatchesWidgetInstance(app, mgr, widgetId, inst);
        WidgetChildSwitchHelper.reconcileActiveChild(app, widgetId);

        WidgetApiClient.ApiResult nextResult = WidgetApiClient.fetchNextAction(app, inst);
        JSONObject next = mapNextPayload(app, nextResult);
        if (next != null) {
            WidgetBindingScope.setSnapshotJson(app, inst, next.toString());
        }
        syncChildLabel(app, inst);

        boolean showFeedback = System.currentTimeMillis() < WidgetBindingScope.getFeedbackUntil(app, inst);
        JSONObject finalNext = next != null ? next : offlineOrErrorPayload(app, nextResult);

        MAIN.post(() -> WidgetRenderer.applyFromNextJson(app, mgr, widgetId, finalNext, showFeedback));
    }

    private static void ensureBindingMatchesWidgetInstance(
        Context app,
        AppWidgetManager mgr,
        int widgetId,
        String inst
    ) {
        String locked = WidgetInstanceStore.getLockedChildId(app, widgetId);
        if (locked != null && !locked.isEmpty()) {
            WidgetInstanceStore.setWidgetMode(app, widgetId, WidgetInstanceStore.MODE_PERSONAL);
            String active = WidgetBindingScope.getActiveChildId(app, inst);
            if (active == null || !locked.equals(active)) {
                WidgetChildSwitchHelper.switchToChild(app, mgr, widgetId, locked, null);
            }
            return;
        }
        String allowedJson = WidgetBindingScope.getAllowedChildrenJson(app, inst);
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

    private static void syncContextFromServer(Context app, String inst) {
        String viewer = WidgetBindingScope.getViewerMode(app, inst);
        if (viewer == null || viewer.isEmpty() || "child_session".equals(viewer)) {
            return;
        }
        WidgetApiClient.ApiResult ctx = WidgetApiClient.fetchContext(app, inst);
        if (ctx.httpCode != 200 || ctx.body == null) {
            return;
        }
        try {
            WidgetChildSwitchHelper.applyContext(app, inst, ctx.body);
        } catch (Exception ignored) {
            // ignore
        }
    }

    private static void syncChildLabel(Context app, String inst) {
        String viewer = WidgetBindingScope.getViewerMode(app, inst);
        if (viewer == null || viewer.isEmpty() || "child_session".equals(viewer)) {
            return;
        }
        String json = WidgetBindingScope.getAllowedChildrenJson(app, inst);
        String activeId = WidgetBindingScope.getActiveChildId(app, inst);
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
                            WidgetBindingScope.setChildDisplayLabel(app, inst, label);
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
}
