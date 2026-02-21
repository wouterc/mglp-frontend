/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Handle SPA routing: all navigation requests should go to /index.html
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
    denylist: [
        /^\/admin/,
        /^\/static/,
        /^\/media/
    ]
});
registerRoute(navigationRoute);

self.skipWaiting();
clientsClaim();

self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const title = data.title || 'MGLP Besked';

    const options: NotificationOptions = {
        body: data.body,
        icon: '/LogoMGLP.svg',
        badge: '/LogoMGLP.svg',
        data: data.data,
        tag: data.tag || 'general-message'
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data;
    // Data contains info about chat (id, type)

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any) => {
            // Check if there is already a window open
            for (const client of clientList) {
                if (client.url && 'focus' in client) {
                    client.postMessage({ type: 'OPEN_CHAT', ...data });
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                // Open with query params so the app can load the correct chat
                // Data: { id (msgId), type (msgType), afsenderId, teamId }
                // If teamId -> recipientType=team, recipientId=teamId
                // If no teamId -> recipientType=user, recipientId=afsenderId (for DM)
                const recipientType = data.teamId ? 'team' : 'user';
                const recipientId = data.teamId ? data.teamId : data.afsenderId;
                const url = `/?recipientId=${recipientId}&recipientType=${recipientType}`;
                return self.clients.openWindow(url);
            }
        })
    );
});
