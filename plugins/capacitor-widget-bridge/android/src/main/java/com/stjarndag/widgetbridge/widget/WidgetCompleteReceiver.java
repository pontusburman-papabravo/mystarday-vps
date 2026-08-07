package com.stjarndag.widgetbridge.widget;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.SystemClock;

import com.stjarndag.widgetbridge.WidgetBindingScope;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Secure completion action — POST /api/widget/complete-action (R4.5e / R4.5g).
 */
public class WidgetCompleteReceiver extends BroadcastReceiver {
    private static final ExecutorService EXEC = Executors.newSingleThreadExecutor();
    private static long lastCompleteAtMs = 0L;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !WidgetConfig.ACTION_COMPLETE.equals(intent.getAction())) {
            return;
        }
        final PendingResult pending = goAsync();
        final Context app = context.getApplicationContext();
        final int widgetId = intent.getIntExtra(WidgetConfig.EXTRA_APP_WIDGET_ID, 0);
        final String instanceToken = intent.getStringExtra(WidgetConfig.EXTRA_INSTANCE_TOKEN);
        final String idempotencyKey = intent.getStringExtra(WidgetConfig.EXTRA_IDEMPOTENCY_KEY);

        if (instanceToken == null || instanceToken.isEmpty()
            || idempotencyKey == null || idempotencyKey.isEmpty()) {
            pending.finish();
            return;
        }

        long now = SystemClock.elapsedRealtime();
        if (now - lastCompleteAtMs < WidgetConfig.COMPLETE_DEBOUNCE_MS) {
            pending.finish();
            return;
        }
        lastCompleteAtMs = now;

        final String inst = WidgetInstanceStore.getInstallationId(app, widgetId);
        if (WidgetBindingScope.isPendingActionInvalidated(app, inst)
            || WidgetInstanceStore.isCompleteBlocked(app, widgetId)) {
            WidgetRefreshHelper.refreshSingleWidget(app, AppWidgetManager.getInstance(app), widgetId, false);
            pending.finish();
            return;
        }

        EXEC.execute(() -> {
            try {
                WidgetApiClient.ApiResult result = WidgetApiClient.completeAction(
                    app,
                    inst,
                    instanceToken,
                    idempotencyKey
                );
                handleCompleteResult(app, widgetId, inst, result);
            } finally {
                WidgetRefreshHelper.refreshSingleWidget(
                    app,
                    AppWidgetManager.getInstance(app),
                    widgetId,
                    false
                );
                pending.finish();
            }
        });
    }

    private static void handleCompleteResult(
        Context app,
        int widgetId,
        String inst,
        WidgetApiClient.ApiResult result
    ) {
        if (result.networkError) {
            return;
        }
        if (result.httpCode == 409 && result.body != null) {
            JSONObject next = result.body.optJSONObject("next");
            if (next != null) {
                WidgetBindingScope.setSnapshotJson(app, inst, next.toString());
            }
            return;
        }
        if (result.httpCode != 200 || result.body == null) {
            return;
        }
        JSONObject body = result.body;
        String status = body.optString("status", "");
        if (!"completed".equals(status) && !"already_completed".equals(status)) {
            return;
        }
        if ("already_completed".equals(status)) {
            JSONObject next = body.optJSONObject("next");
            if (next != null) {
                WidgetBindingScope.setSnapshotJson(app, inst, next.toString());
            }
            return;
        }
        int stars = 0;
        JSONObject reward = body.optJSONObject("reward");
        if (reward != null) {
            stars = reward.optInt("stars_added", 0);
        }
        JSONObject completed = body.optJSONObject("completed");
        String title = completed != null ? completed.optString("title", "") : "";
        long until = System.currentTimeMillis() + WidgetConfig.FEEDBACK_MS;
        String parentChildName = null;
        String viewer = WidgetBindingScope.getViewerMode(app, inst);
        if (viewer != null && !viewer.isEmpty() && !"child_session".equals(viewer)) {
            parentChildName = WidgetRenderer.activeChildDisplayNameForFeedback(app, widgetId);
        }
        WidgetBindingScope.setFeedback(app, inst, until, stars, title, parentChildName);
        android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
        handler.postDelayed(
            () -> WidgetRefreshHelper.refreshSingleWidget(
                app,
                AppWidgetManager.getInstance(app),
                widgetId,
                false
            ),
            WidgetConfig.FEEDBACK_MS + 100
        );
    }
}
