// pragma: allowlist secret
package se.mystarday.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Enables chrome://inspect remote debugging for Android WebView (internal testing).
    WebView.setWebContentsDebuggingEnabled(true);
  }
}
