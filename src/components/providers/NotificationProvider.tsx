'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { soundPlayer } from '@/lib/audio';
import { NotificationDTO } from '@/types';

interface NotificationContextType {
  notifications: NotificationDTO[];
  unreadCount: number;
  pushPermission: NotificationPermission | 'unsupported';
  isPushSubscribed: boolean;
  soundEnabled: boolean;
  toggleSound: () => void;
  requestPushPermission: () => Promise<boolean>;
  markAsRead: (id?: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  pushPermission: 'default',
  isPushSubscribed: false,
  soundEnabled: true,
  toggleSound: () => {},
  requestPushPermission: async () => false,
  markAsRead: async () => {},
  fetchNotifications: async () => {},
});

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevUnreadRef = useRef<number>(0);

  // Initialize permission state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setPushPermission(Notification.permission);
      } else {
        setPushPermission('unsupported');
      }

      const storedSound = localStorage.getItem('sound_enabled');
      if (storedSound !== null) {
        setSoundEnabled(storedSound === 'true');
      }
    }
  }, []);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('sound_enabled', String(nextVal));
    if (nextVal) {
      soundPlayer.playChime('success');
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        const newUnread = data.unreadCount || 0;

        // If new unread notification arrived, play sound
        if (newUnread > prevUnreadRef.current && prevUnreadRef.current !== 0) {
          if (soundEnabled) {
            soundPlayer.playChime('reminder');
          }
        }
        prevUnreadRef.current = newUnread;
        setUnreadCount(newUnread);
      }
    } catch (err) {
      // silent catch for background polling
    }
  }, [user, soundEnabled]);

  // Register service worker and check existing subscription
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !user) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then(async (registration) => {
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          setIsPushSubscribed(true);
        }
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  }, [user]);

  // Periodic in-app notifications polling
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const requestPushPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Browser push notifications are not supported on this browser.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== 'granted') {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY not configured.');
        return false;
      }

      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      // Send subscription to server
      const p256dh = sub.getKey('p256dh');
      const auth = sub.getKey('auth');

      const p256dhArr = p256dh ? Array.from(new Uint8Array(p256dh)) : [];
      const authArr = auth ? Array.from(new Uint8Array(auth)) : [];

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: p256dhArr.length ? btoa(String.fromCharCode.apply(null, p256dhArr)) : '',
            auth: authArr.length ? btoa(String.fromCharCode.apply(null, authArr)) : '',
          },
        }),
      });

      if (res.ok) {
        setIsPushSubscribed(true);
        soundPlayer.playChime('success');
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Failed to subscribe push notifications:', err);
      alert('Could not subscribe for push notifications: ' + (err.message || 'Error'));
      return false;
    }
  };

  const markAsRead = async (id?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : { markAllAsRead: true }),
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        pushPermission,
        isPushSubscribed,
        soundEnabled,
        toggleSound,
        requestPushPermission,
        markAsRead,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
