// Service Worker for Browser Web Push Notifications
// Employee Shift & Task Reminder Management System

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Task Reminder',
    body: 'You have a scheduled task reminder.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: '/employee/dashboard',
    },
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    vibrate: [200, 100, 200, 100, 200],
    data: data.data || { url: '/employee/dashboard' },
    actions: [
      { action: 'open_task', title: 'Open Task' },
      { action: 'close', title: 'Dismiss' },
    ],
    requireInteraction: true,
  };

  const promiseChain = self.registration.showNotification(data.title, options).then(() => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('chrome_notifications_channel');
        bc.postMessage({
          type: 'CHROME_PUSH_RECEIVED',
          title: data.title,
          body: data.body,
          icon: data.icon,
          timestamp: new Date().toISOString(),
          data: data.data,
        });
      }
    } catch (e) {}
  });

  event.waitUntil(promiseChain);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('chrome_notifications_channel');
      bc.postMessage({
        type: 'CHROME_PUSH_CLICKED',
        title: event.notification.title,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (e) {}

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/employee/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if client is already open
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

