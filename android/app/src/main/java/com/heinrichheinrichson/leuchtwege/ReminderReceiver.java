package com.heinrichheinrichson.leuchtwege;
import android.app.*;
import android.content.*;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.*;
import java.util.*;
import java.text.SimpleDateFormat;
public class ReminderReceiver extends BroadcastReceiver {
    static final String CHANNEL="leuchtwege_reminders";
    static SharedPreferences prefs(Context c){return c.getSharedPreferences("leuchtwege_reminders",Context.MODE_PRIVATE);}
    static JSONObject config(Context c){try{return new JSONObject(prefs(c).getString("config","{}"));}catch(Exception e){return new JSONObject();}}
    static String day(Calendar c){return new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT).format(c.getTime());}
    static boolean english(JSONObject p){String lang=p.optString("language","system");if(!lang.equals("system"))return lang.equals("en");android.os.LocaleList list=android.content.res.Resources.getSystem().getConfiguration().getLocales();for(int i=0;i<list.size();i++){String l=list.get(i).getLanguage();if(l.equals("de"))return false;if(l.equals("en"))return true;}return true;}
    static void channel(Context c){if(Build.VERSION.SDK_INT>=26){NotificationChannel channel=new NotificationChannel(CHANNEL,"Leuchtwege",NotificationManager.IMPORTANCE_DEFAULT);c.getSystemService(NotificationManager.class).createNotificationChannel(channel);}}
    static boolean allowed(Context c){channel(c);if(!NotificationManagerCompat.from(c).areNotificationsEnabled())return false;if(Build.VERSION.SDK_INT>=26)return c.getSystemService(NotificationManager.class).getNotificationChannel(CHANNEL).getImportance()!=NotificationManager.IMPORTANCE_NONE;return true;}
    static PendingIntent alarm(Context c,int kind,String date){Intent i=new Intent(c,ReminderReceiver.class).setAction("leuchtwege.REMIND").putExtra("kind",kind).putExtra("day",date);return PendingIntent.getBroadcast(c,kind,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    static void schedule(Context c,int kind){JSONObject p=config(c);AlarmManager am=c.getSystemService(AlarmManager.class);am.cancel(alarm(c,kind,""));boolean streak=kind==2;if(!p.optBoolean(streak?"streakReminderEnabled":"reminderEnabled")||!allowed(c))return;String time=p.optString(streak?"streakReminderTime":"reminderTime",streak?"21:00":"18:00");Calendar next=ReminderRules.next(time,Calendar.getInstance());am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next.getTimeInMillis(),alarm(c,kind,day(next)));}
    static void scheduleAll(Context c){schedule(c,1);schedule(c,2);}
    static boolean played(JSONObject p,String today){JSONArray days=p.optJSONArray("completedDays");if(days!=null)for(int i=0;i<days.length();i++)if(today.equals(days.optString(i)))return true;return false;}
    static void show(Context c,int kind,boolean test){if(!allowed(c))return;JSONObject p=config(c);boolean en=english(p);String body=test?(en?"Your reminders are ready.":"Deine Erinnerungen sind bereit."):kind==2?(en?"One puzzle keeps your streak going today.":"Ein Rätsel hält deine Serie heute am Laufen."):(en?"Time for a little puzzle? Your next bright moment awaits.":"Zeit für ein kleines Rätsel? Dein nächster Lichtblick wartet.");Intent i=new Intent(c,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);PendingIntent open=PendingIntent.getActivity(c,0,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);try{NotificationManagerCompat.from(c).notify(test?3:kind,new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(R.drawable.notification_light).setContentTitle("Leuchtwege").setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(open).setAutoCancel(true).build());}catch(SecurityException ignored){}}
    @Override public void onReceive(Context c,Intent intent){if(!"leuchtwege.REMIND".equals(intent.getAction())){scheduleAll(c);return;}int kind=intent.getIntExtra("kind",1);JSONObject p=config(c);String today=day(Calendar.getInstance());boolean streak=kind==2;boolean active=!p.optString("streakUntil").isEmpty()&&today.compareTo(p.optString("streakUntil"))<=0;String sent=prefs(c).getString("sent"+kind,"");
        if(today.equals(intent.getStringExtra("day"))&&!today.equals(sent)&&ReminderRules.deliver(streak,p.optBoolean(streak?"streakReminderEnabled":"reminderEnabled"),played(p,today),active,p.optBoolean("streakReminderEnabled"),p.optString("reminderTime","18:00"),p.optString("streakReminderTime","21:00"))&&allowed(c)){show(c,kind,false);prefs(c).edit().putString("sent"+kind,today).apply();}
        schedule(c,kind);
    }
}
