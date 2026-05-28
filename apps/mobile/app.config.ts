import type { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Mira Cosmetics',
  slug: 'mira-cosmetics',
  scheme: 'mira-cosmetics',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1A0533',
  },
  ios: {
    bundleIdentifier: 'uz.miracosmetics',
    buildNumber: '1',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: 'Kvitansiya rasmi yuklash uchun',
      NSPhotoLibraryUsageDescription: 'Galereyadagi rasmni tanlash uchun',
      NSUserNotificationsUsageDescription: 'Buyurtma holati haqida xabar olish uchun',
    },
  },
  android: {
    package: 'uz.miracosmetics',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1A0533',
    },
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'RECEIVE_BOOT_COMPLETED', 'VIBRATE'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#7C3AED',
      },
    ],
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    botUsername: process.env.EXPO_PUBLIC_BOT_USERNAME,
    eas: { projectId: 'a97bda7b-3df6-485f-b128-305279ae4a20' },
  },
})
