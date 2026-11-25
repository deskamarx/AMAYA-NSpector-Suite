package com.amaya.nspector.suite;

import android.os.Bundle;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 15+ renders edge-to-edge for apps targeting SDK 35+. Keep the
        // system-bar glyphs legible while the web layer positions controls with
        // safe-area insets. This is deliberately non-fatal on older runtimes.
        try {
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightStatusBars(false);
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightNavigationBars(false);
        } catch (Exception ignored) {
            // Native bar appearance is cosmetic; the WebView must still load.
        }
    }
}
