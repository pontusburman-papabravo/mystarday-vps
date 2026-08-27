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
        // NEW_TASK alone already reuses the existing task via taskAffinity
        // matching (independent of MainActivity's launchMode). CLEAR_TOP is
        // added defensively so a widget tap always surfaces MainActivity
        // itself — never a second stacked instance — regardless of OEM
        // Android variants or future launchMode changes (e.g. the
        // RevenueCat-required singleTop, see scripts/patch-android-manifest.mjs).
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
