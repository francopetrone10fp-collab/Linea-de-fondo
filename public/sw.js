// Service worker mínimo, solo para notificaciones push (no cachea nada).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Línea de Fondo", body: event.data.text() };
  }

  const title = payload.title || "Línea de Fondo";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    // El badge tiene que ser una silueta blanca sobre transparente: Android
    // la usa para el ícono chico de la barra de notificaciones y la tiñe
    // solo, así que una imagen a color (como icon-192.png) se ve como un
    // bloque sólido sin forma.
    badge: "/badge-96.png",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
