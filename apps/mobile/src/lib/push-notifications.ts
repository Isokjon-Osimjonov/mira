import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerForPushNotifications():
  Promise<string | null> {
  // Must be physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device')
    return null
  }

  // Check/request permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync()

  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } =
      await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied')
    return null
  }

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(
      'default', {
        name: 'Mira Market',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E11D74',
        sound: 'default',
      }
    )
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      ?? 'a97bda7b-3df6-485f-b128-305279ae4a20'

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    })

    console.log('Push token:', token.data)
    return token.data
  } catch (err) {
    console.error('Failed to get push token:', err)
    return null
  }
}

export function setupNotificationListeners(
  onNotification?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void
) {
  // Received while app is foregrounded
  const notifSub = Notifications.addNotificationReceivedListener(
    notification => {
      console.log('Notification received:', notification)
      onNotification?.(notification)
    }
  )

  // User tapped notification
  const responseSub =
    Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('Notification tapped:', response)
        onResponse?.(response)
      }
    )

  return () => {
    notifSub.remove()
    responseSub.remove()
  }
}

export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync()
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count)
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0)
}