# Config

Below you can see which parameters are recommend or optional.

 
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

## GUI Config

| **Attributes** | **Required** | **Usage** |
|------------|----------|-------|
| active |  | Activate/Deactivate GUI (default: false) |
| username |  | Username for GUI access (default: admin) |
| password | **X** | Password for GUI access |
| port |  | Port for the GUI to listen (default: 3000) |
| wsport |  | Port for the websocket (default:8100-8900) |

## Notifier Config

| **Attributes** | **Required** | **Usage** |
|------------|----------|-------|
| active | | Activates/Deactivates notifier
| token | **X** | Telegram Bot Token |
| chatID | **X** | Telegram Chat ID |
| motion_start |  | Own message when motion sensor triggers on (if you dont want to get this notification, just remove from config) |
| motion_stop |  | Own message when motion sensor triggers off (if you dont want to get this notification, just remove from config) |
