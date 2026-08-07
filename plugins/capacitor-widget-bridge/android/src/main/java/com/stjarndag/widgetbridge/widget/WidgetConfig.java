package com.stjarndag.widgetbridge.widget;

import android.content.Context;

import com.stjarndag.widgetbridge.R;

/** Widget constants (R4.5e). */
public final class WidgetConfig {
    public static final String ACTION_REFRESH = "com.stjarndag.widget.REFRESH";
    public static final String ACTION_COMPLETE = "com.stjarndag.widget.ACTION_COMPLETE";
    public static final String ACTION_OPEN_APP = "com.stjarndag.widget.ACTION_OPEN_APP";
    public static final String ACTION_SWITCH_CHILD = "com.stjarndag.widget.ACTION_SWITCH_CHILD";

    public static final String EXTRA_APP_WIDGET_ID = "appWidgetId";
    public static final String EXTRA_INSTANCE_TOKEN = "instance_token";
    public static final String EXTRA_IDEMPOTENCY_KEY = "idempotency_key";
    public static final String EXTRA_OPEN_APP_REASON = "open_app_reason";
    public static final String EXTRA_TARGET_CHILD_ID = "target_child_id";
    public static final String EXTRA_SWITCH_DIRECTION = "switch_direction";

    public static final long FEEDBACK_MS = 2200L;
    public static final long COMPLETE_DEBOUNCE_MS = 1500L;

    private WidgetConfig() {}

    public static String apiBaseUrl(Context context) {
        String fromRes = context.getString(R.string.widget_api_base_url);
        if (fromRes != null && !fromRes.isEmpty() && !fromRes.contains("WIDGET_API_BASE")) {
            return fromRes.replaceAll("/$", "");
        }
        String env = System.getenv("WIDGET_API_BASE_URL");
        if (env != null && !env.isEmpty()) {
            return env.replaceAll("/$", "");
        }
        return "";
    }

    public static String childTodayDeepLink(Context context) {
        return apiBaseUrl(context) + "/child/today";
    }
}
