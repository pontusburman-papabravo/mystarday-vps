#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WidgetBridgePlugin, "WidgetBridge",
  CAP_PLUGIN_METHOD(configureBinding, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(refreshAll, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(clearBindings, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(notifyChildChanged, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(getStatus, CAPPluginReturnPromise);
)
