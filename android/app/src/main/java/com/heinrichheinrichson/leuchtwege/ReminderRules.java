package com.heinrichheinrichson.leuchtwege;
import java.util.Calendar;
public final class ReminderRules {
    public static int minute(String time) {
        if(time==null || !time.matches("([01][0-9]|2[0-3]):[0-5][0-9]")) throw new IllegalArgumentException("Invalid time");
        return Integer.parseInt(time.substring(0,2))*60+Integer.parseInt(time.substring(3));
    }
    public static boolean deliver(boolean streak, boolean enabled, boolean played, boolean active, boolean otherEnabled, String dailyTime, String streakTime) {
        if(!enabled || played) return false;
        if(streak) return active;
        int delta=Math.abs(minute(dailyTime)-minute(streakTime));
        return !(active && otherEnabled && delta<=60);
    }
    public static Calendar next(String time, Calendar now) {
        int mins=minute(time);Calendar next=(Calendar)now.clone();
        next.set(Calendar.HOUR_OF_DAY,mins/60);next.set(Calendar.MINUTE,mins%60);next.set(Calendar.SECOND,0);next.set(Calendar.MILLISECOND,0);
        if(!next.after(now)) next.add(Calendar.DATE,1);
        return next;
    }
}
