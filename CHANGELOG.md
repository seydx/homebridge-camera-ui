# Changelog

# NEXT

## Bugfixes
- Fixed an issue where injected `-stimeout` to `stillImageSource` breaks snapshot request from HomeKit 

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
