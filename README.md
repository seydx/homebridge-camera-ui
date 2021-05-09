<p align="center">
    <img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/logo.png">
</p>


# camera.ui

[![npm](https://img.shields.io/npm/v/homebridge-camera-ui.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-camera-ui)
[![npm](https://img.shields.io/npm/dt/homebridge-camera-ui.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-camera-ui)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-camera-ui.svg?style=flat-square)](https://github.com/SeydX/homebridge-camera-ui)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/kqNCe2D)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/camviews_full_mobile_loss.gif" align="right" alt="camera.ui">

**camera.ui** is a homebridge user interface to control your cameras. It supports almost everything you need for a camera user interface.

- Livestreams on Web
- Full functional Web App with push notifications and more
- Multi-language support
- **CamViews**: A resizable, drag & drop camera overview
- **Image Rekognition** with AWS
- Telegram and Webhook Support
- Record Snapshot/Video on movement detection
- Beautiful User Interface with Themes and Darkmode
- Config UI X Support
- and much mure...

**Supported Languages:** :de: | :gb: | :netherlands:


## Installation Instructions


```
sudo npm install -g --unsafe-perm homebridge-camera-ui@latest
```


Once you have installed and configured the plugin you can access the interface via http://localhost:8181.

The default username is ``master`` and the default password is ``master``.


## Example Config (minimal)


```
{
   ...
    "platforms": [
        {
            "platform": "CameraUI",
            "name": "CameraUI",
            "port": 8181,
            "cameras": [ ... ]
        }
    ]
}

```

For a full config.json, please look at [Example Config](https://github.com/SeydX/homebridge-camera-ui/blob/master/misc/example-config.json) for more details.

# Image Rekognition

camera.ui uses image rekognition with Amazon Web Services to analyse, detect, remember and recognize objects, scenes, and faces in images. You can enable for each camera the image rekogniton and you can even set labels for each camera. For each object, scene, and concept the API returns one or more labels. Each label provides the object name. For example, suppose the input image has a lighthouse, the sea, and a rock. The response includes all three labels, one for each object.

This makes it possible to analyze every movement before this is stored or sent as a notification.

To use image rekognition, you need to set up a AWS account with an IAM user. More Infos: [AWS Image Rekognition](https://aws.amazon.com/rekognition/?nc1=h_ls&blog-cards.sort-by=item.additionalFields.createdDate&blog-cards.sort-order=desc)


# Usage

 ### Login
On first login attempt, the interface will prompt you to change the credentials to continue. The Login screen is adjusted for all available screens.

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/browser/login_white.png" align="center" alt="camera.ui">

 ### Dashboard

Shows you your favourite cameras streams or snapshots (adjustable under settings)

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/browser/dashboard_white.png" align="center" alt="camera.ui">

 ### CamViews

The main function of this interface. Provide you a unique overview of you favourite cameras (adjustable under settings) with resize, drag & drop support!

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/camviews.gif" align="center" alt="camera.ui">

 ### Recordings

Shows you all recorded files under a hood

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/browser/recordings_white.png" align="center" alt="camera.ui">

 ### Notifications

The Interface also provides you with a notifications section to not miss any notifications.

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/browser/nots_white.png" align="center" alt="camera.ui">

 ### Settings

You can change your credentials, user image, themes and much more under settings!

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/browser/settings_white.png" align="center" alt="camera.ui">

# Supported clients

This plugin has been verified to work with the following apps/systems:

- iOS > 11
- Android
- Windows 10
- macOS Catalina 10.15
- Apple Home
- All 3rd party apps like Elgato Eve etc
- Homebridge >= v1.1.6

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

Please check our [FAQ](https://github.com/SeydX/homebridge-camera-ui/wiki/FAQ) before you open an issue.


# Contributing

You can contribute to this homebridge plugin in following ways:

- Report issues and help verify fixes as they are checked in.
- Review the source code changes.
- Contribute bug fixes.
- Contribute changes to extend the capabilities
- Pull requests are accepted.

See [CONTRIBUTING](https://github.com/SeydX/homebridge-camera-ui/blob/master/CONTRIBUTING.md)


# Troubleshooting
If you have any issues with the plugin then you can run this plugin in debug mode, which will provide some additional information. This might be useful for debugging issues. Just open your config ui and set debug to true!


https://github.com/SeydX/homebridge-camera-ui/wiki/Debug


# License

### MIT License

Copyright (c) 2020-2021 SeydX

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
