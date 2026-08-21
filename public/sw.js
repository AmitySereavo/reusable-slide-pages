self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (_error) {
    data = {
      title: "New admin notification",
      body: event.data ? event.data.text() : "",
    };
  }

  const title = data.title || "New admin notification";
  const options = {
    body: data.body || "",
    data: {
      url: data.url || "/dashboard/notifications",
      notificationId: data.id || "",
    },
    icon: "/icons/paralife_trees_logo.png",
    badge: "/icons/paralife_trees_logo.png",
    tag: data.id || data.type || "admin-notification",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/dashboard/notifications";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const matchingClient = clients.find((client) =>
          client.url.includes(url)
        );

        if (matchingClient) {
          return matchingClient.focus();
        }

        return self.clients.openWindow(url);
      })
  );
});
