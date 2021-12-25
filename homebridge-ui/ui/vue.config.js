const path = require('path');

module.exports = {
  transpileDependencies: ['vuetify'],
  devServer: {
    port: 8082,
  },
  publicPath: './',
  outputDir: path.resolve(__dirname, '../public'),
  productionSourceMap: false,
  chainWebpack: (config) => {
    config.performance.maxEntrypointSize(500000).maxAssetSize(500000);
    config.plugin('html').tap((arguments_) => {
      const payload = arguments_;
      payload[0].title = 'camera.ui - homebridge-ui';
      return payload;
    });
  },
  css: {
    extract:
      process.env.NODE_ENV === 'production'
        ? {
            ignoreOrder: true,
          }
        : false,
  },
};
