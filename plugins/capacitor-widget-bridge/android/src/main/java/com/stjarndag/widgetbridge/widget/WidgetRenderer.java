package com.stjarndag.widgetbridge.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import com.stjarndag.widgetbridge.R;
import com.stjarndag.widgetbridge.WidgetBindingScope;

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

    private static String inst(Context context, int widgetId) {
        return WidgetInstanceStore.getInstallationId(context, widgetId);
    }

    public static void applyStatus(Context context, AppWidgetManager mgr, int widgetId, String messageRes) {
        RemoteViews views = baseViews(context);
        views.setTextViewText(R.id.widget_routine_title, context.getString(R.string.widget_routine_label));
        bindChildLabel(context, views, widgetId);
        views.setTextViewText(R.id.widget_activity_title, "");
        views.setViewVisibility(R.id.widget_pictogram, View.GONE);
        views.setViewVisibility(R.id.widget_progress, View.GONE);
        views.setViewVisibility(R.id.widget_status_message, View.VISIBLE);
        views.setTextViewText(R.id.widget_status_message, messageRes);
        views.setViewVisibility(R.id.widget_primary_action, View.GONE);
        bindReconnectTap(context, views, widgetId);
        mgr.updateAppWidget(widgetId, views);
    }

    private static void bindReconnectTap(Context context, RemoteViews views, int widgetId) {
        views.setOnClickPendingIntent(
            R.id.widget_root,
            openAppPendingIntent(
                context,
                widgetId,
                "reauth",
                "/settings?from_widget=1#widgetSettingsSection"
            )
        );
    }

    public static void applyFromNextJson(
        Context context,
        AppWidgetManager mgr,
        int widgetId,
        JSONObject next,
        boolean showFeedback
    ) {
        RemoteViews views = baseViews(context);
        String installationId = inst(context, widgetId);
        String privacy = normalizePrivacy(WidgetBindingScope.getPrivacyMode(context, installationId));

        if (showFeedback && System.currentTimeMillis() < WidgetBindingScope.getFeedbackUntil(context, installationId)) {
            renderFeedback(context, views, widgetId);
            bindChildSwitcher(context, views, widgetId);
            mgr.updateAppWidget(widgetId, views);
            return;
        }

        String status = next.optString("status", "loading");
        hideOptional(views);
        bindChildSwitcher(context, views, widgetId);
        bindChildLabel(context, views, widgetId);

        switch (status) {
            case "reauth":
                views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_reauth));
                bindReconnectTap(context, views, widgetId);
                break;
            case "revoked":
                views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_revoked));
                bindReconnectTap(context, views, widgetId);
                break;
            case "offline":
                views.setTextViewText(R.id.widget_activity_title, context.getString(R.string.widget_offline));
                bindReconnectTap(context, views, widgetId);
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
                openAppPendingIntent(context, widgetId, openReason, activity.optString("open_app_path", null))
            );
            views.setContentDescription(
                R.id.widget_primary_action,
                context.getString(R.string.widget_cd_open_app)
            );
        } else if ("direct_complete".equals(capability) && !"private".equals(privacy)) {
            views.setViewVisibility(R.id.widget_primary_action, View.VISIBLE);
            views.setTextViewText(R.id.widget_primary_action, context.getString(R.string.widget_action_complete));
            if (!WidgetInstanceStore.isCompleteBlocked(context, widgetId)) {
                String instanceToken = activity.optString("instance_token", "");
                views.setOnClickPendingIntent(
                    R.id.widget_primary_action,
                    completePendingIntent(context, widgetId, instanceToken)
                );
            } else {
                views.setOnClickPendingIntent(R.id.widget_primary_action, null);
            }
            views.setContentDescription(
                R.id.widget_primary_action,
                context.getString(R.string.widget_cd_complete)
            );
        } else if ("private".equals(privacy)) {
            views.setViewVisibility(R.id.widget_primary_action, View.VISIBLE);
            views.setTextViewText(R.id.widget_primary_action, context.getString(R.string.widget_action_open_app));
            views.setOnClickPendingIntent(
                R.id.widget_primary_action,
                openAppPendingIntent(context, widgetId, openReason, activity.optString("open_app_path", null))
            );
        }
    }

    private static void renderFeedback(Context context, RemoteViews views, int widgetId) {
        String installationId = inst(context, widgetId);
        hideOptional(views);
        views.setViewVisibility(R.id.widget_feedback, View.VISIBLE);
        String viewer = WidgetBindingScope.getViewerMode(context, installationId);
        String childName = WidgetBindingScope.getFeedbackChildName(context, installationId);
        if (childName != null && !childName.isEmpty()
            && viewer != null && !viewer.isEmpty() && !"child_session".equals(viewer)) {
            views.setTextViewText(
                R.id.widget_feedback,
                context.getString(R.string.widget_feedback_done_for, childName)
            );
        } else {
            views.setTextViewText(R.id.widget_feedback, context.getString(R.string.widget_feedback_done));
        }
        int stars = WidgetBindingScope.getFeedbackStars(context, installationId);
        if (stars > 0) {
            views.setViewVisibility(R.id.widget_progress, View.VISIBLE);
            views.setTextViewText(
                R.id.widget_progress,
                context.getString(R.string.widget_feedback_stars, stars)
            );
        }
        String title = WidgetBindingScope.getFeedbackTitle(context, installationId);
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

    private static void bindChildLabel(Context context, RemoteViews views, int widgetId) {
        if (views == null) {
            return;
        }
        String installationId = inst(context, widgetId);
        String privacy = normalizePrivacy(WidgetBindingScope.getPrivacyMode(context, installationId));
        if ("private".equals(privacy) || "reduced".equals(privacy)) {
            views.setViewVisibility(R.id.widget_child_label, View.GONE);
            return;
        }
        String viewer = WidgetBindingScope.getViewerMode(context, installationId);
        if (viewer == null || viewer.isEmpty() || "child_session".equals(viewer)) {
            views.setViewVisibility(R.id.widget_child_label, View.GONE);
            return;
        }
        if (!canShowChildSwitcher(context, widgetId)) {
            String label = WidgetBindingScope.getChildDisplayLabel(context, installationId);
            if (label == null || label.isEmpty()) {
                views.setViewVisibility(R.id.widget_child_label, View.GONE);
                return;
            }
            views.setViewVisibility(R.id.widget_child_label, View.VISIBLE);
            views.setTextViewText(R.id.widget_child_label, label);
            return;
        }
        views.setViewVisibility(R.id.widget_child_label, View.GONE);
    }

    private static boolean canShowChildSwitcher(Context context, int widgetId) {
        String installationId = inst(context, widgetId);
        if (WidgetInstanceStore.MODE_PERSONAL.equals(WidgetInstanceStore.getWidgetMode(context, widgetId))) {
            String locked = WidgetInstanceStore.getLockedChildId(context, widgetId);
            if (locked != null && !locked.isEmpty()) {
                return false;
            }
        }
        String viewer = WidgetBindingScope.getViewerMode(context, installationId);
        if (viewer == null || viewer.isEmpty() || "child_session".equals(viewer)) {
            return false;
        }
        String privacy = normalizePrivacy(WidgetBindingScope.getPrivacyMode(context, installationId));
        if ("private".equals(privacy) || "reduced".equals(privacy)) {
            return false;
        }
        String json = WidgetBindingScope.getAllowedChildrenJson(context, installationId);
        if (json == null || json.isEmpty()) {
            return false;
        }
        try {
            org.json.JSONArray arr = new org.json.JSONArray(json);
            return arr.length() > 1;
        } catch (Exception e) {
            return false;
        }
    }

    private static void bindChildSwitcher(Context context, RemoteViews views, int widgetId) {
        if (!canShowChildSwitcher(context, widgetId)) {
            views.setViewVisibility(R.id.widget_child_switcher, View.GONE);
            return;
        }
        String activeName = activeChildDisplayName(context, widgetId);
        if (activeName == null || activeName.isEmpty()) {
            views.setViewVisibility(R.id.widget_child_switcher, View.GONE);
            return;
        }
        views.setViewVisibility(R.id.widget_child_switcher, View.VISIBLE);
        views.setTextViewText(R.id.widget_child_name, activeName);
        views.setContentDescription(R.id.widget_child_name, activeName);
        boolean blocked = WidgetInstanceStore.isCompleteBlocked(context, widgetId);
        if (blocked) {
            views.setOnClickPendingIntent(R.id.widget_child_prev, null);
            views.setOnClickPendingIntent(R.id.widget_child_next, null);
        } else {
            views.setOnClickPendingIntent(
                R.id.widget_child_prev,
                switchChildPendingIntent(context, widgetId, "prev")
            );
            views.setOnClickPendingIntent(
                R.id.widget_child_next,
                switchChildPendingIntent(context, widgetId, "next")
            );
        }
    }

    /** Display name only (no emoji) for parent completion feedback. */
    public static String activeChildDisplayNameForFeedback(Context context, int widgetId) {
        return activeChildDisplayName(context, widgetId);
    }

    private static String activeChildDisplayName(Context context, int widgetId) {
        String installationId = inst(context, widgetId);
        String activeId = WidgetBindingScope.getActiveChildId(context, installationId);
        String json = WidgetBindingScope.getAllowedChildrenJson(context, installationId);
        if (json == null || activeId == null) {
            return WidgetBindingScope.getChildDisplayLabel(context, installationId);
        }
        try {
            org.json.JSONArray arr = new org.json.JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                org.json.JSONObject c = arr.getJSONObject(i);
                if (activeId.equals(c.optString("id"))) {
                    return c.optString("display_name", "");
                }
            }
        } catch (Exception ignored) {
            // ignore
        }
        String label = WidgetBindingScope.getChildDisplayLabel(context, installationId);
        if (label == null) {
            return null;
        }
        int space = label.indexOf(' ');
        if (space > 0 && space < label.length() - 1) {
            return label.substring(space + 1);
        }
        return label;
    }

    public static PendingIntent switchChildPendingIntent(Context context, int widgetId, String direction) {
        Intent intent = new Intent(context, WidgetChildSwitchReceiver.class);
        intent.setAction(WidgetConfig.ACTION_SWITCH_CHILD);
        intent.putExtra(WidgetConfig.EXTRA_APP_WIDGET_ID, widgetId);
        intent.putExtra(WidgetConfig.EXTRA_SWITCH_DIRECTION, direction);
        int requestCode = widgetId * 31 + ("next".equals(direction) ? 4 : 3);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, requestCode, intent, flags);
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

    public static PendingIntent openAppPendingIntent(
        Context context,
        int widgetId,
        String reason,
        String openAppPath
    ) {
        Intent intent = new Intent(context, WidgetOpenAppReceiver.class);
        intent.setAction(WidgetConfig.ACTION_OPEN_APP);
        intent.putExtra(WidgetConfig.EXTRA_APP_WIDGET_ID, widgetId);
        intent.putExtra(WidgetConfig.EXTRA_OPEN_APP_REASON, reason != null ? reason : "");
        if (openAppPath != null && !openAppPath.isEmpty()) {
            intent.putExtra(WidgetConfig.EXTRA_OPEN_APP_PATH, openAppPath);
        }
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
