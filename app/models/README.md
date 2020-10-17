# Models (database)

camera.ui uses "lowdb" in the background to create a database in form of a JSON file. At the start 3 databases are created. Two of them (Memory DB) are only created to use the functions of "lowdb". The latter (configui.db.json) contains all relevant information about the user interface.

The models (database) are divided into categories:

## database.cameras()


- **.getCamera(name)**

Returns the camera mentioned in the function if it is in the database.

- **.getCameras()**

Returns all cameras available in the database.

- **.pingCamera(name)**

Pings the camera mentioned in the function and returns the status

- **.pingCameras()**

Pings all cameras in the database and stores their status in the database


## database.Notifications()

- **.get()**

Returns the setting for notifications

- **.getNots()**

Returns all notifications still available in the database (if not deleted in the UI)

- **.getNotification(id)**

Returns the notification mentioned in the function


- **.getLastFive(camera)**

Returns the last five notifications for the camera mentioned in the function


- **.add(accessory, type, time, rndm)**

Adds a new notification to the database.

accessory: Camera Accessory from Homebridge
type: motion/doorbell
time: Object { time: <formatted time>, timestamp: <timestamp> }
rndm: String for notification name


- **.remove(id)**

Deletes the notification mentioned in the function from the database

- **.removeAll()**

Deletes all notifications from the database (the last notifications for the cameras are unaffected)


## database.Recordings()

- **.get()**

Returns all recordings stored in the folder "recordings

- **.add()**

Adds a new recording to the database.

accessory: Camera Accessory from Homebridge
type: motion/doorbell
time: Object { time: <formatted time>, timestamp: <timestamp> }
rndm: String for notification name

- **.remove(id)**

Deletes the recording mentioned in the function from the database and from the "recordings" folder


- **.removeAll()**

Deletes all recordings from database and "recordings" folder


## database.Settings()

- **.get()**

Returns all settings in the form of an object

- **.getProfile()**

Returns the profile setting as an object

- **.getDashboard()**

Returns the dashboard setting in the form of an object

- **.getCameras()**

Returns the camera setting as an object

- **.getRecordings()**

Returns the capture setting in the form of an object

- **.getNotifications()**

Returns the notifications setting in the form of an object

- **.getTelegram()**

Returns the Telegram setting in form of an object

- **.getWebhook()**

Returns the Webhook setting as an object

- **.getCamviews()**

Returns the CamViews setting as an object

- **.getWebpush()**

Returns the Webpush setting in form of an object

- **.update(profile, users, general, dashboard, cameras, recordings, notifications, telegram, camviews, webpush, webhook)**

Update the category given in the function in the settings


- **.reset()**

Sets the settings to factory defaults


## database.Users()

- **.get()**

Returns all users in the database

- **.getUser(username, role, id)**

Returns the user mentioned in the function. There are three ways to call a user. 

username: User name 
role: user role (user, administrator, master)
id: User ID


- **.add()**

Creates a new user and stores it in the database.

```
{
  id: uuidv4(), 
  username: username,
  password: password,
  role: role,
  photo: photo || '/images/user/anonymous.png',
  changed: 'yes
}
```

- **.change(username, properties, remove, role)**

Changes the properties mentioned in the function for the user specified in the function.

username: username
properties: Object of properties to be added ( ex. { username: "Test", password: "test123" } )
remove: Array of properties to be removed ( e.g. ["password", "role"] )
role: role


- **.remove(username)**

Deletes the user mentioned in the function from the database


- **.removeAll()**

Deletes all users from the database except the "Master" user
