"use client";

import { useEffect, useState } from "react";
import { subscribePush, unsubscribePush } from "@/lib/push/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function NotificationToggle() {
  const [supported] = useState(() => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, [supported]);

  async function onActivar() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      alert("Las notificaciones todavía no están configuradas en el servidor.");
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
      const res = await subscribePush({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      if (!res.ok) alert(res.error);
      else setSubscribed(true);
    } finally {
      setBusy(false);
    }
  }

  async function onDesactivar() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return subscribed ? (
    <button
      onClick={onDesactivar}
      disabled={busy}
      className="text-[11.5px] text-text-faint hover:text-text disabled:opacity-50 bg-transparent border-none cursor-pointer underline p-0 text-left"
    >
      🔔 Notificaciones activadas
    </button>
  ) : (
    <button
      onClick={onActivar}
      disabled={busy}
      className="text-[11.5px] text-text-faint hover:text-text disabled:opacity-50 bg-transparent border-none cursor-pointer underline p-0 text-left"
    >
      🔕 Activar notificaciones
    </button>
  );
}
