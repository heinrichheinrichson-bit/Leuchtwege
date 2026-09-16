package com.heinrichheinrichson.leuchtwege;
import android.Manifest;
import android.os.Build;
import android.content.Intent;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
@CapacitorPlugin(name="LeuchtwegeReminders",permissions={@Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class RemindersPlugin extends Plugin {
    @PluginMethod public void status(PluginCall call){JSObject r=new JSObject();r.put("allowed",ReminderReceiver.allowed(getContext()));call.resolve(r);}
    @PluginMethod public void enable(PluginCall call){if(Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")!=PermissionState.GRANTED)requestPermissionForAlias("notifications",call,"permissionResult");else status(call);}
    @PermissionCallback private void permissionResult(PluginCall call){status(call);}
    @PluginMethod public void configure(PluginCall call){try{ReminderRules.minute(call.getString("reminderTime","18:00"));ReminderRules.minute(call.getString("streakReminderTime","21:00"));ReminderReceiver.prefs(getContext()).edit().putString("config",call.getData().toString()).commit();String today=ReminderReceiver.day(java.util.Calendar.getInstance());if(ReminderReceiver.played(call.getData(),today)){NotificationManagerCompat.from(getContext()).cancel(1);NotificationManagerCompat.from(getContext()).cancel(2);}else{if(!call.getBoolean("reminderEnabled",false))NotificationManagerCompat.from(getContext()).cancel(1);if(!call.getBoolean("streakReminderEnabled",false))NotificationManagerCompat.from(getContext()).cancel(2);}ReminderReceiver.scheduleAll(getContext());call.resolve();}catch(Exception e){call.reject("Could not schedule reminders",e);}}
    @PluginMethod public void openSettings(PluginCall call){Intent i=new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getContext().getPackageName());if(Build.VERSION.SDK_INT<26)i=new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,android.net.Uri.parse("package:"+getContext().getPackageName()));getActivity().startActivity(i);call.resolve();}
    @PluginMethod public void test(PluginCall call){if(!ReminderReceiver.allowed(getContext())){call.reject("Notifications disabled");return;}ReminderReceiver.show(getContext(),3,true);call.resolve();}
}
