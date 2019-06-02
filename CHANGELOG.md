# Changelog


## 2.0.0 -2019-05-31
- The plugin is called now **homebridge-camera-ui**
- Refactored code to support ALL RTSP cameras
- Redesigned GUI
- Added new functions to GUI
- Bugfixes

**Note:** If you are updating from v1.X to v2.X you need to remove your camera from homekit and adjust your config.json


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
