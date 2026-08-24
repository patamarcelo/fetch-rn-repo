// app.config.js
import "dotenv/config";

/**
 * Retorna uma variável de ambiente obrigatória.
 * Interrompe a leitura da configuração quando ela não estiver definida.
 */
const req = (key) => {
    const value = process.env[key];

    if (
        value === undefined ||
        value === null ||
        value.trim() === ""
    ) {
        throw new Error(`Env "${key}" não definida`);
    }

    return value;
};

/**
 * Versão pública exibida na App Store e Google Play.
 *
 * Esta versão continua sendo controlada manualmente.
 * Altere quando criar uma nova versão pública do aplicativo.
 */
const APP_VERSION = "1.0.89";

export default {
    expo: {
        name: "Farm Aplicações",
        slug: "fetch-app",

        version: APP_VERSION,

        /**
         * Cada versão pública possui seu próprio runtime OTA.
         *
         * Isso impede que binários antigos recebam JavaScript
         * dependente de módulos nativos que eles não possuem.
         */
        runtimeVersion: {
            policy: "appVersion",
        },

        orientation: "portrait",
        icon: "./assets/icon.png",

        plugins: [
            "expo-system-ui",

            [
                "expo-build-properties",
                {
                    android: {
                        compileSdkVersion: 36,
                        targetSdkVersion: 36,
                        buildToolsVersion: "36.0.0",
                    },
                },
            ],

            "react-native-bottom-tabs",

            /**
             * Configuração personalizada para aumentar o limite
             * do banco utilizado pelo AsyncStorage no Android.
             */
            "./plugins.js",

            [
                "expo-location",
                {
                    locationAlwaysAndWhenInUsePermission:
                        "Permitir que o $(PRODUCT_NAME) use sua localização.",
                },
            ],
        ],

        splash: {
            resizeMode: "contain",
            backgroundColor: "#031633",
            image: "./assets/splash.png",
        },

        assetBundlePatterns: [
            "assets/*",
            "assets/**/*",
        ],

        ios: {
            supportsTablet: true,
            bundleIdentifier: "com.patamarcelo.fetchapp",

            infoPlist: {
                ITSAppUsesNonExemptEncryption: false,
            },

            config: {
                googleMapsApiKey: req(
                    "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"
                ),
            },
        },

        android: {
            package: "com.patamarcelo.fetchapp",

            adaptiveIcon: {
                foregroundImage:
                    "./assets/adaptive-icon.png",
                backgroundColor: "#031633",
            },

            config: {
                googleMaps: {
                    apiKey: req(
                        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"
                    ),
                },
            },

            permissions: [
                "android.permission.ACCESS_COARSE_LOCATION",
                "android.permission.ACCESS_FINE_LOCATION",
            ],
        },

        web: {
            favicon: "./assets/favicon.png",
        },

        extra: {
            eas: {
                projectId:
                    "6f296023-01ce-4d08-ae54-437fdd9cb693",
            },
        },

        updates: {
            url:
                "https://u.expo.dev/6f296023-01ce-4d08-ae54-437fdd9cb693",

            checkAutomatically: "ON_LOAD",
            fallbackToCacheTimeout: 0,

            requestHeaders: {
                "expo-channel-name": "production",
            },
        },
    },
};