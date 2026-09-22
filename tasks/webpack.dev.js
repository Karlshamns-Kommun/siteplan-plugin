const merge = require('webpack-merge');
const common = require('./webpack.common');
const WriteFilePlugin = require('write-file-webpack-plugin');

module.exports = merge(common, {
  output: {
    path: `${__dirname}/../../origo_v2/plugins`,
    publicPath: '/build/js',
    filename: 'siteplan.js',
    libraryTarget: 'var',
    libraryExport: 'default',
    library: 'Siteplan'
  },
  mode: 'development',
  module: {
  },
  plugins: [
    new WriteFilePlugin()
  ],
  devServer: {
    contentBase: './',
    port: 9008
  }
});
