module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Don't include 'expo-router/babel' - it's deprecated! 
      'react-native-reanimated/plugin',
    ],
  };
};