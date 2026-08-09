package com.shiftr.pccontroller;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.shiftr.pccontroller.plugin.BluetoothHidPlugin;
import com.shiftr.pccontroller.plugin.TvRemotePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BluetoothHidPlugin.class);
        registerPlugin(TvRemotePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
