package com.heinrichheinrichson.leuchtwege;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FeedbackPlugin.class);
        registerPlugin(RemindersPlugin.class);
        registerPlugin(BackupFilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
