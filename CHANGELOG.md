# Changelog
All notable changes to this project will be documented in this file.

# v5.0.23 - 2022-04-23

## Other Changes
- **MQTT:** When motion is detected, two MQTT messages are now published on following topics:
  1. **camera.ui/notifications**: Contains all notifications AFTER motion has been detected AND recorded.
  2. **camera.ui/motion** _(can be changed in the interface):_ Contains motion event (before something is recorded).
- Deprecated FFmpeg arguments will be auto replaced now (camera.ui)
- Minor improvements to probe stream (camera.ui)

## Bugfixes
- Fixed an issue where the recording process (HSV) was not terminated by the forceCloseTimer when motionTimeout was disabled
- Fixed an issue where changing camera settings via the interface did not work (camera.ui)

# v5.0.22 - 2022-04-23

## Other Changes
- Improved probe stream (camera.ui)
- Improved HKSV recordings process
- Minor improvements
- Bump dependencies

## Bugfixes
- Fixed an issue where recording information such as motion label was not correctly saved in the image data (camera.ui)
- Fixed an issue where prebuffering and/or video analysis was started for disabled cameras anyway
- Fixed an issue where disabling a camera in config.json also removed it from config.json
- Minor bugfixes

# v5.0.21 - 2022-04-23

## Notable Changes
- **Interface:**
  - **Recordings:** The recordings section has been redesigned and now includes another list mode to view the recordings. The filter function has been redesigned.
  - **Camera:** Added a new endpoint for direct streaming (`/cameras/:name/feed`)
  - **Cameras:** The cameras section has been redesigned and now includes another list mode to view the cameras.
  - **Notifications:** The filter function has been redesigned.
  - **Console:** Added a new filter function
  - **System:** Improved loading time (`npm`)
- **Config:** 
  - Top level `"debug"` in config.json is deprecated now. Replaced with `"logLevel"`. Log Level: Show only defined log level. _(Info = Show informative messages during processing. This is in addition to warnings and errors - Debug: Show everything, including debugging information - Warning: Show only warnings and errors - Error: Show only errors)_
  - Added `"hksvConfig"` to the camera block next to `"videoConfig"`. Here various parameters are defined for the HKSV recording process only, such as a different source, vcodec, acodec, etc.
  - Added `"disable"` parameter to the camera block. The parameter disables the camera and removes it from HomeKit.
- **MQTT:** When motion is detected, the messages are now also published via MQTT to the topic configured under `Settings > Cameras > Notifications > MQTT Publish Topic`

## Other Changes
- Minor UI improvements
- Minor logger improvements
- Bump dependencies
- Downgrade `ffmpeg-for-homebridge`

## Bugfixes
- Minor bugfixes

# v5.0.20 - 2022-04-17

## Other Changes
- Enabled Web Assembly for better streaming performance within web browser (camera.ui)
- Minor UI improvements (camera.ui)
- Changed to `@seydx/jsmpeg` (camera.ui)
- Bump dependencies

## Bugfixes
- Fixed an issue where 2-way audio did not work

# v5.0.19 - 2022-04-16

## Bugfixes
- Fixed an issue with ffmpeg logging that caused HomeKit Stream to stop responding and display a warning
- Fixed minor issues with FFmpeg v5

# v5.0.18 - 2022-04-16

## Other Changes
- Minor recording improvements

## Bugfixes
- Fixed an issue where the notification in the interface referred to a saved recording even though recordings were disabled (camera.ui)
- Fixed an issue where the recorded video could not be sent via Telegram (camera.ui)
- Fix ffmpeg command `-stimeout`
- Minor bugfixes

# v5.0.17 - 2022-04-15

## Other Changes
- i18n: Thai (th) language added by [@tomzt](https://github.com/tomzt) (camera.ui)
- i18n: French (fr) language added by [@NebzHB](https://github.com/NebzHB) (camera.ui)
- i18n: Spanish (es) language added by [@mastefordev](https://github.com/masterfordev) (camera.ui)
- Improved videoanalysis (camera.ui)
- Minor UI improvements (camera.ui)
- Bump dependencies

## Bugfixes
- Fixed an issue where pinging camera sources with `non-break spaces` failed (camera.ui)
- Fixed an issue where Doorbell Topic and Message were not displayed in the interface (camera.ui)
- Fixed an issue where changing `recordOnMovement` in the ui settings was resetted after restart (camera.ui)
- Fixed an issue where notifications were saved to the database even if the notifications were disabled in the settings (camera.ui)
- Fixed an issue where Telegram sometimes could not send videos (camera.ui)
- Fixed an issue where the privacy image was still displayed even when privacy mode was disabled
- Minor bugfixes

# v5.0.16 - 2022-01-25

## Bugfixes
- Fixed an issue where the interface was not accessible because the browser language could not be determined (camera.ui)

# v5.0.15 - 2022-01-25

## Other Changes
- Improved debug/error logging for recording (camera.ui)
- Minor ui improvements (camera.ui)

## Bugfixes
- Fixed an issue where "motion timeout" was not reset when recording was cancelled by HSV
- Fixed an issue where the custom interface (homebridge-config-ui-x) could not be opened.
- Minor bugfixes

# v5.0.14 - 2022-01-24

## Other Changes
- Improved adding of cameras within the interface (camera.ui)
- Added a new "Reports" page (atm its only placeholder) (camera.ui)
- Redesigned the "save" button in camera settings page (camera.ui)
- Reduced system payload (camera.ui)
- Added more translations (camera.ui)

## Bugfixes
- Fixed an issue where filtering of recordings and/or notifications did not work if end date was before start date (camera.ui)
- Fixed an issue where it was possible to add multiple cameras with the same name through the interface (camera.ui)
- Fixed an issue where a maximum of only 6 cameras could be displayed on Dashboard and Camview (camera.ui)
- Fixed an issue where the config generator failed (camera.ui)
- Minor bugfixes

# v5.0.13 - 2022-01-23

## Other Changes
- Refactored recordings/notifications filter (camera.ui)
- Refactored config generator (camera.ui)

## Bugfixes
- Fixed an issue where camera names were displayed incorrectly in recordings (camera.ui)
- Fixed an issue where the recordings/notifications could not be filtered properly (camera.ui)
- Fixed an issue where config.json was not created in standalone mode (camera.ui)
- Fixed an issue where deleting the camera via the interface caused errors (camera.ui)
- Fixed an issue where the `prebufferLength` of the camera in config.json was multiplied by 1000
- Fixed an issue where the doorbell/motion switch was exposed to HomeKit even if motion/doorbell was not turned on
- Minor bugfixes

# v5.0.12 - 2022-01-22

## Bugfixes
- Fixed issues with logging
- Minor bugfixes

# v5.0.11 - 2022-01-22

## Other Changes
- Refactored logging into file (camera.ui)
- Minor improvements

## Bugfixes
- Fixed an issue where the reason for stopping the recording process was always `undefined`.
- Fixed an issue where the absence of stillImageSource/subSource in config.json could cause the Homebridge to crash
- Fixed an issue where the log entries were not displayed in color (homebridge-config-ui-x)
- Minor bugfixes

# v5.0.10 - 2022-01-21

## Breaking Changes
- homebridge-camera-ui / camera.ui has been refactored and is now a ESM package.
  - **ATTENTION**: Windows users MUST update Homebridge to the current v1.4.0, otherwise you cannot use homebridge-camera-ui as it is NOT compatible with Homebridge < v1.4.0 (windows)

## Notable Changes
- homebridge-config-ui-x (config.schema.json)
  - `"unbridge"` is now set to `true` by default in config.schema.json ! If no `false` is entered in config for `"unbridge"`, then homebridge-config-ui-x will change it to `true` and on the next restart of Homebridge your **bridged** camera will be passed to Homebridge as **unbridged** (which is also recommended)!
- The database has been completely updated and will not be read/written again when the data is changed. Instead, any changes are cached and saved when logging out/restarting/closing camera.ui (camera.ui)

## Other Changes
- Database: Changed to `@seydx/lowdb` (camera.ui)
- Videoanalysis: It is now possible to set the internal "forceClose" timer for video analysis via the interface (camera.ui)
- Videoanalysis: A "reset" button has been added (interface) to reset the values for video analytics to default values (camera.ui)
- SMTP: The SMTP server can now also search the content of an email if no camera could be assigned to the email addresse(s) (camera.ui)
- HSV: The warning that a recording was canceled by HSV now contains a more understandable reason
- More translations (camera.ui)
- Minor UI improvements (camera.ui)
- Bump dependencies

## Bugfixes
- Fixed an issue where triggering the doorbell conflicted with the motion sensor when `motionDoorbell` was enabled
- Fixed an issue where the "exclude switch" also activated the "privacy switch".
- Fixed an issue where it sometimes happened that the recording process (hsv) was not closed.
- Fixed an issue where camera.ui took the user path instead of the homebridge storage path
- Fixed an issue where some values were set by default for config.json (homebridge-config-ui-x)
- Fixed an issue where recordings displayed an invalid date (camera.ui)
- Fixed an issue where mapping mqtt messages failed (camera.ui)
- Fixed an issue where references were obtained instead of (copied) values when reading from the database (camera.ui)
- Fixed an issue where the "videoanalysis" image was not displayed (camera.ui)
- Fixed a bug where a removed camera widget (when Snapshot was set) tried to refresh the image in the background even though the widget no longer existed. (camera.ui)
- Fixed an issue where notification cleartimer not resetted if notification was removed (camera.ui)
- When writing or reading from the database, unnecessary actions to the database are prevented (Windows: `EMFILE`) (camera.ui)
- Pinned `"mqtt"` to v4.2.8 to fix `RangeError: Maximum call stack size exceeded` (camera.ui)
- Minor bugfixes

# v5.0.9 - 2022-01-17

## Other Changes
- Videoanalysis: Improved log output (debug level) (camera.ui)
- Videoanalysis: Dwell time is now configurable within interface (minimum 15s) (camera.ui)
- SMTP: It is now possible to modify the email adress for a camera (Settings > Cameras > Camera > Alarm > SMTP) (camera.ui)
- Added `"smtp.email"` to config.schema.json in `cameras` block
  - The email address (without everything after @) to be assigned to this camera (e.g. "my test camera". If not defined, the camera name will be used)
- Improved config.schema.json (@grzegorz914)
- Telegram: Switched to `node-telegram-bot-api` (camera.ui)
- Minor UI improvements (camera.ui)

## Bugfixes
- Fixed an issue that sometimes prevented the interface from loading (camera.ui)
- Fixed an issue where the profile picture did not update immediately after uploaded a new one (camera.ui)
- Fixed translation issues on `/start` page (camera.ui)
- Fixed an issue where the MQTT messages could not be mapped correctly (camera.ui)
- Minor bugfixes

## Supporter
A big THANK YOU goes to everyone who supports this project. I could fix so many bugs and make it even better for everyone. Also thank you very much for your donations, more features will come in the future once v5.0 is stable enough for everyone. Thank you very much ❤️

# v5.0.8 - 2022-01-16

## Other changes
- Videoanalysis: Using a default zone if none was created (camera.ui)
- Videoanalysis: Increases default sensitivity (camera.ui)
- Telegram: Stop Telegram bot after message is send (camera.ui)
- Added default values to config.schema.json
- Added `"useInterfaceTimer"` to config.schema.json
  - If enabled, the recording timer from camera.ui will be used for `"motionTimeout"`.
- Bump dependencies

## Bugfixes
- Fixed an issue where it was not possible to set the value for "motionTimeout" below 15s via homebridge-config-ui-x
- Fixed an issue where the max motion detection timer did not reset itself when the motion sensor was turned off.
- Minor bugfixes

# v5.0.7 - 2022-01-15

## Other Changes
- Videoanalysis: Reduced the dwell time from 90s to 60s (camera.ui)
- Videoanalysis: Removed `-hwaccel` from FFMPEG parameters (camera.ui)
- Videoanalysis: Added `pixel/color difference` slider to be able to adjust the video analysis even more precisely within ui (camera.ui)
- Prebuffering: Added `-preset:v ultrafast` if `forcePrebuffering` is enabled (camera.ui)
- Added the possibility to control the motion sensor (OFF state) via the camera instead of via motionTimeout (set `"motionTimeout": 0`, the camera must be able to send a `OFF` message e.g. via MQTT or Videoanalysis)
- Removed motionTimeout for DOORBELLs
- More translation added (camera.ui)
- Config.schema.json improvements
- Minor improvements (camera.ui)

## Bugfixes
- Fixed an isue where crashing FFmpeg did not display an error message in the log (camera.ui)
- Fixed an issue where the dwell time could start before the motion handler was initialized (camera.ui)
- Fixed an issue where the restart timer for prebuffering and videoanalysis were calculated wrong (camera.ui)
- Fixed an issue where removing the camera through interface crashed the process
- Fixed an issue where the interface link was not displayed in homebridge-config-ui-x if no port was set in config.json
- Minor Bugfixes

# v5.0.6 - 2022-01-14

## Other Changes
- Videoanalysis: Reduced dwell time from 120s to 90s (camera.ui)
- Videoanalysis: Minor improvements (camera.ui)
- Refactored log output for better understanding of the flow of events
- Refactored config.schema.json (@grzegorz914)

## Bugfixes
- Fixed an issue where prebuffering/videoanalysis didnt work on cameras with mapped video/audio stream (camera.ui)
- Minor bugfixes

# v5.0.5 - 2022-01-13

## Other Changes
- Reduced default videoanalysis sensitivity to 25 (camera.ui)
- Removed session control (camera.ui)
- Videoanalysis improvements (camera.ui)
- Refactored web stream (camera.ui)
- Improved camera pinging
- Moved ENOENT messages to debug (eg. if recording not found) (camera.ui)
- Minor UI improvements (camera.ui)

## Bugfixes
- Fixed an issue where resetting motion via MQTT didnt work (camera.ui)
- Fixed an issue where the video analysis sensitivity does not work as desired (camera.ui)
- Fixed an issue where camera source were taken instead of stillImageSource during fetching snapshot
- Fixed an issue where mapping video/audio stream didnt work (ffmpeg)
- Fixed an issue where starting the recording (HSV) with the doorbell ended immediately
- Minor bugfixes

# v5.0.4 - 2022-01-11

## Other Changes
- Interface:
  - Limit max page size to 6 (camera.ui)
  - Refactored Lightbox (camera.ui)
- Homebridge UI (Config UI X)
  - Added link to camera.ui interface
- Bump dependencies

## Bugfixes
- Fixed an issue with pagination middleware, where the nextPage and prevPage attribute showed wrong path (camera.ui)
- Fixed an isue where opening a recording or a notification (with recording) loaded all recordings in the background and caused the interface to crash (camera.ui)
- Fixed an issue where the notification banner could not display a video (camera.ui)
- Fixed an issue where utilization could not show process cpu load / memory usage (camera.ui)
- Minor bugfixes

# v5.0.3 - 2022-01-11

## Bugfixes
- Fixed an issue where the sensitivity for video analysis was not applied (camera.ui)
- Fixed an issue where building the ui failed if no test config.json found (camera.ui)

# v5.0.2 - 2022-01-11

## Bugfix
- Fixed an issue where the videoanalysis zones were not taken over (camera.ui)
- Fixed an issue where the sensitivity for videoanalysis was reset after each reboot (camera.ui)

# v5.0.1 - 2022-01-10

## Bugfix
- Fixed an issue where the status widget and the system page could not be displayed due to incorrect version checking (camera.ui)

# v5.0.0 - 2022-01-10

Thank you for using camera.ui and to all who support this project! This version includes a huge restructuring of camera.ui including a completely redesigned user interface

[**camera.ui**](https://github.com/SeydX/camera.ui) is now available as a standalone project. It has been completely decoupled from Homebridge and can also be used as a standalone app.

**homebridge-camera-ui** is the connection between camera.ui and homebridge and should give users a beautiful interface and HomeKit support.

---

<p align="center">
If you like <a href="https://github.com/SeydX/homebridge-camera-ui" target="_blank" ><b>hombebride-camera-ui</b></a> please consider starring the project on GitHub or <a href="https://www.paypal.com/seydx" target="_blank" ><b>donating via PayPal</b></a>.
</p>

---

## Breaking Changes
- **Database**
  - Due to the extensive restructuring of **camera.ui** and the new design, the old database is no longer compatible and will be recreated after updating and rebooting. Thereby already set configuration will be lost, and must be reconfigured after the first start!

## Notable Changes
- **Design**
  - The design of camera.ui has been redesigned from scratch and offers many new features for users. In addition to a dashboard with widgets, the settings page have also been completely overhauled. It is now also possible to add new cameras directly via the interface without having to restart Homebridge. Also most of the settings regarding Homebridge can be done via the interface without restarting Homebridge.
- **HomeKit Secure Video (HSV)**
  - Added HSV support for homebridge: HSV requires a home hub and iCloud plan with at least 200GB of storage.
  - Added HSV support for camera.ui: camera.ui can edit the recordings of HomeKit created by HSV. Thus, it is no longer possible to start a new recording when a movement is detected. All camera.ui functions are also available for recordings made by HSV.
- **Prebuffering**
  - Regardless of whether HSV is enabled or not, this option allows you to go back in time during recording up to 4 seconds to see the event BEFORE the movement. When HSV is enabled, the duration of the recording is completely determined by Apple Home.
- **Videoanalysis**
  - Motion detection system through camera.ui. Finally you can include cameras that can not detect motion, or simply was not compatible with camera.ui. The system is very resource efficient, accurate and very fast. You can also configure zones and adjust the sensivity within camera.ui interface
- **Notifications**
  - **Alexa:** It is now possible to send a motion notification with directly to Alexa. Thus, when motion is detected, a message with your own text message is sent to Alexa and Alexa plays that text back for you. Also, the speaker statement time can be set to not be disturbed at night. Adjustable in the interface settings.
  - The notifications have been completely reworked, now also system internal errors/warnings are displayed in the notifications page
- **Settings**
  - **System:** A new subpage called "System" has been added to Settings. Via this subpage it is possible to configure, restart or update camera.ui
- **Dashboard**
  - The dashboard has been redesigned from the ground up and now offers the ability to add numerous widgets of your own choosing to make your dashboard unique. Available Widgets:
    - Camera Feed
    - Clock
    - Weather
    - CPU Load, Temperature & Memory Usage
    - Notifications
    - RSS Feed
    - Log
    - Status
    - Uptime
    - Shortcuts
- **Utilization**
  - Added a new page to show the system load (CPU, memory) in graphs
- **Console**
  - Added a new endpoint to view the camera.ui log in realtime over the browser
- **Config**
  - Added a new endpoint to view/change the camera.ui config.json over the browser
- **Privacy Mode**
  - Added a new option to enable privacy mode for the cameras

## Other changes
- **Interface**
  - Improved camera settings
  - Added interface settings to system
  - Trigger motion via UI
  - Added `play`, `pause` and `audio` buttons to stream
  - Added a new `onboard page` for first start
  - Added new `automation` section to interface settings page
  - Added a new page to settings: `"system"`
  - Added 16:9 aspect ratio to `camera` view
  - Added form validation
  - Added 1080p resolution for stream resolution to UI
  - Changed `removeAfter` duration for notifications/recordings (now, it is also possible to stop removing)
  - The quality of the streams was increased (`-q 1`)
  - Removed camera pinging on movement detection to avoid `Image Buffer is empty` errors
  - Added `motionTimeout` also to ui-only events
  - Improved page loading
  - Minor UI Improvements
- **Server**
  - Built-in SMTP server for motion detection
  - Built-in FTP server for motion detection
  - Support JSON Object as MQTT motion/reset messages
  - Added jwt authentication to socket.io to prevent starting stream if not logged in
  - Auto logout is session time out
  - Auto logout if socket disconnected/unauthenticated
  - Auto restart stream on reconnect to socket
  - Limitted notifications size in database (100)
- **Plugin**
  - Improved camera loading time in HomeKit
  - Refactored config.schema.json
  - Added more ffmpeg options to config: `-max_delay`, `-analyzeduration`, `-probesize`, `-reorder_queue_size`, `-acodec`, `-rtsp_transport` and `-re`
- Bump dependencies

## Bugfixes
- Fixed an issue where changing the `removeAfter` timer for notifications/recordings did not restarted the cleartimer
- Fixed an issue where the service worker did not update the user interface correctly
- Fixed an issue where the "Fullscreen" button in CamView were not displayed correctly on non-mobile devices.
- Fixed an issue where downloading a recording with Safari did not allow the user to return to the user interface
- Fixed an issue where the restored socket.io connection (on mobile devices) did not restore the live stream on `Dashboard` and `Camview`.
- Fixed an issue where camera streams that took a longer to start were stopped on homebridge-config-ui-x
- Fixed an issue where sending multiple telegram messages could cause an error
- Fixed an issue where `resetting` the motion detection caused the interface to treat it as normal motion detection
- Fixed an issue where the cache not reloaded automatically after restart
- Fixed an issue where pinging camera source failed
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
