package com.stjarndag.widgetbridge.widget;

import android.content.Context;
import android.util.Log;

import com.stjarndag.widgetbridge.WidgetBridgeStore;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Server widget API (Bearer binding). No logging of tokens.
 */
public final class WidgetApiClient {
    private static final String TAG = "WidgetApi";

    private WidgetApiClient() {}

    public static final class ApiResult {
        public final int httpCode;
        public final JSONObject body;
        public final boolean networkError;

        ApiResult(int httpCode, JSONObject body, boolean networkError) {
            this.httpCode = httpCode;
            this.body = body;
            this.networkError = networkError;
        }
    }

    public static ApiResult fetchNextAction(Context context) {
        return get(context, "/api/widget/next-action");
    }

    public static ApiResult fetchContext(Context context) {
        return get(context, "/api/widget/context");
    }

    public static ApiResult completeAction(
        Context context,
        String instanceToken,
        String idempotencyKey
    ) {
        JSONObject payload = new JSONObject();
        try {
            payload.put("instance_token", instanceToken);
            payload.put("idempotency_key", idempotencyKey);
        } catch (Exception e) {
            return new ApiResult(0, null, true);
        }
        return post(context, "/api/widget/complete-action", payload);
    }

    private static ApiResult get(Context context, String path) {
        String token = WidgetBridgeStore.getBindingToken(context);
        if (token == null || token.isEmpty()) {
            return new ApiResult(401, errorJson("reauth_required"), false);
        }
        HttpURLConnection conn = null;
        try {
            URL url = new URL(WidgetConfig.apiBaseUrl(context) + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(12_000);
            conn.setReadTimeout(12_000);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Accept", "application/json");
            int code = conn.getResponseCode();
            JSONObject body = readJson(conn, code);
            return new ApiResult(code, body, false);
        } catch (Exception e) {
            Log.w(TAG, "GET failed (network)");
            return new ApiResult(0, null, true);
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private static ApiResult post(Context context, String path, JSONObject payload) {
        String token = WidgetBridgeStore.getBindingToken(context);
        if (token == null || token.isEmpty()) {
            return new ApiResult(401, errorJson("reauth_required"), false);
        }
        HttpURLConnection conn = null;
        try {
            URL url = new URL(WidgetConfig.apiBaseUrl(context) + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(15_000);
            conn.setReadTimeout(15_000);
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json");
            byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
            conn.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(bytes);
            }
            int code = conn.getResponseCode();
            JSONObject body = readJson(conn, code);
            return new ApiResult(code, body, false);
        } catch (Exception e) {
            Log.w(TAG, "POST failed (network)");
            return new ApiResult(0, null, true);
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private static JSONObject readJson(HttpURLConnection conn, int code) throws Exception {
        InputStream stream = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
        if (stream == null) {
            return new JSONObject();
        }
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        }
        String text = sb.toString().trim();
        if (text.isEmpty()) {
            return new JSONObject();
        }
        return new JSONObject(text);
    }

    private static JSONObject errorJson(String status) {
        try {
            return new JSONObject().put("status", status);
        } catch (Exception e) {
            return new JSONObject();
        }
    }
}
