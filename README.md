<p align="center">
    <img src="https://github.com/SeydX/homebridge-yi-camera/blob/master/images/github_logo.png" height="200">
</p>


# Yi!Camera v1

[![npm](https://img.shields.io/npm/v/homebridge-yi-camera.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-yi-camera)
[![npm](https://img.shields.io/npm/dt/homebridge-yi-camera.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-yi-camera)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-yi-camera.svg?style=flat-square)](https://github.com/SeydX/homebridge-yi-camera)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)

**Creating and maintaining Homebridge plugins consume a lot of time and effort, if you would like to share your appreciation, feel free to "Star" or donate.**

<img src="https://github.com/SeydX/homebridge-yi-camera/blob/master/images/hbyicamera.gif" align="right" alt="HomeKit Overview" width="270px" height="541px">

This is a dynamic platform plugin for [Homebridge](https://github.com/nfarina/homebridge) to control your YI Cameras with MQTT (motion), GUI (Access to stream via http), Telegram notification and FakeGato Support. It is designed for the [YI-HACK v4](https://github.com/TheCrypt0/yi-hack-v4) and offers 100% support. Also, most switches that are otherwise only accessible via Web Interfae can be switched via third-party apps, for example Elgato EVE App.

This Plugin creates one accessory with two services. A camera service to access your camera via RTSP and a Motion Sensor service with FakeGato functionality to check the last movement and more. It creates also some custom characteristics to switch camera settings, eg SSH, FTP, Telnet etc within 3rd party apps like Elgato EVE.

You can also set up the notifier to get a Telegram notification with customized messages and markdown capability when motion detected/undetected.

Last but not least, you can activate "GUI" to access the Stream via webbrowser on any device! On iOS devices you have also the possibility to save the website as a web application to your home screen.

## Installation instructions

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

-  ```(sudo) npm i -g homebridge-yi-camera@latest```

You also need a programm to handle the stream. I recommend to use [FFmpeg](https://github.com/FFmpeg/FFmpeg)

See [OS instructions]() for detailed installation instruction regarding to your OS

## Basic configuration

 ```
{
  "bridge": {
    ...
  },
  "accessories": [
    ...
  ],
  "platforms": [
    {
      "platform": "YiCamera",
      "videoProcessor": "ffmpeg",
      "cameras": [
        {
          "name": "Flur",
          "active": true,
          "videoConfig": {
            "source": "-rtsp_transport tcp -re -i rtsp://192.168.178.31/ch0_0.h264",
            "maxWidth": 1920,
            "maxHeight": 1080,
            "maxFPS": 30
          }
        }
      ]
    }
  ]
}
 ```
 See [Example Config](https://github.com/SeydX/homebridge-yi-camera/blob/master/example-config.json) for more detailsand options!

 
 ## Main Config

| **Attributes** | **Required** | **Usage** |
|------------|----------|-------|
| platform | **X** | Must be **YiCamera** |
| debug | | Provides some additional information in the log |
| videoProcessor | | Is the video processor used to manage videos. eg: ffmpeg (by default) or avconv or /a/path/to/another/ffmpeg. Need to use the same parameters than ffmpeg |


 ## Camera Config

| **Attributes** | **Required** | **Usage** |
|------------|----------|-------|
| name | **X** | Unique Camera Name |
| active |  | Activates the camera and exposes to HomeKit (default: false) |
| source | **X** | Source of the stream |
| stillImageSource |  | Source of the latest image (default: source) |
| maxStreams |  | Is the maximum number of streams that will be generated for this camera, default 2 |
| maxWidth |  | Is the maximum width reported to HomeKit, default 1280 |
| maxHeight |  | Is the maximum height reported to HomeKit, default 720 |
| maxFPS |  | Is the maximum frame rate of the stream, default 10 |
| maxBitrate |  | Is the maximum bit rate of the stream in kbit/s, default 300 |
| vcodec |  | If you're running on a RPi with the omx version of ffmpeg installed, you can change to the hardware accelerated video codec with this option, default libx264 |
| audio |  | can be set to true to enable audio streaming from camera. To use audio ffmpeg must be compiled with --enable-libfdk-aac, default false |
| packetSize |  | If audio or video is choppy try a smaller value, set to a multiple of 188, default 1316 |
| vflip |  | Flips the stream vertically, default false |
| hflip |  | Flips the stream horizontally, default false |
| mapvideo |  | Select the stream used for video, default 0:0 |
| mapaudio |  | Select the stream used for audio, default 0:1 |
| videoFilter |  | Allows a custom video filter to be passed to FFmpeg via -vf, defaults to scale=1280:720 |
| additionalCommandline |  | Allows additional of extra command line options to FFmpeg, for example '-loglevel verbose' |

## MQTT Config

| **Attributes** | **Required** | **Usage** |
|------------|----------|-------|
| active |  | Activate/Deactivate MQTT Service (default: false) |
| host | **X** | Address of your MQTT Service |
| port |  | Port of your MQTT Service (default: 1883) |
| username |  | Username for the MQTT Service (If no username setted up, just leave blank) |
| password |  |  Password for the MQTT Service (If no password setted up, just leave blank) |
| recordOnMovement |  | Capture video if movement detected and store to eg /var/homebridge/out.mp4 (default: out.jpg) |
| recordVideoSize |  | Video size in seconds for 'recordOnMovement' |

![HomeKit](images/homebridge-yi-cam-homekit.png)

## GUI Config

| **Attributes** | **Required** | **Usage** |
|------------|----------|-------|
| active |  | Activate/Deactivate GUI (default: false) |
| username |  | Username for GUI access (default: admin) |
| password | **X** | Password for GUI access |
| port |  | Port for the GUI to listen (default: 3000) |
| wsport |  | Port for the websocket (default:8100-8900) |

![Login](images/homebridge-yi-cam-login.png)

![Stream](images/homebridge-yi-cam-stream.png)

## Notifier Config

| **Attributes** | **Required** | **Usage** |
|------------|----------|-------|
| active | | Activates/Deactivates notifier
| token | **X** | Telegram Bot Token |
| chatID | **X** | Telegram Chat ID |
| motion_start |  | Own message when motion sensor triggers on (if you dont want to get this notification, just remove from config) |
| motion_stop |  | Own message when motion sensor triggers off (if you dont want to get this notification, just remove from config) |

## GUI Access

After setting up the gui part in config.json, just open ```http://localhost:<port_config.json>``` and you are ready. Credentials are these setted up in config.json as username and password.

## iOS Web Application

- Open Safari. Other browsers, such as Chrome, won’t work for this.
- Navigate to ```http://localhost:<port_config.json>```
- Tap the Share button at the bottom of the page.
- On the bottom row of icons, scroll over until you see Add to Home Screen and tap this.
- On the next screen, choose a name for the link on your home screen. You’ll see the link so you can confirm it, as well as the site’s favicon that becomes its “app” icon.
- Now just tap the new app on your home screen, and it will open the website in its own navigation window, independent of Safari.

## Supported Cameras

- Yi Home 720p (17CN)
- Yi Home 720p (27US)
- Yi Home 720p (47CN)
- Yi Dome 720p (Generic)
- Yi Dome 720p (43US)
- Yi Dome 720p (63US)
- Yi Dome 1080p (Generic)
- Yi Dome 1080p (45US)
- Yi Dome 1080p (65US)
- Yi Home 1080p (version 1)
- Yi Home 1080p	(6FUS, Work in progress)
- Yi Cloud Dome 1080p
- Yi Outdoor

**Note:** Maybe othe cameras than yi will also work with this plugin, but you need at least disable MQTT. Because MQTT is a function especially for the hack!

_(see [Yi-Hack v4 Supported Cameras](https://github.com/TheCrypt0/yi-hack-v4/wiki/Supported-Camera-Models))_

## OS instructions (FFmpeg)

**Mac OS:** 

To install this utility on OS X, just head over to [ffmpeg.org](https://www.ffmpeg.org/download.html#build-mac), download the release relative to your Macs architecture. Then put the application into an accessible directory and run it from command line. Another way is using [HomeBrew](https://www.howtogeek.com/211541/homebrew-for-os-x-easily-installs-desktop-apps-and-terminal-utilities/)

For example

```brew install ffmpeg --with-fdk-aac --with-ffplay --with-libass --with-libvorbis --with-libvpx --with-rtmpdump --with-openh264 --with-tools```

**Windows:** 

To install this utility on Windows, head over to [ffmpeg.org](https://www.ffmpeg.org/download.html#build-windows) and follow the download link, using your architecture. Then place the downloaded software into an accessible directory and run from command line. 

**Linux:** 

To install this utility on Unix, just follow the instructions found at [ffmpeg.org](https://www.ffmpeg.org/download.html#build-linux) 

To check if ffmpeg is installed correctly and see a list of available commands try running the following command in the command line:

```ffmpeg -help```

**Homebridge Docker:** 

Add FFmpeg to packages

```PACKAGES=ffmpeg```

## Supported clients

This plugin has been verified to work with the following apps on iOS 12.2 and iOS 12.3 Beta:

* iOS 12
* Apple Home
* All 3rd party apps like Elgato Eve etc (recommended for custom characteristics)
* Homebridge v0.4.49


## Contributing

- This plugin uses a modified version of the [homebridge-camera-ffmpeg](https://github.com/KhaosT/homebridge-camera-ffmpeg) plugin from [@KhaosT](https://github.com/KhaosT)

- Credits goes also to [@phoboslab](https://github.com/phoboslab) for the wonderful decoder AND [@TheCrypt0](https://github.com/TheCrypt0) for the awesome hack!

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-yi-camera/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-yi-camera/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.


## Troubleshooting

If you have any issues with the plugin then you can run this plugin in debug mode, which will provide some additional information. This might be useful for debugging issues. Just open your config.json and set debug to true!


## Licens

**MIT License**

Copyright (c) 2019 **Seyit Bayraktar**

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
