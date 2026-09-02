package com.stjarndag.widgetbridge.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

/**
 * Opens child today in the main app (timer / substeps). No unsigned completion deep links.
 */
public class WidgetOpenAppReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !WidgetConfig.ACTION_OPEN_APP.equals(intent.getAction())) {
            return;
        }
        String url = intent.getStringExtra(WidgetConfig.EXTRA_OPEN_APP_PATH);
        if (url == null || url.isEmpty()) {
            url = WidgetConfig.childTodayDeepLink(context);
        } else if (!url.startsWith("http")) {
            url = WidgetConfig.apiBaseUrl(context) + url;
        }
        Intent launch = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        launch.setPackage(context.getPackageName());
        // NEW_TASK finds/creates a task by taskAffinity (MainActivity has no
        // custom affinity, so it targets the app's one default task); the
        // target Activity's launchMode (singleTop — see
        // scripts/patch-android-manifest.mjs, required by RevenueCat) still
        // governs how that task's back stack itself behaves once reached.
        // CLEAR_TOP additionally drops any activity above MainActivity in
        // that task's back stack before delivering the intent, so a widget
        // tap prefers reusing the existing app task and surfacing
        // MainActivity rather than layering a new instance on top.
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        try {
            context.startActivity(launch);
        } catch (Exception ignored) {
            // Main activity may not handle VIEW — fall back to launcher
            Intent fallback = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (fallback != null) {
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                context.startActivity(fallback);
            }
        }
    }
}
