<p align="center">
    <img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/app/public/images/web/logo_transparent-256.png">
</p>


# camera.ui

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/beta/images/camviews_full_mobile_loss.gif" align="right" alt="camera.ui">

CameraUI is a homebridge user interface to control your cameras. It supports almost everything you need for a camera user interface.

- Livestreams on Web
- Full functional Web App with push notifications
- Multi-language support
- **CamViews**: A resizable, drag & drop camera overview
- Telegram and Webhook Support
- Record Snapshot/Video on movement detection
- Beautiful User Interface with Themes and Darkmode
- Config UI X Support
- and much mure...

**Supported Languages:** DE | EN

## Status

[![npm](https://img.shields.io/npm/v/homebridge-camera-ui.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-camera-ui)
[![npm](https://img.shields.io/npm/dt/homebridge-camera-ui.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-camera-ui)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-camera-ui.svg?style=flat-square)](https://github.com/SeydX/homebridge-camera-ui)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)


**Creating and maintaining Homebridge plugins consume a lot of time and effort, if you would like to share your appreciation, feel free to "Star" or donate.**

[Click here](https://github.com/SeydX) to review more of my plugins.


## Installation Instructions


```
sudo npm install -g --unsafe-perm homebridge-camera-ui@latest
```


Once you have installed and configured the plugin you can access the interface via http://localhost:8181.

The default username is ``admin`` and the default password is ``admin``.


## Example Config


```
{
   ...
    "platforms": [
        {
            "name": "CameraUI",
            "port": 3333,
            "auth": "form",
            "debug": true,
            "reset": false,
            "mqtt": {
                "active": true,
                "host": "192.168.178.123",
                "port": 1883,
                "topic": "homebridge/motion",
                "on_message": "ON"
            },
            "http": {
                "active": false,
                "port": 7777,
                "localhttp": false
            },
            "ssl": {
                "active": false,
                "key": "/path/to/key/server.key",
                "cert": "/path/to/cert/server.crt"
            },
            "options": {
                "videoProcessor": "ffmpeg",
                "interfaceName": "eth0",
                "language": "DE"
            },
            "cameras": [ ... ],
            "platform": "CameraUI"
        }
    ]
}

```

See [Example Config](https://github.com/SeydX/homebridge-camera-ui/edit/master/misc/example-config.json) for more details.

# Livestream

To enable livestream for the User Interface, you need give each camera an own socketPort! See [Example Config](https://github.com/SeydX/homebridge-camera-ui/blob/2b59ce5ae51204c1920c3105c44a92c16ea8bf01/misc/example-config.json#L59) for more details.


# Usage


 ### Login
On first login attempt, the interface will prompt you to change the credentials to continue. The Login screen is adjusted for all available screens.

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/beta/images/browser/login_white.png" align="center" alt="camera.ui">

 ### Dashboard

Shows you your favourite cameras streams or snapshots (adjustable under settings)

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/beta/images/browser/dashboard_white.png" align="center" alt="camera.ui">

 ### CamViews

The main function of this interface. Provide you a unique overview of you favourite cameras (adjustable under settings) with resize, drag & drop support!

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/beta/images/camviews.gif" align="center" alt="camera.ui">

 ### Recordings

Shows you all recorded files under a hood

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/beta/images/browser/recordings_white.png" align="center" alt="camera.ui">

 ### Notifications

The Interface also provides you with a notifications section to not miss any notifications.

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/beta/images/browser/nots_white.png" align="center" alt="camera.ui">

 ### Settings

You can change your credentials, user image, themes and much more under settings!

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/beta/images/browser/settings_white.png" align="center" alt="camera.ui">


# Supported clients

This plugin has been verified to work with the following apps/systems:

- iOS > 11
- Android
- Windows 10
- macOS Catalina 10.15
- Apple Home
- All 3rd party apps like Elgato Eve etc
- Homebridge v1.2.3

### Browser

The following browsers are supported by this plugin:

- Chrome - latest
- Firefox - latest
- Safari - 2 most recent major versions
- iOS - 2 most recent major versions

_MS Internet Explorer (any version) is not supported!_


# Supported Cameras

Every camera with an RTSP stream! 

See [Tested Cameras](https://sunoo.github.io/homebridge-camera-ffmpeg/configs/) for more info.


# FAQ

Please check our [FAQ](https://github.com/SeydX/homebridge-camera-ui/FAQ.md) before you open an issue.


# Contributing

This plugin uses a modified version of the **homebridge-camera-ffmpeg** plugin from [@sunoo](https://github.com/Sunoo/homebridge-camera-ffmpeg)

Credits goes also to [@phoboslab](https://github.com/phoboslab/jsmpeg) for the wonderful decoder!

You can contribute to this homebridge plugin in following ways:

- Report issues and help verify fixes as they are checked in.
- Review the source code changes.
- Contribute bug fixes.
- Contribute changes to extend the capabilities
- Pull requests are accepted.

See [CONTRIBUTING](https://github.com/SeydX/homebridge-camera-ui/CONTRIBUTING.md)


# Troubleshooting
If you have any issues with the plugin then you can run this plugin in debug mode, which will provide some additional information. This might be useful for debugging issues. Just open your config ui and set debug to true!
You can also edit your default file add following for more output

``DEBUG=CameraUI*``


# Licens

### MIT License

Copyright (c) 2020 Seyit Bayraktar

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
