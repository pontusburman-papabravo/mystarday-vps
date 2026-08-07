package com.stjarndag.widgetbridge.widget;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.Spinner;
import android.widget.TextView;

import com.stjarndag.widgetbridge.R;
import com.stjarndag.widgetbridge.WidgetBindingScope;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Widget configuration when adding home-screen widget (R4.5 closure).
 */
public class RoutineWidgetConfigureActivity extends Activity {
    private static final ExecutorService EXEC = Executors.newSingleThreadExecutor();

    private int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;
    private final List<ChildOption> children = new ArrayList<>();
    private RadioGroup modeGroup;
    private Spinner childSpinner;

    private static final class ChildOption {
        final String id;
        final String label;

        ChildOption(String id, String label) {
            this.id = id;
            this.label = label;
        }

        @Override
        public String toString() {
            return label;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setResult(RESULT_CANCELED);

        Bundle extras = getIntent().getExtras();
        if (extras != null) {
            appWidgetId = extras.getInt(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            );
        }
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText(R.string.widget_configure_title);
        title.setTextSize(18f);
        root.addView(title);

        modeGroup = new RadioGroup(this);
        modeGroup.setOrientation(RadioGroup.VERTICAL);
        RadioButton personal = new RadioButton(this);
        personal.setText(R.string.widget_configure_personal);
        personal.setId(View.generateViewId());
        personal.setChecked(true);
        RadioButton family = new RadioButton(this);
        family.setText(R.string.widget_configure_family);
        family.setId(View.generateViewId());
        modeGroup.addView(personal);
        modeGroup.addView(family);
        root.addView(modeGroup);

        childSpinner = new Spinner(this);
        root.addView(childSpinner);

        Button save = new Button(this);
        save.setText(R.string.widget_configure_save);
        save.setOnClickListener(v -> onSaveClicked());
        root.addView(save);

        setContentView(root);
        loadChildrenAsync();
    }

    private void loadChildrenAsync() {
        EXEC.execute(() -> {
            String defaultInst = WidgetBindingScope.normalizeScope(
                com.stjarndag.widgetbridge.WidgetBridgeStore.getInstallationId(this)
            );
            WidgetApiClient.ApiResult ctx = WidgetApiClient.fetchContext(this, defaultInst);
            List<ChildOption> loaded = new ArrayList<>();
            if (ctx.httpCode == 200 && ctx.body != null) {
                JSONArray arr = ctx.body.optJSONArray("allowed_children");
                if (arr != null) {
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject c = arr.optJSONObject(i);
                        if (c == null) continue;
                        String id = c.optString("id", "");
                        if (id.isEmpty()) continue;
                        String name = c.optString("display_name", "Barn");
                        String emoji = c.optString("emoji", "");
                        String label = emoji.isEmpty() ? name : (emoji + " " + name);
                        loaded.add(new ChildOption(id, label));
                    }
                }
            }
            runOnUiThread(() -> applyChildren(loaded));
        });
    }

    private void applyChildren(List<ChildOption> loaded) {
        children.clear();
        children.addAll(loaded);
        if (children.isEmpty()) {
            finishCancel();
            return;
        }
        ArrayAdapter<ChildOption> adapter = new ArrayAdapter<>(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            children
        );
        childSpinner.setAdapter(adapter);
        if (children.size() == 1) {
            childSpinner.setSelection(0);
            modeGroup.check(modeGroup.getChildAt(0).getId());
        }
    }

    private void onSaveClicked() {
        if (children.isEmpty()) {
            finishCancel();
            return;
        }
        ChildOption selected = (ChildOption) childSpinner.getSelectedItem();
        if (selected == null) {
            finishCancel();
            return;
        }
        boolean personal = modeGroup.getCheckedRadioButtonId() == modeGroup.getChildAt(0).getId();
        String mode = personal ? WidgetInstanceStore.MODE_PERSONAL : WidgetInstanceStore.MODE_FAMILY;
        WidgetInstanceStore.setWidgetMode(this, appWidgetId, mode);
        if (personal) {
            WidgetInstanceStore.setLockedChildId(this, appWidgetId, selected.id);
        } else {
            WidgetInstanceStore.setLockedChildId(this, appWidgetId, null);
        }

        String inst = WidgetInstanceStore.getInstallationId(this, appWidgetId);
        EXEC.execute(() -> {
            WidgetApiClient.ApiResult rebind = WidgetApiClient.rebindInstallation(
                this, defaultInstForRebind(), inst, selected.id
            );
            if (rebind.httpCode == 201 && rebind.body != null) {
                try {
                    String token = rebind.body.optString("binding_token", "");
                    String childId = rebind.body.optString("child_id", selected.id);
                    if (!token.isEmpty()) {
                        WidgetBindingScope.saveBinding(
                            this,
                            inst,
                            token,
                            childId,
                            WidgetBindingScope.getViewerMode(this, defaultInstForRebind()),
                            WidgetBindingScope.getPrivacyMode(this, defaultInstForRebind())
                        );
                    }
                    JSONObject context = rebind.body.optJSONObject("context");
                    if (context != null) {
                        WidgetChildSwitchHelper.applyContext(this, inst, context);
                    }
                } catch (Exception ignored) {
                    // ignore
                }
            }
            AppWidgetManager mgr = AppWidgetManager.getInstance(this);
            WidgetRefreshHelper.refreshSingleWidget(this, mgr, appWidgetId, false);
            runOnUiThread(this::finishOk);
        });
    }

    private String defaultInstForRebind() {
        return WidgetBindingScope.normalizeScope(
            com.stjarndag.widgetbridge.WidgetBridgeStore.getInstallationId(this)
        );
    }

    private void finishOk() {
        Intent result = new Intent();
        result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        setResult(RESULT_OK, result);
        finish();
    }

    private void finishCancel() {
        Intent result = new Intent();
        result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        setResult(RESULT_CANCELED, result);
        finish();
    }

    @Override
    public void onBackPressed() {
        finishCancel();
    }
}
