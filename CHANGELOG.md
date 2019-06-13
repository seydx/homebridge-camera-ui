# Changelog

## 2.0.7 -2019-06-13
- Bugfixes
- Added possibility to add "vcodec copy" to stream params
- Refactored code (GUI)
- Added Custom Characteristic for enable/disable telegram
- Added "current state (green/red indicator)" for cameras (GUI)
- Added "Recordings" page
- Redesigned GUI to standalone (you dont need to activate cameras anymore)
- Now it is possible to watch/download recordings over GUI and/or remove stored recordings

## 2.0.6 - 2019-06-05
- Bugfixes

## 2.0.5 - 2019-06-05
- Bugfixes

## 2.0.4 - 2019-06-05
- Bugfixes
- Added Record and Download Button for Streams
- Better Debug
- Faster storing

## 2.0.3 - 2019-06-03
- Fixed a bug with empty notifier/gui in config.json

## 2.0.2 - 2019-06-03
-Bugfixes

## 2.0.1 - 2019-06-03
- Bugfixes

## 2.0.0 - 2019-06-02
- The plugin is called now **homebridge-camera-ui**
- Refactored code to support ALL RTSP cameras
- Redesigned GUI
- Added new functions to GUI
- Bugfixes

**Note:** If you are updating from v1.X to v2.X you need to remove your camera from homekit and adjust your config.json

See [example-config.json](https://github.com/SeydX/homebridge-camera-ui/blob/master/example-config.json)

## 1.1.7 - 2019-05-31
- GUI: Added "Record" Button over Stream
- GUI: Added helmet to express
- GUI: Bugfixes

## 1.1.6 - 2019-05-30
- GUI: Added "Cameras" section
- GUI: Refactored GUI

Now it is possible to view all cameras at once over the GUI and GUI will not create a new websocket for every camera. It will set up once at start and will load the cameras from storage. (if updating from < v1.1.6 , you need to adjust your config.json (the gui part))

## 1.1.5 -2019-05-30
- Bugfixes (GUI)

## 1.1.4 - 2019-05-30
- GUI: Better scale & redesigned UI
- GUI: Added last movement timestamp

## 1.1.3 -2019-05-29
- Bugfixes (websocket and ffmpeg)
- Added viewport scale for web app

## 1.1.1 - 2019-05-29
- Added Web Application support to GUI
- Refactored GUI (now responsive)
- Bugfixes

## 1.1.0 - 2019-05-26
- Added RTSP over HTTP solution

Note: If "gui" enabled in config json, the plugin will create a websocket and http server for access camera through http. It is possible to view camera from any webbrowser

## 1.0.0 - 2019-05-26
- Init. release
