package __PACKAGE__

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.SystemClock
import android.widget.RemoteViews
import java.util.Calendar

/**
 * "Left today": the time until the next local midnight, ticking every second on the home screen with the app
 * closed. Android's own Chronometer does the ticking (counting down), so nothing has to redraw the widget. It is
 * reset at midnight by an inexact alarm (no exact-alarm permission needed), when the phone's time or time zone
 * changes, and every 30 minutes as a fallback (updatePeriodMillis). Added by plugins/day-countdown.
 */
class DayCountdownWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    for (id in ids) manager.updateAppWidget(id, views(context))
    scheduleMidnight(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      ACTION_MIDNIGHT, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED -> refreshAll(context)
    }
  }

  override fun onDisabled(context: Context) {
    context.getSystemService(AlarmManager::class.java)?.cancel(midnightIntent(context))
  }

  companion object {
    const val ACTION_MIDNIGHT = "__PACKAGE__.DAY_COUNTDOWN_MIDNIGHT"

    private fun nextMidnight(): Long {
      val c = Calendar.getInstance()
      c.add(Calendar.DAY_OF_YEAR, 1)
      c.set(Calendar.HOUR_OF_DAY, 0)
      c.set(Calendar.MINUTE, 0)
      c.set(Calendar.SECOND, 0)
      c.set(Calendar.MILLISECOND, 0)
      return c.timeInMillis
    }

    private fun views(context: Context): RemoteViews {
      val left = nextMidnight() - System.currentTimeMillis()
      val v = RemoteViews(context.packageName, R.layout.day_countdown_widget)
      v.setChronometer(R.id.day_countdown_time, SystemClock.elapsedRealtime() + left, null, true)
      v.setChronometerCountDown(R.id.day_countdown_time, true)
      // Tapping opens the app on the Today tab.
      val open = Intent(Intent.ACTION_VIEW, Uri.parse("__SCHEME__://timer"))
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      v.setOnClickPendingIntent(
        R.id.day_countdown_root,
        PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE),
      )
      return v
    }

    private fun midnightIntent(context: Context): PendingIntent =
      PendingIntent.getBroadcast(
        context, 1,
        Intent(context, DayCountdownWidget::class.java).setAction(ACTION_MIDNIGHT),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )

    private fun scheduleMidnight(context: Context) {
      // A one-minute window: Android may batch it, but it needs no exact-alarm permission.
      context.getSystemService(AlarmManager::class.java)
        ?.setWindow(AlarmManager.RTC_WAKEUP, nextMidnight(), 60_000L, midnightIntent(context))
    }

    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, DayCountdownWidget::class.java))
      for (id in ids) manager.updateAppWidget(id, views(context))
      if (ids.isNotEmpty()) scheduleMidnight(context)
    }
  }
}
