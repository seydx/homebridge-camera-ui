'use-strict';

const crypto = require('crypto');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const configPath =
  process.env.NODE_ENV === 'test'
    ? path.join(__dirname, '../../test/homebridge/config.json')
    : process.env.HB_CONFIG_PATH || path.resolve(os.homedir(), '.homebridge/config.json');

const storagePath =
  process.env.NODE_ENV === 'test'
    ? path.join(__dirname, '../../test/storage')
    : process.env.HB_STORAGE_PATH || path.resolve(os.homedir(), '.homebridge');

const secretPath = path.resolve(storagePath, '.camera.ui.secrets');

const uiSettings = {
  dbPath: storagePath,
  permissionLevels: [
    'admin',
    //API
    'backup:download',
    'backup:restore',
    'cameras:access',
    'cameras:edit',
    'config:access',
    'notifications:access',
    'notifications:edit',
    'recordings:access',
    'recordings:edit',
    'settings:access',
    'settings:edit',
    'users:access',
    'users:edit',
    //CLIENT
    'camview:access',
    'dashboard:access',
    'settings:cameras:access',
    'settings:cameras:edit',
    'settings:camview:access',
    'settings:camview:edit',
    'settings:dashboard:access',
    'settings:dashboard:edit',
    'settings:general:access',
    'settings:general:edit',
    'settings:notifications:access',
    'settings:notifications:edit',
    'settings:profile:access',
    'settings:profile:edit',
    'settings:recordings:access',
    'settings:recordings:edit',
  ],
};

class ConfigService {
  constructor() {
    this.getPluginConfig();
    this.getUiConfig();
  }

  getHbConfig() {
    this.config = fs.readJSONSync(configPath);
  }

  getPluginConfig() {
    this.getHbConfig();

    this.plugin = this.config.platforms.find((x) => x.platform === 'CameraUI');

    return this.plugin || {};
  }

  getUiConfig() {
    this.ui = uiSettings;

    this.getPluginUiConfig();
    this.getJwtSecrets();

    return this.ui;
  }

  saveHbConfig(platformConfig) {
    this.getHbConfig();

    for (const index in this.config.platforms) {
      if (this.config.platforms[index].platform === 'CameraUI') {
        this.config.platforms[index] = platformConfig;
      }
    }

    fs.writeJSONSync(configPath, this.config, { spaces: 4 });
  }

  getPluginUiConfig() {
    if (!this.plugin) {
      this.getPluginConfig();
    }

    this.ui.language = this.plugin.language || 'en';
    this.ui.theme = this.plugin.theme || 'light-pink';
  }

  getJwtSecrets() {
    if (fs.pathExistsSync(secretPath)) {
      try {
        const secrets = fs.readJsonSync(secretPath);

        if (!secrets.jwt_secret) {
          return this.generateJwtSecrets();
        } else {
          this.ui.jwt_secret = secrets.jwt_secret;

          return secrets;
        }
      } catch {
        return this.generateJwtSecrets();
      }
    } else {
      return this.generateJwtSecrets();
    }
  }

  generateJwtSecrets() {
    const secrets = {
      jwt_secret: crypto.randomBytes(32).toString('hex'),
    };

    this.ui.jwt_secret = secrets.jwt_secret;

    fs.ensureFileSync(secretPath);
    fs.writeJsonSync(secretPath, secrets, { spaces: 2 });

    return secrets;
  }
}

module.exports = new ConfigService();
