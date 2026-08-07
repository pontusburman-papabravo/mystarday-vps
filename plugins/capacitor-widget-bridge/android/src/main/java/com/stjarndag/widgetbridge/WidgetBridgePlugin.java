package com.stjarndag.widgetbridge;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void configureBinding(PluginCall call) {
        String token = call.getString("bindingToken");
        String childId = call.getString("activeChildId");
        if (token == null || token.isEmpty() || childId == null || childId.isEmpty()) {
            call.reject("bindingToken and activeChildId required");
            return;
        }
        try {
            WidgetBridgeStore.saveBinding(
                getContext(),
                token,
                childId,
                call.getString("viewerMode"),
                call.getString("privacyMode"),
                call.getString("installationId")
            );
            notifyWidgetRefresh();
            call.resolve(new JSObject().put("ok", true));
        } catch (Exception e) {
            call.reject("Failed to store binding", e);
        }
    }

    @PluginMethod
    public void refreshAll(PluginCall call) {
        WidgetBridgeStore.touchRefresh(getContext());
        notifyWidgetRefresh();
        call.resolve(new JSObject().put("ok", true));
    }

    @PluginMethod
    public void clearBindings(PluginCall call) {
        WidgetBridgeStore.clearAll(getContext());
        notifyWidgetRefresh();
        call.resolve(new JSObject().put("ok", true));
    }

    @PluginMethod
    public void notifyChildChanged(PluginCall call) {
        String childId = call.getString("activeChildId");
        if (childId != null && !childId.isEmpty()) {
            WidgetBridgeStore.publicPrefs(getContext())
                .edit()
                .putString("active_child_id", childId)
                .apply();
        }
        WidgetBridgeStore.invalidatePendingAction(getContext());
        notifyWidgetRefresh();
        call.resolve(new JSObject().put("ok", true));
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("hasBinding", WidgetBridgeStore.hasBinding(getContext()));
        ret.put("platform", "android");
        var pub = WidgetBridgeStore.publicPrefs(getContext());
        ret.put("installationId", pub.getString("installation_id", null));
        ret.put("activeChildId", pub.getString("active_child_id", null));
        ret.put("viewerMode", pub.getString("viewer_mode", null));
        ret.put("privacyMode", pub.getString("privacy_mode", null));
        ret.put("lastRefreshAt", pub.getString("last_refresh_at", null));
        call.resolve(ret);
    }

    private void notifyWidgetRefresh() {
        Intent intent = new Intent("com.stjarndag.widget.REFRESH");
        intent.setPackage(getContext().getPackageName());
        getContext().sendBroadcast(intent);
    }
}
