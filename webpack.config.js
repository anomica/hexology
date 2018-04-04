const path = require('path');

const SRC_DIR = path.join(__dirname, '/react-client/src');
const DIST_DIR = path.join(__dirname, '/react-client/dist');

module.exports = {
  entry: `${SRC_DIR}/index.jsx`,
  output: {
    filename: 'bundle.js',
    path: DIST_DIR,
  },
  resolve: { extensions: ['.js', '.jsx', '*'] },
  module: {
    loaders: [
      {
        test: /\.jsx?/,
        include: SRC_DIR,
        loader: 'babel-loader',
        query: {
          presets: ['react', 'es2015'],
        },
      },
      {
        test: /\.(?:png|jpg|svg)$/,
        loader: 'file-loader',
        query: {
          // Inline images smaller than 10kb as data URIs
          limit: 10000,
        },
      },
    ],
  },
  devServer: {
    historyApiFallback: true, // serves up main page for react-router to work with redux
  },
};
