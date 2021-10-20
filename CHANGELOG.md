# Changelog

# NEXT

## Notable Changes
- **HomeKit Secure Video (HSV)**
  - Added HSV support for homebridge: HSV requires a home hub and iCloud plan with at least 200GB of storage.
  - Added HSV support for camera.ui: camera.ui can edit the recordings of HomeKit created by HSV. Thus, it is no longer possible to start a new recording when a movement is detected. All camera.ui functions are also available for recordings made by HSV.
- **Prebuffering**
  - Regardless of whether HSV is enabled or not, this option allows you to go back in time during recording up to 10 seconds (HSV off, or 4 sec. if HSV is enabled) to see the event BEFORE the movement. If HSV is not enabled, it means that additional 10 (or 4) seconds will be added to the setted recording duration (e.g. 10sec + 10 sec). When HSV is enabled, the duration of the recording is completely determined by Apple Home.
- **Notifications**
  - **Alexa:** It is now possible to send a motion notification with directly to Alexa. Thus, when motion is detected, a message with your own text message is sent to Alexa and Alexa plays that text back for you. Also, the speaker statement time can be set to not be disturbed at night. Adjustable in the interface settings.

## Other changes
- **Interface**
  - Added 16:9 aspect ratio to `camera` view
  - Changed `removeAfter` duration for notifications/recordings
  - The quality of the streams was increased (`-q 1`)
  - Minor UI improvements
  - Removed camera pinging on movement detection to avoid `Image Buffer is empty` errors
- Bump dependencies

## Bugfixes
- Fixed an issue where the service worker did not update the user interface correctly
- Fixed an issue where the "Fullscreen" button in CamView were not displayed correctly on non-mobile devices.
- Fixed an issue where downloading a recording with Safari did not allow the user to return to the user interface
- Fixed an issue where the restored socket.io connection (on mobile devices) did not restore the live stream on `Dashboard` and `Camview`.
- Fixed an issue where camera streams that took a longer to start were stopped on homebridge-config-ui-x
- Fixed an issue where sending multiple telegram messages could cause an error
- Fixed an issue where `resetting` the motion detection caused the interface to treat it as normal motion detection
- Fixed test cases
- Minor bugfixes

# v4.2.10 - 2021-10-04

## Other changes
- Interface:
  - Added new option to notifications settings to enable/disable notifications
  - Telegram notifications can now be disabled for each camera
- Bump dependencies

## Bugfixes
- Minor bugfixes

# v4.2.9 - 2021-09-19

## Other changes
- Homebridge UI:
  - Config UI X now displays an error message if the connection to the camera is not possible
- Interface/Homebridge:
  - Added new `stimeout` option to `videoConfig` in config.json to prevent hanging ffmpeg processes 
- Bump dependencies

# v4.2.7 - 2021-05-29

## Other changes
- Bump dependencies

# v4.2.6 - 2021-05-17

## Other changes
- Interface:
  - Added `ping timeout` to camera settings
- Bump dependencies

# v4.2.5 - 2021-05-08

## Other changes
- Plugin:
  - Changed `getPort` with `pick-port`
- Homebridge UI:
  - Get ffmpeg path from `ffmpeg-for-homebridge` if no videoProcessor is set up in config.json
- Bump dependencies

## Bugfixes
- Fixed an issue where actionsheets buttons were also displayed with `show=false`
- Fixed an issue where the `Fullscreen` button was also displayed on mobile devices (camview)
- Minor plugin bugfixes

# v4.2.4 - 2021-05-06

## Other changes
- Server:
  - Improvements in image rekognition. Replaced `node-rekognition` with `@aws/client-rekognition`
- Interface:
  - Added `auto darkmode` switch to settings to automatically switch darkmode based on system settings (if supported)
  - Added support for multi-layer configuration for camview. It is now possible to dynamically store each number of displayed videos separately in localStorage and call the layout. Fully automatic!
- Bump dependencies

## Bugfixes
- Fixed an issue where an empty image buffer crashed image rekognition
- Fixed an issue where changing layout (adding or removing camera via actionsheet) does not work properly
- Minor UI bugfixes

# v4.2.3 - 2021-05-06

## Bugfixes
- Fixed an issue where `config` button does not load config.schema.json if no plugin configuration is found
- Minor homebridge-ui bugfixes

# v4.2.2 - 2021-05-06

## Bugfixes
- Fixed an issue where missing plugin config crashed homebridge (again)

# v4.2.1 - 2021-05-06

## Other changes
- Interface:
  - Added `fullscreen` button to bottom actionsheet (camview)
  - Changed recording subtitle from `Type - Date` to `Type - Room` (recordings)
  - Added additional media queries to recording cards
  - Minor UI improvements

## Bugfixes
- Fixed an issue where missing plugin config crashed homebridge
- Minor UI bugfixes

# v4.2.0 - 2021-05-05

## Notable changes
- Config UI X:
  - [Plugin UI Utils](https://github.com/homebridge/plugin-ui-utils) was integrated into **camera.ui**! Via the plugin settings _(Config UI X > Plugins > homebridge-camera-ui > Settings)_ it is now possible to see the livestream of any camera entered in config.json within Config UI X.

# v4.1.2 - 2021-05-05

## Other changes
- Server/Interface
  - Instead of a JSON payload only the buffer of the stream is sent to increase the performance of socket.io

## Bugfixes
- Minor UI bugfixes

# v4.1.1 - 2021-05-05

## Other changes
- Interface:
  - Added three new theme colors: `blue-gray`, `brown` and `purple`
  - Added a `confirm` modal to `remove all` button (notifications/recordings)
  - Moved `back` and `signout` button to bottom actionsheet (camview)

## Bugfixes
- Minor UI bugfixes

# v4.1.0 - 2021-05-04

## Notable changes
- **Livestreams**: Livestreams has been completely redesigned and fully integrated into the interface. There are NO more "**socketPorts**" necessary in config.json. Instead of opening a separate websocket server, the streams are bound to the interface's own server/socket.io where the streams all run over the same port but have their own "room" (e.g. `.../socket.io/stream/My Camera`). This change allows more control of the streams and are significantly more resource efficient.
  - **Developers' note**: Removing the socket ports and integrating the camera streams into the interface own server/socket.io has the reason that in the future camera.ui should also run with other homebridge plugins like "homebridge-camera-ffmpeg".

## Other changes
- Interface:
  - It is now possible to reload the stream on Dashboard/Camview if the stream could not be started due to an ffmpeg error etc. 
  - Changed icon from "change favourite camera" button (dashboard/camview)
  - Added animation to "change favourite camera" button
  - Changed theme color from `yellow` to `orange`
  - Minor UI improvements

## Bugfixes
- Fixed an issue where streams doesnt stop after changing stream settings
- Fixed an issue where the placeholder/fallback images not changed the color according to the current theme
- Fixed an issue where the snapshot timer displayed an incorrect value and therefore refreshed the image earlier than SHOULD have happened
- Fixed an issue where the console displayed a message that a new movement was detected even though the camera was still processing the "old" movement.
- Minor bugfixes

# v4.0.7 - 2021-05-03

## Other changes
- Server:
  - Added additional query parameter (`?stopStream`) to cameras settings, which allows to stop streams after changing camera stream settings
- Interface:
  - Added new possibility to toggle cameras (favourites) from dashboard
  - Added new possibility to toggle cameras (favourites) from camview
  - Changed video card height for screens >= 1200px (again)
  - Minor improvements

## Bugfixes
- Fixed an issue where triggering the doorbell crashed homebridge
- Fixed an issue where an error (404) was shown if no profile picture was setted up
- Minor UI bugfixes

# v4.0.6 - 2021-05-01

## Other changes
- Server:
  - Added new endpoint to API (`/version` )

## Bugfixes
- Fixed an issue where injected `-stimeout` to `stillImageSource` breaks snapshot request from HomeKit
- Fixed an issue where `video card` on "cameras" page had different animation on first load
- Fixed an issue where `video card` does not show an fallback image when buffer is empty
- Minor bugfixes

# v4.0.5 - 2021-04-30

## Notable Changes
- Added `atHomeSwitch` option to config to allow turning on/off **at home** for the interface settings within HomeKit (see [Example Config](https://github.com/SeydX/homebridge-camera-ui/blob/master/misc/example-config.json) for more info)
- Added `excludeSwitch` option to camera config to allow exclude/include camera for the interface settings within HomeKit (see [Example Config](https://github.com/SeydX/homebridge-camera-ui/blob/master/misc/example-config.json) for more info)

## Other changes
- Interface:
  - Added `localStorage` to **Backup & Restore** to restore also the localStorage (_dashboard layout, camview layout, darkmode, theme color_)

## Bugfixes
- Fixed an issue where buttons on the profile page displayed wrong color
- Fixed an issue where ffmpeg could not save the snapshot (back to camera source)
- Some minor bug fixes in the plugin

# v4.0.4 - 2021-04-30

## Other changes
- Interface:
  - Changed notification ringtone to `.mp3`
  - Improvements to auto update service worker
- Added `-stimeout` to camera videoSource/stillImageSource if not defined
- Changed webpack settings to reduce chunk size
- Bumped dependencies

## Bugfixes
- Fixed an issue where ffmpeg took always camera `source` for snapshots instead of `stillImageSource`
- Fixed an issue where the wrong package version was shown on login screen
- Fixed an issue where the profile image was not displayed correctly

# v4.0.3 - 2021-04-29

## Notable Changes
- Interface:
  - **Auth**: Added a new ability to access API with credentials in the query (eg _`?username=master&password=master`_)

## Other changes
- Interface:
  - Auto update service worker if update available

## Bugfixes
- Fixed an issue with initializing homebridge plugin platform
- Fixed an issue with invalidating token after logout
- Fixed an issue with changing session timer in the settings
- Fixed an issue with pinging camera if camera source is not given/malformed

# v4.0.2 - 2021-04-27

## Other Changes
- **Interface:**
  - Changed video card height for screens >= 1200px

## Bugfixes
- Fixed an issue where ffmpeg could not store Videos as .mp4 in recordings folder
- Fixed an issue where the cleartimer not worked properly for notifications

# v4.0.1 - 2021-04-27

## Breaking Changes
- **Database**: Database was completely rewritten to work better with the Rest API. All who used v3.X before have to delete their database (config.ui.db.json) to use v4.X
- **Recordings**: Due to the changes in the backend, the recordings must also be deleted so that camera.ui v4 can re-analyze them to make them visible in the interface.

## Notable Changes
- Added REST API (Documentation available at ``/swagger``)
- Preparations made so that the interface can also run without Homebridge
- "Backup & Restore" function is now included. You can easily download/restore the database AND the images
- HTTP/MQTT server for motion detection was separated and works independently from the plugin

## Other Changes
- The code has been refactored
- Other bug fixes
- Dependencies were updated
- Interface:
  - Interface has been rewritten with ``VUE`` for an even better user experience.
  - Dashboard now has a "drag & drop" function.
  - Cameras, Recordings, Notifications: The filter function has been rewritten and is now directly controlled via the API.
  - Some settings that were accessible via config.json are now available via UI and not via config.json.
  - User "access authorization" has been completely rewritten. The "master" can create users and give/remove access permission for anything.
  - Contingent option has been added for image recognition in order to better control the number of image analyses.
- Server
  - Server was completely rewritten and new REST API endpoints were added.
  - Security has been increased.
  - New tests were added.

# v3.3.0 - 2021-03-21
- **NEW:** Image Rekognition
  - Added Image Rekognition with Amazon Web Services to analyse, detect, remember and recognize objects, scenes, and faces in images. You can enable for each camera the image rekogniton and you can even set labels for each cam. For each object, scene, and concept the API returns one or more labels. Each label provides the object name. For example, suppose the input image has a lighthouse, the sea, and a rock. The response includes all three labels, one for each object.
- **NEW:** Telegram Notification
  - Now it is possible that the image is sent immediately via Telegram without saving the image/video before. (Recording must be active under setting and Telegram must be set to 'Snapshot' for the camera).
- **NEW:** Filter Function
  - Discover the completely redesigned filter function of camera.ui. It is now possible to filter by camera, room, type and even time.
- **NEW:** Endpoints
  - Added "exclude" as a new endpoint to trigger via webhook
  - Added "getSettings" as a new endpoint to get current ui settings
- Refactored config.schema.json
- Refactored MQTT/HTTP and automation handler
- Added TLS option to MQTT
- Added timeout to ffmpeg streams
- Added notification payload to webhook
- Fixed incorrect ffmpeg stream sessions
- Fixed motion handling
- UI design improvements
- General improvements & bugfixes
- Added more debug
- Bump deps

# v3.2.3 - 2021-03-15
- Added "-stimeout" 10s to stream if not defined to avoid hanging ffmpeg processes
- Fixed UI Debug

# v3.2.2 - 2021-03-15
- Fixed a bug where unbridged cameras was not available for the UI
- UI camera ping improvements

# v3.2.1 - 2021-03-14
- Bugfixes & Improvements with HB 1.3
- Bump dependencies

# v3.2.0 - 2020-02-24
- Added new language: Dutch
- Updated dependencies

# v3.1.5 - 2020-12-01
- Added ping support for local cameras

# v3.1.4 - 2020-11-09
- Rearranged webhook handler

# v3.1.3 - 2020-10-28
- Fixed a bug where clearTimer (recordings) crashed homebridge
- Better Debug

# v3.1.2 - 2020-10-24
- New function to handle ffmpeg processes
- It is now possible to change theme directly from config-ui
- Bugfixes
- Better Debug
- Refactored Logger
- Bump dependencies

# v3.1.1 - 2020-10-21
- Interface Stream: Revert back to -threads 1
- Fix not appearing motion switches
- Fix not appearing doorbell switches
- Bugfix: Remove Motion Characteristic from doorbell
- Bugfix: Doorbell Timeout

# v3.1.0 - 2020-10-21
- Added a new logging function
- Refactored recording/notification handler
- Bugfix: Avoid multiple recording processes at same time on same camera

# v3.0.9 - 2020-10-20
- Rearranged /change view
- Fixed a bug where the /change path could not be found
- Fixed a bug where the port was false if host doesnt include '@' char
- Added ffmpeg-for-homebridge as dependency 

# v3.0.8 - 2020-10-19
- Added min fps of 20, otherwise the decoder will show a black livestream
- more debug if stream failed
- Fix admin username validation
- Fixed a bug where breadcrumb title not updated properly
- Added translation to selectpicker
- Added new params to avoid ffmpeg hang on a process
  
# v3.0.7 - 2020-10-19
- Added new translation
- Added validation to "change admin username"
- Added validation to "adding new user (username)"
- Recordings: "Remove all" will now remove the recordings from choosen room (filter)
- Notifications: "Remove all" will now remove the notifications from choosen room (filter)
- Changes Spdy (http/2) to https (http/1) because of callback error
- Rearranged ui/handler init to avoid incoming mqtt/http message before ui finished initialisation
- Fixed a bug where "offline" toast message appeared also for hidden cameras
- Fixed a bug that caused the video processor entered in config.json not to be passed to videoStream
- Fixed a bug that caused that if only one camera is entered in config.json, the camera page was not visible

# v3.0.6 - 2020-10-18
- Fixed a bug that caused Homebridge to crash when no "options" is given in config.json

# v3.0.5 - 2020-10-18
- Added new function that allows to see missed notifications after login
- Fixed Translation & added new translation
- Fixed an error with ServiceWorker for Firefox
- Prevent creating a user with same name as admin (Master)
- Fixed a bug with Webhook that caused the "Trigger" and "False" commands to be triggered incorrectly
- UI Improvements

# v3.0.4 - 2020-10-17
- Added more translation
- Fixed a bug that caused the preloader not to be hidden on an "Error" page
- Fixed a bug where camera pages containing a spaces were not displayed

# v3.0.3 - 2020-10-17
- "Reset" will now automatically set itself to "false" in config.json after resetting master credentials
- After opening the app or visiting the main page ("/") the last opened page is now opened if the user is logged in (fixed)
- 404 will now work properly
- More debug
- Bugfixes
- UI improvements

# v3.0.2 - 2020-10-16
- Fix unauthorized error
- Fix UI if auth = none
- UI Improvements if camera socketPort/source is not setted up

# v3.0.1 - 2020-10-15
- fix npm postinstall
  
# v3.0.0 - 2020-10-15
- Completely redesigned and refactored UI
- Multi-language support
- Full functional webapp
- WebApp Push notifications
- Supports multiple accounts/roles
- Drag and Drop and Resizable Cams (CamViews)
- Almost everything is adjustable
- Webhook support
- Telegram support
- Recordings (Snapshot/Video) Support
- New Cameras Dashboard
- Latest notifications
- Camera-FFmpeg under the hood
- Possiblity to change between livestream and snapshots
- Rooms
- Darkmode
- Themes
- ..and much more!
