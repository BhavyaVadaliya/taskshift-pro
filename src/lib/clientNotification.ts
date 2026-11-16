'use client';

/**
 * Trigger native Chrome desktop notification banner, broadcast event, and log to database
 */
export async function showChromeDesktopNotification(
  title: string,
  body: string,
  type: string = 'TASK_REMINDER',
  url: string = '/employee/tasks'
) {
  if (typeof window === 'undefined') return;

  // 1. Request permission if not already determined
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch (e) {}
  }

  // 2. Display native Chrome desktop notification banner
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          tag: `taskshift_${Date.now()}`,
          renotify: true,
          requireInteraction: true,
          data: { url, type, timestamp: Date.now() },
        } as any);
      } else {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `taskshift_${Date.now()}`,
          requireInteraction: true,
        } as any);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    } catch (err) {
      console.warn('Native notification failed:', err);
    }
  }

  // 3. Broadcast to open tabs via BroadcastChannel
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('chrome_notifications_channel');
      bc.postMessage({
        type: 'CHROME_PUSH_RECEIVED',
        title,
        body,
        timestamp: new Date().toISOString(),
        data: { url, type },
      });
      bc.close();
    }
  } catch (e) {}

  // 4. Also record in database logs via /api/notifications
  try {
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        message: body,
        type,
        deliveryStatus: 'DELIVERED',
      }),
    }).catch(() => {});
  } catch (e) {}
}
