const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add alias support for @/* imports
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
};

module.exports = config;
