self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🍽 Ново обедно меню!';
  const options = {
    body: data.body || 'Менюто за днес е готово. Натиснете за да го видите.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});
