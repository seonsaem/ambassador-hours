self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || '홍보대사 시간제 관리';
    const options = {
      body: data.body,
      icon: '/logo-navy.png', // logo-navy.png 혹은 다른 적당한 로고를 지정
      badge: '/logo-navy.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard'
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    // Fallback if payload is not JSON
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('홍보대사 시간제 관리', {
        body: text,
        icon: '/logo-navy.png',
        badge: '/logo-navy.png',
        data: {
          url: '/dashboard'
        }
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open with the target URL, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
