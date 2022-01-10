<p align="center">
    <img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/logo.png">
</p>

# homebridge-camera-ui

[![npm](https://img.shields.io/npm/v/homebridge-camera-ui.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-camera-ui)
[![npm](https://img.shields.io/npm/dt/homebridge-camera-ui.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-camera-ui)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-camera-ui.svg?style=flat-square)](https://github.com/SeydX/homebridge-camera-ui)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/kqNCe2D)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)

**homebridge-camera-iu** is allows you to expose cameras from camera.ui to HomeKit via Homebridge.

**camera.ui** is a NVR like PWA to control your RTSP capable cameras with:

- **Live Streams** on Web
- **Camview**: A resizable, drag & drop camera overview
- **Web Application** with almost full PWA support like push notification and more
- **Multi-language**: Easily expandable multi-language support
- **Motion Detection** via video analysis, MQTT, FTP, SMT or HTTP.
- **Image Rekognition** via AWS Rekognition
- **Notifications** via Alexa, Telegram, Webhook and WebPush
- **Snapshot/Video**: Save recording of snapshots/videos locally when motion is detected
- **Prebuffering:** See the seconds before the movement event
- **User Interface**: Beautiful and with love designed interface with 8 different color themes, darkmode and more
- **HSV** Support (HomeKit Secure Video)
- **Config UI X** Support

and much mure...

**Supported Languages:** 

:de: | :gb: | :netherlands:

## Installation

```
sudo npm install -g homebridge-camera-ui@latest
```

## Documentation

- [homebridge-camera-ui](#homebridge-camera-ui)
  - [Installation](#installation)
  - [Documentation](#documentation)
  - [Configuration](#configuration)
  - [Defaults](#defaults)
  - [Example Config (minimal)](#example-config-minimal)
  - [Usage](#usage)
    - [Login](#login)
    - [Dashboard](#dashboard)
    - [Camview](#camview)
    - [Recordings](#recordings)
    - [Notifications](#notifications)
    - [Settings](#settings)
  - [HomeKit Secure Video (HSV)](#homekit-secure-video-hsv)
  - [Image Rekognition](#image-rekognition)
  - [Supported clients](#supported-clients)
    - [What you need for HomeKit Secure Video](#what-you-need-for-homekit-secure-video)
    - [Browser](#browser)
  - [Supported Cameras](#supported-cameras)
  - [FAQ](#faq)
  - [Contributing](#contributing)
  - [Troubleshooting](#troubleshooting)
  - [License](#license)
    - [MIT License](#mit-license)

## Configuration

camera.ui installs itself in the homebridge directory under `/var/lib/homebridge/camera.ui/`

The database, recordings and a copy of the camera.ui config.json are stored locally in this folder and are never accessible to others. The settings can be changed directly via the interface oder ober homebridge-config-ui-x

## Defaults

Once you have installed and configured it you can access the interface via http://localhost:8081.

The default username is ``master`` and the default password is ``master``. When you log in for the first time, camera.ui will ask you to change your username and password.


## Example Config (minimal)


```
{
   ...
    "platforms": [
        {
            "platform": "CameraUI",
            "name": "CameraUI",
            "port": 8081,
            "cameras": [ ... ]
        }
    ]
}

```

For a full config.json, please look at [Example Config](https://github.com/SeydX/homebridge-camera-ui/blob/master/example-config.json) for more details.

## Usage

 ### Login

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/browser/login_white.png" align="center" alt="camera.ui">

 ### Dashboard

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/browser/dashboard_white.png" align="center" alt="camera.ui">

 ### Camview

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/camviews.gif" align="center" alt="camera.ui">

 ### Recordings

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/browser/recordings_white.png" align="center" alt="camera.ui">

 ### Notifications

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/browser/nots_white.png" align="center" alt="camera.ui">

 ### Settings

<img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/browser/settings_white.png" align="center" alt="camera.ui">

## HomeKit Secure Video (HSV)

When the plugin is used with HSV, all recordings from HomeKit Secure Video are automatically transferred to camera.ui as well and stored for them. All camera.ui features like WebPush, Telegram notifications etc. will still work with HSV.

[How to configure cameras for HSV](https://support.apple.com/guide/iphone/configure-cameras-iph7bc5df9d9/ios)

## Image Rekognition

If HomeKit Secure Video (HSV) is disabled, camera.ui also uses image rekognition with Amazon Web Services to analyse, detect, remember and recognize objects, scenes, and faces in images. You can enable for each camera the image rekogniton and you can even set labels for each camera. For each object, scene, and concept the API returns one or more labels. Each label provides the object name. For example, suppose the input image has a lighthouse, the sea, and a rock. The response includes all three labels, one for each object.

This makes it possible to analyze every movement before this is stored or sent as a notification.

To use image rekognition, you need to set up a AWS account with an IAM user. More Infos: [AWS Image Rekognition](https://aws.amazon.com/rekognition/?nc1=h_ls&blog-cards.sort-by=item.additionalFields.createdDate&blog-cards.sort-order=desc)

## Supported clients

This plugin has been verified to work with the following apps/systems:

- iOS > 11
- Android
- Windows 10
- macOS Catalina 10.15
- Apple Home
- All 3rd party apps like Elgato Eve etc
- Homebridge >= v1.1.6
- Node >= 14

### What you need for HomeKit Secure Video

- An iPhone, iPad, or iPod Touch with iOS 13.2 or later.
- The Home app set up on your iPhone, iPad, or iPod touch with the Apple ID that you use with iCloud.
- A home hub set up on an iPad, HomePod, or Apple TV.
- A supported iCloud storage plan

### Browser

The following browsers are supported by this plugin:

- Chrome - latest
- Firefox - latest
- Safari - 2 most recent major versions
- iOS - 2 most recent major versions

_MS Internet Explorer (any version) is not supported!_


## Supported Cameras

Every camera with an RTSP stream! 

See [Tested Cameras](https://sunoo.github.io/homebridge-camera-ffmpeg/configs/) for more info.

## FAQ

Please check our [FAQ](https://github.com/SeydX/homebridge-camera-ui/wiki/FAQ) before you open an issue.

## Contributing

You can contribute to this homebridge plugin in following ways:

- Report issues and help verify fixes as they are checked in.
- Review the source code changes.
- Contribute bug fixes.
- Contribute changes to extend the capabilities
- Pull requests are accepted.

## Troubleshooting
If you have any issues with the plugin then you can run this plugin in debug mode, which will provide some additional information. This might be useful for debugging issues. Just open your config ui and set debug to true!

https://github.com/SeydX/homebridge-camera-ui/wiki/Debug

If you have problems with the interface or found bugs, please post it directly at [camera.ui](https://github.com/seydx/camera.ui)

## License

### MIT License

Copyright (c) 2020-2022 seydx

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
