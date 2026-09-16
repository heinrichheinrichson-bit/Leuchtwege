package com.heinrichheinrichson.leuchtwege;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;
public class ReminderRulesTest {
    @Test public void optInAndCompletion(){assertFalse(ReminderRules.deliver(false,false,false,false,false,"18:00","21:00"));assertFalse(ReminderRules.deliver(false,true,true,false,false,"18:00","21:00"));assertFalse(ReminderRules.deliver(true,true,true,true,true,"18:00","21:00"));assertTrue(ReminderRules.deliver(false,true,false,false,false,"18:00","21:00"));}
    @Test public void streakPriority(){assertFalse(ReminderRules.deliver(true,true,false,false,true,"18:00","21:00"));assertTrue(ReminderRules.deliver(true,true,false,true,true,"18:00","21:00"));assertFalse(ReminderRules.deliver(false,true,false,true,true,"20:00","21:00"));assertTrue(ReminderRules.deliver(false,true,false,true,true,"19:59","21:00"));assertTrue(ReminderRules.deliver(false,true,false,false,true,"20:00","21:00"));}
    @Test public void localTimeAndTomorrow(){Calendar now=new GregorianCalendar(TimeZone.getTimeZone("Europe/Vienna"));now.set(2026,8,16,18,0,0);now.set(Calendar.MILLISECOND,0);Calendar next=ReminderRules.next("18:00",now);assertEquals(17,next.get(Calendar.DAY_OF_MONTH));assertEquals(18,next.get(Calendar.HOUR_OF_DAY));assertEquals(16,ReminderRules.next("21:00",now).get(Calendar.DAY_OF_MONTH));}
    @Test public void daylightSaving(){Calendar now=new GregorianCalendar(TimeZone.getTimeZone("Europe/Vienna"));now.set(2026,2,28,22,0,0);Calendar next=ReminderRules.next("18:00",now);assertEquals(29,next.get(Calendar.DAY_OF_MONTH));assertEquals(18,next.get(Calendar.HOUR_OF_DAY));assertEquals("Europe/Vienna",next.getTimeZone().getID());}
    @Test(expected=IllegalArgumentException.class) public void invalidTime(){ReminderRules.minute("25:60");}
}
