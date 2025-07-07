// metro.config.js

const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Customize the config safely:
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;
config.transformer.unstable_removeUnusedImportExport = false;


module.exports = config;