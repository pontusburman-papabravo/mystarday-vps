package com.stjarndag.widgetbridge.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

import com.stjarndag.widgetbridge.WidgetBridgeStore;

/**
 * Home screen routine widget (R4.5e).
 */
public class RoutineWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WidgetRefreshHelper.refreshWidgets(context, appWidgetManager, appWidgetIds, false);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null) return;
        String action = intent.getAction();
        if (WidgetConfig.ACTION_REFRESH.equals(action)) {
            boolean switching = intent.getBooleanExtra("switching_child", false);
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            int[] ids = intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS);
            if (ids == null || ids.length == 0) {
                ids = mgr.getAppWidgetIds(
                    new android.content.ComponentName(context, RoutineWidgetProvider.class)
                );
            }
            WidgetRefreshHelper.refreshWidgets(context, mgr, ids, switching);
        }
    }

    @Override
    public void onEnabled(Context context) {
        WidgetBridgeStore.touchRefresh(context);
    }
}
