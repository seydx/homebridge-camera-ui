<p align="center">
    <img src="https://github.com/SeydX/homebridge-camera-ui/blob/master/images/logo_hb.png" width="280">
</p>

# homebridge-camera-ui

[![npm](https://img.shields.io/npm/v/homebridge-camera-ui.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-camera-ui)
[![npm](https://img.shields.io/npm/v/homebridge-camera-ui/beta.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-camera-ui)
[![npm](https://img.shields.io/npm/dt/homebridge-camera-ui.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-camera-ui)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-camera-ui.svg?style=flat-square)](https://github.com/SeydX/homebridge-camera-ui)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/wFQYHSeXRt)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)

**homebridge-camera-ui** allows you to expose cameras from [camera.ui](https://github.com/seydx/camera.ui) to HomeKit via Homebridge. camera.ui does not need to be installed separately. It is installed right away with homebridge-camera-ui

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
- **User Interface**: Beautiful and with love designed interface with 8 different color themes, dark mode and more
- **HSV** Support (HomeKit Secure Video)
- **Config UI X** Support

and much more...

**Supported Languages:** 

:de: | :gb: | :netherlands:

**Demo:** https://streamable.com/3yce42 

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
    - [Dashboard](#dashboard)
    - [Cameras](#cameras)
    - [Camera](#camera)
    - [Recordings](#recordings)
    - [Notifications](#notifications)
    - [Camview](#camview)
    - [Log](#log)
    - [Config](#config)
    - [Utilization](#utilization)
    - [Settings](#settings)
  - [HomeKit Secure Video (HSV)](#homekit-secure-video-hsv)
  - [Motion detection](#motion-detection)
    - [Videoanalysis](#videoanalysis)
    - [HTTP](#http)
    - [MQTT](#mqtt)
    - [SMTP](#smtp)
    - [FTP](#ftp)
  - [Image Rekognition](#image-rekognition)
  - [Notifications](#notifications-1)
  - [Supported clients](#supported-clients)
    - [What you need for HomeKit Secure Video](#what-you-need-for-homekit-secure-video)
    - [Browser](#browser)
  - [Supported Cameras](#supported-cameras)
  - [FAQ](#faq)
  - [Contributing](#contributing)
  - [Troubleshooting](#troubleshooting)
  - [Wiki](#wiki)
  - [License](#license)
    - [MIT License](#mit-license)

## Configuration

camera.ui installs itself in the homebridge directory under `/var/lib/homebridge/camera.ui/`

The database, recordings and a copy of the camera.ui config.json are stored locally in this folder and are never accessible to others. The settings can be changed directly via the interface or over homebridge-config-ui-x

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

### Dashboard

The Dashboard is the main page of the interface and offers a variety of widgets to customize it as you like. The widgets will expand over time. At the moment the following widgets are available for the dashboard:  Time, Weather, Uptime, Camera, Notifications, RSS Feed, Status, Charts (CPU Load, CPU Temperature, Memory Load), Shortcuts and Log

<img src="https://github.com/SeydX/camera.ui/blob/master/images/browser/dashboard.png" align="center" alt="camera.ui">

### Cameras

Here are all cameras listed by room and show the current snapshot as a cover sheet

<img src="https://github.com/SeydX/camera.ui/blob/master/images/browser/cameras.png" align="center" alt="camera.ui">

### Camera

If you select a camera you can watch the livestream directly in the browser. With the camera.ui player you can pause the stream, turn audio on/off or reload the stream.

<img src="https://github.com/SeydX/camera.ui/blob/master/images/browser/camera.png" align="center" alt="camera.ui">

### Recordings

All images or videos recorded by motion are listed here. If AWS Rekognition is used, the label for the recording is also displayed, as well as the date and time. Using the filter function, the recordings can be filtered as desired

<img src="https://github.com/SeydX/camera.ui/blob/master/images/browser/recordings.png" align="center" alt="camera.ui">

### Notifications

All motion events as well as system messages can be viewed here. Each notification has one or more labels to better categorize them. The filter function can also be used to filter the notifications as desired.

<img src="https://github.com/SeydX/camera.ui/blob/master/images/browser/notifications.png" align="center" alt="camera.ui">

### Camview

Camview displays all camera streams in tiles, hiding everything unnecessary. Camview is great for giving a direct insight into the cameras. Also here the streams can be paused by the camera.ui video player, audio can be switched on/off, streams can be reloaded or viewed in full mode.

<img src="https://github.com/SeydX/camera.ui/blob/master/images/browser/camview.png" align="center" alt="camera.ui">

### Log

All events that occur in the backend can be monitored via the built-in log. In addition, the log can be also be cleared or downloaded here.

<img src="https://github.com/SeydX/camera.ui/blob/master/images/browser/console.png" align="center" alt="camera.ui">

### Config

Using the built-in editor you can easily edit your config.json. In addition, any errors are immediately displayed and thus avoided to save a faulty config.json

<img src="https://github.com/SeydX/camera.ui/blob/master/images/browser/config.png" align="center" alt="camera.ui">

### Utilization

"Utilization" shows you a graphical overview of the system utilization.  Here you can see in real time how high the CPU utilization is, how high the CPU temperature is and how much memory is still free.

<img src="https://github.com/SeydX/camera.ui/blob/master/images/browser/utilization.png" align="center" alt="camera.ui">

### Settings

On the settings page you can make ALL settings regarding your config.json and database. All parameters defined in config.json are directly configurable from this page. If camera.ui runs via "Homebridge" you can also set Homebridge relevant parameters here.

<img src="https://github.com/SeydX/camera.ui/blob/master/images/browser/settings.png" align="center" alt="camera.ui">

## HomeKit Secure Video (HSV)

> HSV requires a Homebridge version of at least 1.4.0-beta.4 or higher. Otherwise HSV will not be enabled.

When the plugin is used with HSV, all recordings from HomeKit Secure Video are automatically transferred to camera.ui as well and stored for them. All camera.ui features like WebPush, Telegram notifications etc. will still work with HSV.

[How to configure cameras for HSV](https://support.apple.com/guide/iphone/configure-cameras-iph7bc5df9d9/ios)

## Motion detection

camera.ui offers a variety of options to detect and process motion.

### Videoanalysis

<img src="https://github.com/SeydX/camera.ui/blob/master/images/browser/videoanalysis.png" align="center" alt="camera.ui">

With this option camera.ui connects to the stream and compares frame by frame if there are changes. The zones and sensitivity can be set in the interface.

### HTTP

If the HTTP server is enabled for motion detection, calling the link can easily trigger motion.

Example:

`http://localhost:8123/motion?My+Camera`


### MQTT

If you have set up the MQTT client (Settings > System > MQTT), you can set the required parameters such as "Motion Topic", "Message" etc. via the interface (Settings > Cameras > MQTT).

**Motion Topic**: The MQTT topic to watch for motion alerts. The topic (prefix/suffix) should be unique, it will be used to assign the motion detected message to the desired camera.

**Motion Message**: The message to watch for to trigger motion alerts.

The message can be a simple "string" (e.g. "ON"/"OFF) or a JSON object. If the MQTT message is a JSON object like:

```json
{
  "id": "test",
  "event": {
    "time": 1234567890,
    "state": true,
  }
}
```

Then define the exact parameter under "Motion Message" so that camera.ui can read from it, eg:

```json
"motionMessage": {
  "event": {
    "state": true
  }
}
```

### SMTP

If the SMTP server is turned on and your camera is able to send an email when motion is detected, you can easily trigger motion through it, eg:

`From: My+Camera@camera.ui`
`To: My+Camera@camera.ui`

Please note that the camera.ui SMTP server is set in the camera settings (ip/port).

### FTP

If your camera is able to upload an image when motion is detected, then you can select the camera.ui FTP server as the destination. Very important here is. The path you enter via the camera's own settings page must be the camera name as defined in config.

Every time the camera tries to connect to the server, the camera.ui detects and takes the entered path to determine the camera.


## Image Rekognition

If HomeKit Secure Video (HSV) is disabled, camera.ui also uses image rekognition with Amazon Web Services to analyse, detect, remember and recognize objects, scenes, and faces in images. You can enable for each camera the image rekogniton and you can even set labels for each camera. For each object, scene, and concept the API returns one or more labels. Each label provides the object name. For example, suppose the input image has a lighthouse, the sea, and a rock. The response includes all three labels, one for each object.

This makes it possible to analyze every movement before this is stored or sent as a notification.

To use image rekognition, you need to set up a AWS account with an IAM user. More Infos: [AWS Image Rekognition](https://aws.amazon.com/rekognition/?nc1=h_ls&blog-cards.sort-by=item.additionalFields.createdDate&blog-cards.sort-order=desc)

## Notifications

camera.ui supports numerous notification options. Each of them can be conveniently set via the interface.

Since push notifications only work conditionally for websites (see PWA), you can easily work around this via third-party providers.

These would be e.g.

- Telegram
- Webhook
- Alexa
- Third party providers that support Alexa

Via Telegram, you even have the option to send picture or video along with text messages.

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

## Wiki
Before you open a new issue, please read carefully the wiki: https://github.com/seydx/homebridge-camera-ui/wiki

## License

### MIT License

Copyright (c) 2020-2022 seydx

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
