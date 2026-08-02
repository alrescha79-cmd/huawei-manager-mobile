const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('./metro.transformer.js'),
};

config.resolver.sourceExts = [...config.resolver.sourceExts, 'md'];

config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
};

module.exports = config;
