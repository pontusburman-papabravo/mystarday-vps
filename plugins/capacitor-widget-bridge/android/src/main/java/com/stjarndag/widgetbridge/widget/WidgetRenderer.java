package com.stjarndag.widgetbridge.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import com.stjarndag.widgetbridge.R;
import com.stjarndag.widgetbridge.WidgetBridgeStore;

import org.json.JSONObject;

/**
 * RemoteViews presentation for routine widget (R4.5e).
 */
public final class WidgetRenderer {
    private WidgetRenderer() {}

    public static void applyLoading(Context context, AppWidgetManager mgr, int widgetId) {
        RemoteViews views = baseViews(context);
        views.setTextViewText(R.id.widget_routine_title, context.getString(R.string.widget_routine_label));
        views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_loading));
        hideOptional(views);
        views.setViewVisibility(R.id.widget_pictogram, View.GONE);
        views.setViewVisibility(R.id.widget_progress, View.GONE);
        mgr.updateAppWidget(widgetId, views);
    }

    public static void applySwitching(Context context, AppWidgetManager mgr, int widgetId) {
        RemoteViews views = baseViews(context);
        views.setTextViewText(R.id.widget_routine_title, context.getString(R.string.widget_routine_label));
        views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_switching));
        hideOptional(views);
        mgr.updateAppWidget(widgetId, views);
    }

    public static void applyStatus(Context context, AppWidgetManager mgr, int widgetId, String messageRes) {
        RemoteViews views = baseViews(context);
        views.setTextViewText(R.id.widget_routine_title, context.getString(R.string.widget_routine_label));
        bindChildLabel(context, views);
        views.setTextViewText(R.id.widget_activity_title, "");
        views.setViewVisibility(R.id.widget_pictogram, View.GONE);
        views.setViewVisibility(R.id.widget_progress, View.GONE);
        views.setViewVisibility(R.id.widget_status_message, View.VISIBLE);
        views.setTextViewText(R.id.widget_status_message, messageRes);
        views.setViewVisibility(R.id.widget_primary_action, View.GONE);
        mgr.updateAppWidget(widgetId, views);
    }

    public static void applyFromNextJson(
        Context context,
        AppWidgetManager mgr,
        int widgetId,
        JSONObject next,
        boolean showFeedback
    ) {
        RemoteViews views = baseViews(context);
        String privacy = normalizePrivacy(WidgetBridgeStore.getPrivacyMode(context));

        if (showFeedback && System.currentTimeMillis() < WidgetBridgeStore.getFeedbackUntil(context)) {
            renderFeedback(context, views);
            mgr.updateAppWidget(widgetId, views);
            return;
        }

        String status = next.optString("status", "loading");
        hideOptional(views);
        bindChildLabel(context, views);

        switch (status) {
            case "offline":
                views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_offline));
                break;
            case "reauth":
                views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_reauth));
                break;
            case "revoked":
                views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_revoked));
                break;
            case "ready":
                renderReady(context, views, widgetId, next, privacy);
                break;
            case "all_done":
                views.setTextViewText(R.id.widget_routine_title, context.getString(R.string.widget_routine_label));
                views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_all_done));
                renderProgress(context, views, next.optJSONObject("progress"), privacy);
                break;
            case "nothing_now":
                views.setTextViewText(R.id.widget_routine_title, context.getString(R.string.widget_routine_label));
                views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_nothing_now));
                renderProgress(context, views, next.optJSONObject("progress"), privacy);
                break;
            default:
                views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_nothing_now));
                break;
        }

        mgr.updateAppWidget(widgetId, views);
    }

    private static void renderReady(
        Context context,
        RemoteViews views,
        int widgetId,
        JSONObject next,
        String privacy
    ) {
        JSONObject activity = next.optJSONObject("activity");
        if (activity == null) {
            views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_nothing_now));
            return;
        }

        String routineTitle = activity.optString("routine_title", "");
        String title = activity.optString("title", "");
        String capability = activity.optString("capability", "direct_complete");
        String openReason = activity.optString("open_app_reason", "");

        if ("private".equals(privacy)) {
            views.setTextViewText(R.id.widget_routine_title, context.getString(R.string.widget_routine_label));
            views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_private_activity));
            views.setViewVisibility(R.id.widget_pictogram, View.GONE);
            renderProgress(context, views, activity.optJSONObject("progress"), privacy);
        } else {
            views.setTextViewText(R.id.widget_routine_title, routineTitle.isEmpty()
                ? context.getString(R.string.widget_routine_label) : routineTitle);
            views.setTextViewText(R.id.widget_activity_title, title);
            views.setViewVisibility(R.id.widget_pictogram, View.VISIBLE);
            String emoji = WidgetPictograms.emojiForKey(activity.optString("image_key", null));
            views.setTextViewText(R.id.widget_pictogram, emoji);
            renderProgress(context, views, activity.optJSONObject("progress"), privacy);
        }

        if ("open_app".equals(capability)) {
            views.setViewVisibility(R.id.widget_primary_action, View.VISIBLE);
            if ("timer".equals(openReason)) {
                views.setViewVisibility(R.id.widget_timer_hint, View.VISIBLE);
                String hintTitle = "private".equals(privacy)
                    ? context.getString(R.string.widget_private_activity)
                    : title;
                views.setTextViewText(R.id.widget_timer_hint, "⏳ " + hintTitle);
                views.setTextViewText(R.id.widget_primary_action, context.getString(R.string.widget_action_open_timer));
            } else {
                views.setTextViewText(R.id.widget_primary_action, context.getString(R.string.widget_action_show_steps));
            }
            views.setOnClickPendingIntent(
                R.id.widget_primary_action,
                openAppPendingIntent(context, widgetId, openReason)
            );
            views.setContentDescription(
                R.id.widget_primary_action,
                context.getString(R.string.widget_cd_open_app)
            );
        } else if ("direct_complete".equals(capability) && !"private".equals(privacy)) {
            views.setViewVisibility(R.id.widget_primary_action, View.VISIBLE);
            views.setTextViewText(R.id.widget_primary_action, context.getString(R.string.widget_action_complete));
            String instanceToken = activity.optString("instance_token", "");
            views.setOnClickPendingIntent(
                R.id.widget_primary_action,
                completePendingIntent(context, widgetId, instanceToken)
            );
            views.setContentDescription(
                R.id.widget_primary_action,
                context.getString(R.string.widget_cd_complete)
            );
        } else if ("private".equals(privacy)) {
            views.setViewVisibility(R.id.widget_primary_action, View.VISIBLE);
            views.setTextViewText(R.id.widget_primary_action, context.getString(R.string.widget_action_open_app));
            views.setOnClickPendingIntent(
                R.id.widget_primary_action,
                openAppPendingIntent(context, widgetId, openReason)
            );
        }
    }

    private static void renderFeedback(Context context, RemoteViews views) {
        hideOptional(views);
        views.setViewVisibility(R.id.widget_feedback, View.VISIBLE);
        views.setTextViewText(R.id.widget_feedback, context.getString(R.string.widget_feedback_done));
        int stars = WidgetBridgeStore.getFeedbackStars(context);
        if (stars > 0) {
            views.setViewVisibility(R.id.widget_progress, View.VISIBLE);
            views.setTextViewText(
                R.id.widget_progress,
                context.getString(R.string.widget_feedback_stars, stars)
            );
        }
        String title = WidgetBridgeStore.getFeedbackTitle(context);
        if (title != null && !title.isEmpty()) {
            views.setTextViewText(R.id.widget_activity_title, title);
        }
        views.setViewVisibility(R.id.widget_primary_action, View.GONE);
    }

    private static void renderProgress(Context context, RemoteViews views, JSONObject progress, String privacy) {
        if (progress == null || "private".equals(privacy)) {
            views.setViewVisibility(R.id.widget_progress, View.GONE);
            return;
        }
        int completed = progress.optInt("completed", 0);
        int total = progress.optInt("total", 0);
        if (total <= 0) {
            views.setViewVisibility(R.id.widget_progress, View.GONE);
            return;
        }
        views.setViewVisibility(R.id.widget_progress, View.VISIBLE);
        views.setTextViewText(
            R.id.widget_progress,
            context.getString(R.string.widget_progress_fmt, completed, total)
        );
    }

    private static void bindChildLabel(Context context, RemoteViews views) {
        String privacy = normalizePrivacy(WidgetBridgeStore.getPrivacyMode(context));
        if ("private".equals(privacy) || "reduced".equals(privacy)) {
            views.setViewVisibility(R.id.widget_child_label, View.GONE);
            return;
        }
        String viewer = WidgetBridgeStore.getViewerMode(context);
        if (viewer == null || viewer.isEmpty() || "child_session".equals(viewer)) {
            views.setViewVisibility(R.id.widget_child_label, View.GONE);
            return;
        }
        String label = WidgetBridgeStore.getWidgetChildDisplayLabel(context);
        if (label == null || label.isEmpty()) {
            views.setViewVisibility(R.id.widget_child_label, View.GONE);
            return;
        }
        views.setViewVisibility(R.id.widget_child_label, View.VISIBLE);
        views.setTextViewText(R.id.widget_child_label, label);
    }

    private static void hideOptional(RemoteViews views) {
        views.setViewVisibility(R.id.widget_timer_hint, View.GONE);
        views.setViewVisibility(R.id.widget_feedback, View.GONE);
        views.setViewVisibility(R.id.widget_status_message, View.GONE);
        views.setViewVisibility(R.id.widget_primary_action, View.GONE);
    }

    private static RemoteViews baseViews(Context context) {
        return new RemoteViews(context.getPackageName(), R.layout.widget_routine);
    }

    private static String normalizePrivacy(String mode) {
        if (mode == null) return "full";
        switch (mode) {
            case "private":
            case "reduced":
            case "full":
                return mode;
            case "standard":
            default:
                return "full";
        }
    }

    public static PendingIntent completePendingIntent(Context context, int widgetId, String instanceToken) {
        Intent intent = new Intent(context, WidgetCompleteReceiver.class);
        intent.setAction(WidgetConfig.ACTION_COMPLETE);
        intent.putExtra(WidgetConfig.EXTRA_APP_WIDGET_ID, widgetId);
        intent.putExtra(WidgetConfig.EXTRA_INSTANCE_TOKEN, instanceToken);
        intent.putExtra(WidgetConfig.EXTRA_IDEMPOTENCY_KEY, java.util.UUID.randomUUID().toString());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, widgetId * 31 + 1, intent, flags);
    }

    public static PendingIntent openAppPendingIntent(Context context, int widgetId, String reason) {
        Intent intent = new Intent(context, WidgetOpenAppReceiver.class);
        intent.setAction(WidgetConfig.ACTION_OPEN_APP);
        intent.putExtra(WidgetConfig.EXTRA_APP_WIDGET_ID, widgetId);
        intent.putExtra(WidgetConfig.EXTRA_OPEN_APP_REASON, reason != null ? reason : "");
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, widgetId * 31 + 2, intent, flags);
    }

    public static void refreshAllWidgets(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, RoutineWidgetProvider.class);
        int[] ids = mgr.getAppWidgetIds(provider);
        if (ids.length == 0) return;
        WidgetRefreshHelper.refreshWidgets(context, mgr, ids, false);
    }
}
