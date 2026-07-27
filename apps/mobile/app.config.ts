import type { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Mira Market',
  slug: 'mira-market',
  scheme: 'mira-market',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  notification: {
    icon: './assets/notification-icon.png',
    color: '#E11D74',
    androidMode: 'default',
  },
  ios: {
    bundleIdentifier: 'uz.miramarket.app',
    buildNumber: '1',
    appleTeamId: '47779M8Z2K',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: 'Kvitansiya rasmi yuklash uchun',
      NSPhotoLibraryUsageDescription: 'Galereyadagi rasmni tanlash uchun',
      NSUserNotificationsUsageDescription: 'Buyurtma holati haqida xabar olish uchun',
      LSApplicationQueriesSchemes: ['https', 'http', 'tel', 'tg', 'telegram', 'instagram'],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    package: 'uz.miramarket.app',
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#FFFFFF',
    },
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'RECEIVE_BOOT_COMPLETED', 'VIBRATE'],
  },
  updates: {
    url: 'https://u.expo.dev/95de2ad4-6355-4322-af4e-a56b3629a2be',
    enabled: true,
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-updates',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        imageWidth: 400,
        resizeMode: 'cover',
        backgroundColor: '#FFFFFF',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#E11D74',
        sounds: [],
      },
    ],
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.miramarket.uz/api/v1',
    botUsername: process.env.EXPO_PUBLIC_BOT_USERNAME,
    eas: { projectId: '95de2ad4-6355-4322-af4e-a56b3629a2be' },
  },
})
