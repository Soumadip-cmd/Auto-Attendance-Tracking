const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Block Node.js modules that cause issues in React Native
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Block follow-redirects (Node.js only module used by axios)
    if (moduleName === 'follow-redirects') {
      return {
        type: 'empty',
      };
    }
    // Use default resolver
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
