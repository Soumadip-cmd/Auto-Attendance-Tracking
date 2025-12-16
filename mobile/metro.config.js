// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add web support
config.resolver.sourceExts = [... config.resolver.sourceExts, 'mjs', 'cjs'];

// Fix import.meta for web
config.transformer = {
  ... config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Add asset extensions
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'db',
  'mp3',
  'ttf',
  'obj',
  'png',
  'jpg',
];

module.exports = config;