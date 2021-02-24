# Changelog

## v3.2.0 - 2020-02-24
- Added new language: Dutch
- Updated dependencies

## v3.1.5 - 2020-12-01
- Added ping support for local cameras

## v3.1.4 - 2020-11-09
- Rearranged webhook handler

## v3.1.3 - 2020-10-28
- Fixed a bug where clearTimer (recordings) crashed homebridge
- Better Debug

## v3.1.2 - 2020-10-24
- New function to handle ffmpeg processes
- It is now possible to change theme directly from config-ui
- Bugfixes
- Better Debug
- Refactored Logger
- Bump dependencies

## v3.1.1 - 2020-10-21
- Interface Stream: Revert back to -threads 1
- Fix not appearing motion switches
- Fix not appearing doorbell switches
- Bugfix: Remove Motion Characteristic from doorbell
- Bugfix: Doorbell Timeout

## v3.1.0 - 2020-10-21
- Added a new logging function
- Refactored recording/notification handler
- Bugfix: Avoid multiple recording processes at same time on same camera

## v3.0.9 - 2020-10-20
- Rearranged /change view
- Fixed a bug where the /change path could not be found
- Fixed a bug where the port was false if host doesnt include '@' char
- Added ffmpeg-for-homebridge as dependency 

## v3.0.8 - 2020-10-19
- Added min fps of 20, otherwise the decoder will show a black livestream
- more debug if stream failed
- Fix admin username validation
- Fixed a bug where breadcrumb title not updated properly
- Added translation to selectpicker
- Added new params to avoid ffmpeg hang on a process

## v3.0.7 - 2020-10-19
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

## v3.0.6 - 2020-10-18
- Fixed a bug that caused Homebridge to crash when no "options" is given in config.json

## v3.0.5 - 2020-10-18
- Added new function that allows to see missed notifications after login
- Fixed Translation & added new translation
- Fixed an error with ServiceWorker for Firefox
- Prevent creating a user with same name as admin (Master)
- Fixed a bug with Webhook that caused the "Trigger" and "False" commands to be triggered incorrectly
- UI Improvements

## v3.0.4 - 2020-10-17
- Added more translation
- Fixed a bug that caused the preloader not to be hidden on an "Error" page
- Fixed a bug where camera pages containing a spaces were not displayed

## v3.0.3 - 2020-10-17
- "Reset" will now automatically set itself to "false" in config.json after resetting master credentials
- After opening the app or visiting the main page ("/") the last opened page is now opened if the user is logged in (fixed)
- 404 will now work properly
- More debug
- Bugfixes
- UI improvements

## v3.0.2 - 2020-10-16
- Fix unauthorized error
- Fix UI if auth = none
- UI Improvements if camera socketPort/source is not setted up

## v3.0.1 - 2020-10-15
- fix npm postinstall

## v3.0.0 - 2020-10-15
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
