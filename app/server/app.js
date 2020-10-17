'use strict';

const debug = require('debug')('CameraUIApp');

const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const createError = require('http-errors');
const device = require('express-device');
const express = require('express');
const favicon = require('serve-favicon');
const flash = require('connect-flash');
const helmet = require('helmet');
const i18next = require('i18next');
const i18nextBackend = require('i18next-node-fs-backend');
const i18nextMiddleware = require('i18next-http-middleware');
const logger = require('morgan');
const multer = require('multer');
const passport = require('passport');
const path = require('path');
const session = require('express-session');
const unless = require('express-unless');
const { v4: uuidv4 } = require('uuid');

const FileStore = require('session-file-store')(session);
const LocalStrategy = require('passport-local').Strategy;

//routes
const camera = require('../controller/camera');
const cameras = require('../controller/cameras');
const camviews = require('../controller/camviews');
const changeCr = require('../controller/change');
const dashboard = require('../controller/dashboard');
const files = require('../controller/files');
const interFace = require('../controller/interface');
const login = require('../controller/login');
const logout = require('../controller/logout');
const notifications = require('../controller/notifications');
const recordings = require('../controller/recordings');
const settings = require('../controller/settings');
const subscribe = require('../controller/subscribe');

var app, sessionMiddleware;

module.exports = { 

  init: function(config, accessories, database, configPath){

    const auth_ = require('./middlewares/auth')(config.auth, database.Users());
    const redirect_ = require('./middlewares/redirect')(accessories);
    
    let port = config.port;
    let debugMode = config.debug;
    let lang = config.language === 'auto' ? false : [config.language];
    
    let db_cameras = database.Cameras();
    let db_notifications = database.Notifications();
    let db_recordings = database.Recordings();
    let db_settings = database.Settings();
    let db_users = database.Users();     
    
    let autoSignout = {};
    let profile = db_settings.getProfile();    
    
    //i18n
    i18next
      .use(i18nextBackend)
      .use(i18nextMiddleware.LanguageDetector)
      .init({
        debug: false,
        load: 'languageOnly',
        backend: {
          loadPath: path.join(__dirname, 'locales', '{{lng}}.json')
        },
        detection: {
          order: ['header', 'navigator'],
          caches: ['cookie']
        },
        whitelist: lang, 
        fallbackLng: 'en',
        preload: ['en', 'de']
      });
    
    //Passport
    passport.use(new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password'
    }, 
    async function (username, password, cb) {
      let user = db_users.getUser(username);
      if(!user)
        return cb(null, false, {message: 'Incorrect username or password.'});
      if(user.changed){
        if(user.hashedpassword){
          let match = await bcrypt.compare(password, user.hashedpassword);
          if(!match)
            return cb(null, false, {message: 'Incorrect username or password.'});
        } else {
          let hash = await bcrypt.hash(password, 10);
          db_users.change(username, {
            hashedpassword: hash
          }, [
            'password'
          ]);
          user = db_users.getUser(username);
        }
        return cb(null, user, {message: 'Logged In Successfully'});
      } else {
        return cb(null, user, {change: true, message: 'Please change credentials!'});
      }
    }
    ));
    
    // tell passport how to serialize the user
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });
    
    passport.deserializeUser((id, done) => {
      let user = db_users.getUser(false, false, id);
      done(null, user || false);
    });
    
    //Express Server
    app = express();
    app.set('port', this.normalizePort(port));
    
    //Debug
    if(debugMode)
      app.use(logger('dev'));

    //init i18n
    app.use(i18nextMiddleware.handle(i18next));
    
    //compress
    app.use(compression());
    
    // set some headers to help secure the app
    app.use(helmet());
    app.use(
      helmet.contentSecurityPolicy({
        directives: {
          defaultSrc: ['\'unsafe-eval\'', '\'unsafe-inline\'', '\'self\''],
          styleSrc: ['\'unsafe-eval\'', '\'unsafe-inline\'', '\'self\'', 'https://*.bootstrapcdn.com', 'https://*.gstatic.com', 'https://*.googleapis.com'],
          scriptSrc: ['\'unsafe-eval\'', '\'unsafe-inline\'', '\'self\'', 'https://*.jquery.com', 'https://*.bootstrapcdn.com', 'https://*.cloudflare.com', 'https://*.jsdelivr.net', 'https://*.googleapis.com', 'blob:'],
          connectSrc: ['ws:', 'wss:', '\'unsafe-eval\'', '\'unsafe-inline\'', '\'self\''],
          fontSrc: ['\'unsafe-eval\'', '\'unsafe-inline\'', '\'self\'', 'https://*.gstatic.com', 'https://*.googleapis.com'],
          'img-src': ['\'unsafe-eval\'', '\'unsafe-inline\'', '\'self\'', 'data:', 'blob:'],
          'media-src': ['\'unsafe-eval\'', '\'unsafe-inline\'', '\'self\'', 'data:', 'blob:']
        },
      })
    );
    
    // view engine setup
    app.set('views', path.join(__dirname, '..', 'views'));
    app.set('view engine', 'pug');
    app.set('view options', { layout: false });
    
    app.use(favicon(path.join(__dirname, '..', 'public', 'images/favicons', 'favicon.ico')));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, '..', 'public')));
    app.use(flash());
    app.use(device.capture());
    device.enableDeviceHelpers(app);
    
    //multer
    const storage = multer.diskStorage({
      destination: function(req, file, cb) { 
        let dest = configPath + '/db/users/';
        cb(null, dest);
      },
      filename: function (req, file, cb) {
        cb(null, file.fieldname + '_' + req.session.userID + '_' + '.jpg');
      }
    });
    const upload = multer({ storage: storage });
    
    if(config.ssl)
      app.set('trust proxy', 1);
     
    sessionMiddleware = session({
      genid: (req) => {
        return uuidv4();
      },
      secret: database.session.get('key').value(),
      name: 'camera.ui',
      resave: true,
      saveUninitialized: false,
      proxy: config.ssl ? true : false,
      store: new FileStore({
        path: configPath + '/db/session/',
        logFn: function(){},
        ttl: isNaN(parseInt(profile.logoutTimer)) ? 2147483648 : profile.logoutTimer * 60 * 60 //in seconds
      }),
      cookie: {
        secure: config.ssl ? true : false,
        maxAge: isNaN(parseInt(profile.logoutTimer)) ? 2147483648 * 1000 : profile.logoutTimer * 60 * 60 * 1000, //miliseconds,
        originalMaxAge: isNaN(parseInt(profile.logoutTimer)) ? 2147483648 * 1000 : profile.logoutTimer * 60 * 60 * 1000    
      }
    });   
    
    app.use(sessionMiddleware);
    app.use(passport.initialize());
    app.use(passport.session());
    
    app.use(redirect_.session.unless({
      path: [
        { 
          url: '/logout',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/files',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/subscribe',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/interface',
          methods: ['GET', 'POST'] 
        }
      ],
      ext: [
        'jpg',
        'jpeg',
        'mp4'
      ]
    }));
    
    app.use(auth_.ensureAuthenticated.unless({
      path: [
        { 
          url: '/camera',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/cameras',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/notifications',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/recordings',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/interface',
          methods: ['GET', 'POST'] 
        }
      ],
      ext: [
        'jpg',
        'jpeg',
        'mp4'
      ]
    }));
    
    app.use(auth_.ensureAdmin.unless({
      path: [
        { 
          url: '/',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/change',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/logout',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/dashboard',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/camviews',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/settings',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/files',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/subscribe',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/interface',
          methods: ['GET', 'POST'] 
        }
      ],
      ext: [
        'jpg',
        'jpeg',
        'mp4'
      ]
    }));
    
    const locals = function (req, res, next) {
    
      let auth = config.auth === 'form';
    
      debug({
        userID: req.session.userID ? req.session.userID : false,
        message: 'locals',
        url: req.originalUrl,
        authenticated: req.isAuthenticated(),
        noAuth: !auth || false
      });
  
      res.locals.noAuth = req.session.noAuth;
      res.locals.username = req.session.username;
      res.locals.role = req.session.role;
      res.locals.photo = req.session.photo;
      
      res.locals.dashboard = db_settings.getDashboard();
      res.locals.camview = db_settings.getCamviews();
      res.locals.cameras = db_cameras.getCameras();
      res.locals.notifications = db_notifications.getNots();
      res.locals.not_size = res.locals.notifications.length; 
      res.locals.lastNotifications = db_notifications.getLastNotifications();
      res.locals.settings = db_settings.get();
      res.locals.keys = db_settings.getWebpush();
      res.locals.users = db_users.get();
      
      res.locals.camNames = accessories.map(accessory => accessory.displayName);
      
      res.locals.ssl = config.ssl ? true : false;
      res.locals.flash = req.flash();
      
      next();
      
    };
    
    locals.unless = unless;
    
    app.use(locals.unless({
      path: [
        { 
          url: '/',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/change',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/logout',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/files',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/subscribe',
          methods: ['GET', 'POST'] 
        },
        { 
          url: '/interface',
          methods: ['GET', 'POST'] 
        }
      ],
      ext: [
        'jpg',
        'jpeg',
        'mp4'
      ]
    }));
    
    //define routes
    app.use('/', login(app, db_settings, autoSignout));
    app.use('/change', changeCr(app, db_settings, db_users, autoSignout));
    app.use('/logout', logout(app, autoSignout));
    app.use('/dashboard', dashboard(app, db_settings, db_cameras));
    app.use('/cameras', cameras(app, db_cameras));
    app.use('/camera', camera(app, db_notifications, db_cameras));
    app.use('/camviews', camviews(app, db_cameras));
    app.use('/notifications', notifications(app, db_notifications));
    app.use('/settings', settings(app, upload, db_settings, db_users));
    app.use('/recordings', recordings(app, db_settings, db_recordings));
    app.use('/interface', interFace(app, db_settings, db_users));
    app.use('/files', files(app, db_settings, configPath));
    app.use('/subscribe', subscribe(app, db_settings));
    
    app.use((req, res, next) => {
      next(createError(404));
    }); 
    
    // error handler
    app.use(function(err, req, res, next) {
    
      debug(err.message);
      
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};
      
      if(err.status === 401){
        res.status(err.status);
        res.render('unauthorised', {status: err.status, message: res.locals.message});
      } else if(err.status === 403) {
        res.status(err.status);
        res.render('restricted', {status: err.status, message: res.locals.message});
      } else {
        res.status(err.status || 500);
        res.render('error', {status: err.status, message: res.locals.message});
      }
    
    });
    
    return;
    
  },
  
  normalizePort: function(val) {
    
    let port = parseInt(val, 10);

    if (isNaN(port))
      return val;
      
    if (port >= 0)
      return port;

    return false;
    
  },
  
  get: function(){
  
    return app;
  
  },
  
  appSession: function(){
  
    return sessionMiddleware;  
    
  }
  
};