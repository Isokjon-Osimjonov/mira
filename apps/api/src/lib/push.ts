import { Expo } from 'expo-server-sdk'

const expo = new Expo()

export async function sendPushNotification(params: {
  token: string | null | undefined
  title: string
  body: string
  data?: Record<string, unknown>
}): Promise<void> {
  const { token, title, body, data } = params

  // Validate token format
  if (!token || !Expo.isExpoPushToken(token)) return

  try {
    const messages = [
      {
        to: token,
        sound: 'default' as const,
        title,
        body,
        data: data ?? {},
        badge: 1,
      },
    ]

    const chunks = expo.chunkPushNotifications(messages)
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk)
    }
  } catch (err: any) {
    // NEVER throw — push failure must not break order flow
    console.error('Push notification failed:', err.message)
  }
}
