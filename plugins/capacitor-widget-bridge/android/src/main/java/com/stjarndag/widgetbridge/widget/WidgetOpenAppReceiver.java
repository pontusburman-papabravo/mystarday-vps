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
        String url = WidgetConfig.childTodayDeepLink(context);
        Intent launch = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        launch.setPackage(context.getPackageName());
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context.startActivity(launch);
        } catch (Exception ignored) {
            // Main activity may not handle VIEW — fall back to launcher
            Intent fallback = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (fallback != null) {
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
            }
        }
    }
}
