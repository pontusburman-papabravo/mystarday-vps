package com.stjarndag.widgetbridge.widget;

import java.util.HashMap;
import java.util.Map;

/** icon_key → emoji fallback (subset of config/pictogram-library.js). */
public final class WidgetPictograms {
    private static final Map<String, String> EMOJI = new HashMap<>();

    static {
        EMOJI.put("wake_up", "☀️");
        EMOJI.put("toilet", "🚽");
        EMOJI.put("wash_hands", "🧼");
        EMOJI.put("brush_teeth", "🪥");
        EMOJI.put("dress", "👕");
        EMOJI.put("breakfast", "🥣");
        EMOJI.put("pack_bag", "🎒");
        EMOJI.put("school", "🏫");
        EMOJI.put("shoes", "👟");
        EMOJI.put("coat", "🧥");
        EMOJI.put("dinner", "🍽️");
        EMOJI.put("shower", "🚿");
        EMOJI.put("pyjamas", "🛏️");
        EMOJI.put("story", "📖");
        EMOJI.put("sleep", "😴");
    }

    private WidgetPictograms() {}

    public static String emojiForKey(String imageKey) {
        if (imageKey == null || imageKey.isEmpty()) {
            return "⭐";
        }
        String e = EMOJI.get(imageKey);
        return e != null ? e : "⭐";
    }
}
