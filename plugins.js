const { withGradleProperties } = require("@expo/config-plugins");

module.exports = (config) => {
    return withGradleProperties(config, (config) => {
        config.modResults.push({
            type: "property",
            key: "AsyncStorage_db_size_in_MB",
            value: "50", // Increase to 50MB (Change this value as needed)
        });
        return config;
    });
};