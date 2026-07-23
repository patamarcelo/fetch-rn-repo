// plugins.js
const {
    withGradleProperties,
} = require('expo/config-plugins');

const ASYNC_STORAGE_DB_SIZE_KEY =
    'AsyncStorage_db_size_in_MB';

const ASYNC_STORAGE_DB_SIZE_VALUE = '50';

module.exports = function withAsyncStorageDatabaseSize(config) {
    return withGradleProperties(config, (config) => {
        const existingProperty = config.modResults.find(
            (item) =>
                item.type === 'property' &&
                item.key === ASYNC_STORAGE_DB_SIZE_KEY
        );

        if (existingProperty) {
            existingProperty.value =
                ASYNC_STORAGE_DB_SIZE_VALUE;
        } else {
            config.modResults.push({
                type: 'property',
                key: ASYNC_STORAGE_DB_SIZE_KEY,
                value: ASYNC_STORAGE_DB_SIZE_VALUE,
            });
        }

        return config;
    });
};