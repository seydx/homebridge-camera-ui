const CACHE_NAME = 'camera.ui-cache';
const urlsToCache = [
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png',
  '/images/user/anonym.png',
  '/images/web/logo_transparent-256.png',
  '/images/web/logo_transparent-512.png',
  '/images/web/logo_transparent_font.png',
  '/images/web/logo_white_both.png',
  '/images/web/logo_transparent-256_blue.png',
  '/images/web/logo_transparent-512_blue.png',
  '/images/web/logo_transparent_font_blue.png',
  '/images/web/logo_white_both_blue.png',
  '/images/web/logo_transparent-256_yellow.png',
  '/images/web/logo_transparent-512_yellow.png',
  '/images/web/logo_transparent_font_yellow.png',
  '/images/web/logo_white_both_yellow.png',
  '/images/web/logo_transparent-256_green.png',
  '/images/web/logo_transparent-512_green.png',
  '/images/web/logo_transparent_font_green.png',
  '/images/web/logo_white_both_green.png',
  '/images/web/logo_transparent-256_gray.png',
  '/images/web/logo_transparent-512_gray.png',
  '/images/web/logo_transparent_font_gray.png',
  '/images/web/logo_white_both_gray.png',
  '/images/web/no_cameras.png',
  '/images/web/no_recordings.png',
  '/images/web/no_notifications.png',
  '/images/web/noimg.png',
  '/images/icons/icon-72x72.png',
  '/images/icons/icon-96x96.png',
  '/images/icons/icon-128x128.png',
  '/images/icons/icon-144x144.png',
  '/images/icons/icon-152x152.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-384x384.png',
  '/images/icons/icon-512x512.png',
  '/images/launch-screens/launch-screen-2048x2732.png',
  '/images/launch-screens/launch-screen-2732x2048.png',
  '/images/launch-screens/launch-screen-1668x2388.png',
  '/images/launch-screens/launch-screen-2388x1668.png',
  '/images/launch-screens/launch-screen-1668x2224.png',
  '/images/launch-screens/launch-screen-2224x1668.png',
  '/images/launch-screens/launch-screen-1536x2048.png',
  '/images/launch-screens/launch-screen-2048x1536.png',
  '/images/launch-screens/launch-screen-1242x2688.png',
  '/images/launch-screens/launch-screen-2688x1242.png',
  '/images/launch-screens/launch-screen-2436x1125.png',
  '/images/launch-screens/launch-screen-828x1792.png',
  '/images/launch-screens/launch-screen-1792x828.png',
  '/images/launch-screens/launch-screen-1125x2436.png',
  '/images/launch-screens/launch-screen-750x1334.png',
  '/images/launch-screens/launch-screen-1334x750.png',
  '/images/launch-screens/launch-screen-1242x2208.png',
  '/images/launch-screens/launch-screen-2208x1242.png',
  '/images/launch-screens/launch-screen-640x1136.png',
  '/images/launch-screens/launch-screen-1136x640.png',
  '/images/favicons/apple-touch-icon-57x57.png',
  '/images/favicons/apple-touch-icon-60x60.png',
  '/images/favicons/apple-touch-icon-72x72.png',
  '/images/favicons/apple-touch-icon-76x76.png',
  '/images/favicons/apple-touch-icon-114x114.png',
  '/images/favicons/apple-touch-icon-120x120.png',
  '/images/favicons/apple-touch-icon-144x144.png',
  '/images/favicons/apple-touch-icon-152x152.png',
  '/images/favicons/favicon-16x16.png',
  '/images/favicons/favicon-32x32.png',
  '/images/favicons/favicon-96x96.png',
  '/images/favicons/favicon-128x128.png',
  '/images/favicons/favicon-196x196.png',
  '/images/favicons/ms-tile-70x70.png',
  '/images/favicons/ms-tile-144x144.png',
  '/images/favicons/ms-tile-150x150.png',
  '/images/favicons/ms-tile-310x150.png',
  '/images/favicons/ms-tile-310x310.png',
  '/images/favicons/favicon.ico',
  '/fonts/fontawesome.css',
  '/fonts/webfonts/fa-brands-400.eot',
  '/fonts/webfonts/fa-brands-400.ttf',
  '/fonts/webfonts/fa-brands-400.woff',
  '/fonts/webfonts/fa-brands-400.woff2',
  '/fonts/webfonts/fa-regular-400.eot',
  '/fonts/webfonts/fa-regular-400.ttf',
  '/fonts/webfonts/fa-regular-400.woff',
  '/fonts/webfonts/fa-regular-400.woff2',
  '/fonts/webfonts/fa-solid-900.eot',
  '/fonts/webfonts/fa-solid-900.ttf',
  '/fonts/webfonts/fa-solid-900.woff',
  '/fonts/webfonts/fa-solid-900.woff2',
  '/stylesheets/style.css',
  '/stylesheets/modules/bootstrap.min.css',
  '/stylesheets/modules/bootstrap-select.min.css',
  '/javascripts/modules/bootstrap.bundle.min.js',
  '/javascripts/modules/bootstrap-select.min.js',
  '/javascripts/modules/i18next.min.js',
  '/javascripts/modules/jquery.min.js',
  '/javascripts/modules/jquery.serializeJSON.js',
  '/javascripts/modules/jquery.visible.min.js',
  '/javascripts/modules/jsmpeg.min.js',
  '/javascripts/modules/safearea.min.js',
  '/javascripts/modules/socket.io.slim.js',
  '/javascripts/modules/velocity.min.js',
  '/javascripts/modules/velocity.ui.min.js',
  '/javascripts/main.js',
  '/javascripts/utils/filter.js',
  '/javascripts/utils/detectswipe.js',
  '/javascripts/utils/socket.js',
  '/javascripts/views/camera.js',
  '/javascripts/views/cameras.js',
  '/javascripts/views/camviews.js',
  '/javascripts/views/dashboard.js',
  '/javascripts/views/login.js',
  '/javascripts/views/notifications.js',
  '/javascripts/views/recordings.js',
  '/javascripts/views/settings.js',
  '/plugins/aos/aos.js',
  '/plugins/aos/aos.css',
  '/plugins/lightcase/lightcase.css',
  '/plugins/lightcase/lightcase.js',
  '/plugins/lightcase/fonts/lightcase.eot',
  '/plugins/lightcase/fonts/lightcase.svg',
  '/plugins/lightcase/fonts/lightcase.ttf',
  '/plugins/lightcase/fonts/lightcase.woff',
  '/plugins/gridstack/gridstack.all.js',
  '/plugins/gridstack/gridstack.min.css',
  '/plugins/gridstack/jquery.ui.touch-punch.min.js',
  '/sounds/notification.wav',
  '/www/config.xml',
  '/www/manifest.json',
  '/service-worker.js',
  '/worker.js'
];

function firstWindowClient() {
  return clients.matchAll({ type: 'window' }).then(function(windowClients) {
    return windowClients.length ? windowClients[0] : Promise.reject('No clients');
  });
}

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {

  //block cache
  if(event.request.url.endsWith('/') ||
     event.request.url.endsWith('/change') ||
     event.request.url.endsWith('/dashboard') ||
     event.request.url.endsWith('/cameras') ||
     event.request.url.includes('/camera/') ||
     event.request.url.includes('/files/') ||
     event.request.url.endsWith('/files') ||
     event.request.url.endsWith('/recordings') ||
     event.request.url.includes('/recordings/') ||
     event.request.url.endsWith('/notifications') ||
     event.request.url.includes('/notifications/') ||
     event.request.url.endsWith('/logout') ||
     event.request.url.endsWith('/settings') ||
     event.request.url.includes('/settings') ||
     event.request.url.endsWith('/subscribe') ||
     event.request.url.includes('/socket.io') ||
     event.request.url.endsWith('/camviews')){
     
    return false;
    
  }

  event.respondWith(
    caches.match(event.request).then((response) => {

      if (response) {
        return response;
      }

      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();      

        event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          })
        );

        return response;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
  );
});

self.addEventListener('notificationclick', function(event) {
  var notification = event.notification;

  if (!notification.data.hasOwnProperty('options'))
    return;

  var options = notification.data.options;

  // Close the notification if the setting has been set to do so.

  if (options.close)
    event.notification.close();

  var promise = Promise.resolve();

  if (options.action == 'message') {
    firstWindowClient().then(function(client) {
      var message = 'Clicked on "' + notification.title + '"';
      if (event.action || event.reply) {
        message += ' (action: "' + event.action + '", reply: ';
        message += event.reply === null ? 'null' : '"' + event.reply + '"';
        message += ')';
      }
      client.postMessage(message);
    });

    return;
  }
  
  if (options.action == 'default' || options.action == 'focus-only') {
    promise =
        promise.then(function() { return firstWindowClient(); })
          .then(function(client) { return client.focus(); });
    if (options.action == 'default') {
      promise = promise.catch(function() { clients.openWindow(options.url); });
    }
  } else if (options.action == 'open-only-tel') {
    promise = promise.then(function() { clients.openWindow('tel:+12025550108'); });
  } else if (options.action == 'open-only-mailto') {
    promise = promise.then(function() { clients.openWindow('mailto:fake@example.com'); });
  } else if (options.action == 'open-only') {
    promise = promise.then(function() { clients.openWindow(options.url); });
  }

  event.waitUntil(promise);
});

self.addEventListener('notificationclose', function(event) {
  var notification = event.notification;
  var options = notification.data.options;

  // Available settings for |options.notificationCloseEvent| are:
  //  true: alert will be raised in the client to show the event firing.
  //  flase: no message will be sent back to the client 
  if (!options.notificationCloseEvent)
    return;

  var message = 'Closed "' + notification.title + '"';
  firstWindowClient().then(function(client) {
    client.postMessage(message);
  });
});

self.addEventListener('push', event => {

  if (!(self.Notification && self.Notification.permission === 'granted'))
    return;

  const data = event.data.json();
  
  self.registration.showNotification(data.originName + ' (' + data.type + ')', {
    type: 'image',
    dir: 'auto',
    body: (data.name + ' ' + data.detect_info + ' ' + data.time),
    tag: 'CameraUI',
    persistent: true,
    badge: 'images/web/logo_transparent-256.png',
    icon: 'images/web/logo_transparent-256.png',
    iconUrl: 'images/web/logo_transparent-256.png',
    image: (data.storing ? 'files/' + data.id + (data.fileType === 'Video' ? '@2.jpeg' : '.jpeg') : 'images/web/no_recordings.png'),
    imageUrl: (data.storing ? 'files/' + data.id + (data.fileType === 'Video' ? '@2.jpeg' : '.jpeg') : 'images/web/no_recordings.png'),
    vibrate: [100, 50, 100],
    eventTime: Date.now(),
    timestamp: Date.now(),
    data: {
      options: {
        action: 'open-only',
        close: true,
        //url: self.location.origin,
        url: self.location.origin + (data.storing ? '/files/' + data.id + (data.fileType === 'Video' ? '.mp4' : '.jpeg') : '/notifications')
      }
    },
    actions: [
      {
        action: 'open', 
        title: 'Open'
      },
    ]
  });
  
});

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(swRegistration.pushManager.subscribe(event.oldSubscription.options)
    .then(subscription => {
      $.ajax({
        url:'/subscribe',
        type:'POST',
        data:JSON.stringify(subscription),
        contentType:'application/json; charset=utf-8',
        dataType:'json'
      });
    })
  );
}, false);