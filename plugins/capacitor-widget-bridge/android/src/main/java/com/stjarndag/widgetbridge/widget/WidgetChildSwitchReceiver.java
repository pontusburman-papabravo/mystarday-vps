package com.stjarndag.widgetbridge.widget;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Family widget child switch (R4.5f). */
public class WidgetChildSwitchReceiver extends BroadcastReceiver {
    private static final ExecutorService EXEC = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !WidgetConfig.ACTION_SWITCH_CHILD.equals(intent.getAction())) {
            return;
        }
        final PendingResult pending = goAsync();
        final Context app = context.getApplicationContext();
        final int widgetId = intent.getIntExtra(WidgetConfig.EXTRA_APP_WIDGET_ID, 0);
        String target = intent.getStringExtra(WidgetConfig.EXTRA_TARGET_CHILD_ID);
        if (target == null || target.isEmpty()) {
            String dir = intent.getStringExtra(WidgetConfig.EXTRA_SWITCH_DIRECTION);
            target = WidgetChildSwitchHelper.resolveTargetChildId(app, widgetId, dir);
        }
        if (target == null || target.isEmpty()) {
            pending.finish();
            return;
        }
        final String targetChildId = target;
        final AppWidgetManager mgr = AppWidgetManager.getInstance(app);
        EXEC.execute(() -> {
            try {
                WidgetChildSwitchHelper.switchToChild(app, mgr, widgetId, targetChildId, ok ->
                    WidgetRefreshHelper.refreshSingleWidget(app, mgr, widgetId, false)
                );
            } finally {
                pending.finish();
            }
        });
    }
}
