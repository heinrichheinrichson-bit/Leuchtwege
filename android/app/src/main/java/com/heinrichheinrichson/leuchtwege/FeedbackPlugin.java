package com.heinrichheinrichson.leuchtwege;

import android.view.HapticFeedbackConstants;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LeuchtwegeFeedback")
public class FeedbackPlugin extends Plugin {
    @PluginMethod
    public void pulse(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            getBridge().getWebView().performHapticFeedback(
                call.getBoolean("success", false)
                    ? HapticFeedbackConstants.LONG_PRESS
                    : HapticFeedbackConstants.CLOCK_TICK
            );
            call.resolve();
        });
    }
}
