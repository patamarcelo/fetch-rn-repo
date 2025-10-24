// app.config.js
import 'dotenv/config';

/**
 * Helper: falha cedo se a env estiver ausente.
 */
const req = (key) => {
    const v = process.env[key];
    if (v === undefined || v === null || v === '') {
        throw new Error(`Env "${key}" não definida`);
    }
    return v;
};

export default {
    expo: {
        name: 'Farm Aplicações',
        slug: 'fetch-app',
        version: '1.0.41',
        orientation: 'portrait',
        icon: './assets/icon.png',
        // userInterfaceStyle: 'automatic',

        plugins: [
            'expo-system-ui',
            './plugins.js',
            [
                'expo-location',
                {
                    locationAlwaysAndWhenInUsePermission:
                        'Permitir que o $(PRODUCT_NAME) use sua localização.',
                },
            ],
        ],

        splash: {
            resizeMode: 'contain',
            backgroundColor: '#031633',
            image: './assets/splash.png',
        },

        assetBundlePatterns: ['assets/*', 'assets/**/*'],

        ios: {
            supportsTablet: true,
            bundleIdentifier: 'com.patamarcelo.fetchapp',
            infoPlist: {
                ITSAppUsesNonExemptEncryption: false,
            },
            // ⚠️ Aqui agora é um valor real, vindo da ENV
            config: {
                googleMapsApiKey: req('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'),
            },
        },

        android: {
            adaptiveIcon: {
                foregroundImage: './assets/adaptive-icon.png',
                backgroundColor: '#031633',
            },
            package: 'com.patamarcelo.fetchapp',
            // ⚠️ Aqui também passa a ser real
            config: {
                googleMaps: {
                    apiKey: req('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'),
                },
            },
            permissions: [
                'android.permission.ACCESS_COARSE_LOCATION',
                'android.permission.ACCESS_FINE_LOCATION',
            ],
        },

        web: {
            favicon: './assets/favicon.png',
        },

        extra: {
            // Mantém o projectId do EAS
            eas: {
                projectId: '6f296023-01ce-4d08-ae54-437fdd9cb693',
            },
            /**
             * Opcional: se você quiser expor outras variáveis públicas no app via Constants.expoConfig.extra,
             * coloque-as aqui. Lembre: **somente** chaves que comecem com EXPO_PUBLIC_.
             * Ex.: apiUrl: process.env.EXPO_PUBLIC_API_URL
             */
        },

        runtimeVersion: '1.0.40',

        updates: {
            url: 'https://u.expo.dev/6f296023-01ce-4d08-ae54-437fdd9cb693',
        },
    },
};