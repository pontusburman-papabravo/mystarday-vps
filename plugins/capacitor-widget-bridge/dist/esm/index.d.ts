export interface WidgetBridgeConfigureOptions {
  bindingToken: string;
  activeChildId: string;
  viewerMode?: string;
  privacyMode?: string;
  installationId?: string;
}

export interface WidgetBridgeStatus {
  hasBinding: boolean;
  platform: string;
  installationId?: string | null;
  activeChildId?: string | null;
  viewerMode?: string | null;
  privacyMode?: string | null;
  lastRefreshAt?: string | null;
}

export interface WidgetBridgePlugin {
  configureBinding(options: WidgetBridgeConfigureOptions): Promise<{ ok: boolean }>;
  refreshAll(): Promise<{ ok: boolean }>;
  clearBindings(): Promise<{ ok: boolean }>;
  notifyChildChanged(options?: { activeChildId?: string }): Promise<{ ok: boolean }>;
  getStatus(): Promise<WidgetBridgeStatus>;
}

export const WidgetBridge: WidgetBridgePlugin;
