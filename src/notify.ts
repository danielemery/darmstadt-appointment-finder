export interface Notification {
  title: string;
  body: string;
}

/**
 * Sends a notification through an Apprise API server's stateless notify
 * endpoint. Delivery priority is not set here — encode it per target in the
 * Apprise URL itself (e.g. gotify://host/token?priority=high).
 */
export async function sendNotification(
  appriseUrl: string,
  notifyUrls: string[],
  notification: Notification,
): Promise<void> {
  const response = await fetch(`${appriseUrl}/notify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      urls: notifyUrls.join(","),
      title: notification.title,
      body: notification.body,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Apprise notify failed: ${response.status} ${await response.text()}`,
    );
  }
}
