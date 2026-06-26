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
    backgroundColor: '#FFF5F9',
  },
  notification: {
    icon: './assets/notification-icon.png',
    color: '#E11D74',
    androidMode: 'default',
  },
  ios: {
    bundleIdentifier: 'uz.miramarket.app',
    buildNumber: '1',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: 'Kvitansiya rasmi yuklash uchun',
      NSPhotoLibraryUsageDescription: 'Galereyadagi rasmni tanlash uchun',
      NSUserNotificationsUsageDescription: 'Buyurtma holati haqida xabar olish uchun',
    },
  },
  android: {
    package: 'uz.miramarket.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#FFF5F9',
    },
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'RECEIVE_BOOT_COMPLETED', 'VIBRATE'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        imageWidth: 400,
        resizeMode: 'contain',
        backgroundColor: '#FFF5F9',
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
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    botUsername: process.env.EXPO_PUBLIC_BOT_USERNAME,
    eas: { projectId: 'a97bda7b-3df6-485f-b128-305279ae4a20' },
  },
})
