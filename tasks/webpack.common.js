module.exports = {
  entry: [
    './src/siteplan.js'
  ],
  module: {
    rules: [{
      test: /\.(js)$/,
      exclude: /node_modules/
    }]
  },
  externals: {
    Origo: 'Origo'
  },
  resolve: {
    extensions: ['*', '.js', '.scss']
  }
};