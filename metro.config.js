// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
    const config = getDefaultConfig(__dirname);

    // garante suporte a .cjs só se você realmente usa
    if (Array.isArray(config.resolver?.sourceExts) && !config.resolver.sourceExts.includes('cjs')) {
        config.resolver.sourceExts.push('cjs');
    }

    // remova flags instáveis que quebram o parse do Node
    if (config.resolver) delete config.resolver.unstable_enablePackageExports;
    if (config.transformer) delete config.transformer.unstable_removeUnusedImportExport;

    return config;
})();
