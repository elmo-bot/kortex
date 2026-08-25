const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb');
// Three's conditional ESM/CJS exports otherwise create two runtime singletons in Metro.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
