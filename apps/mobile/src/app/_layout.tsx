import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter'
import { View, Platform } from 'react-native'
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { queryClient } from '../lib/query-client'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { useNetworkStatus } from '../components/ui/NoInternet'
import NoInternet from '../components/ui/NoInternet'
import { useAuthStore } from '../lib/auth-store'
import { useEffect } from 'react'
import { registerForPushNotifications, setupNotificationListeners } from '../lib/push-notifications'
import { useRouter } from 'expo-router'

// Inner component — has access to QueryClientProvider
function AppContent() {
  const isConnected = useNetworkStatus()
  const queryClient = useQueryClient()
  const router = useRouter()
  const customer = useAuthStore(s => s.customer)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  // Push token registration
  useEffect(() => {
    if (!isAuthenticated || !customer) return
    registerForPushNotifications().then(async token => {
      if (!token) return
      try {
        const api = (await import('../lib/api')).default
        await api.post('/auth/push-token', { token, platform: Platform.OS })
      } catch {}
    })
  }, [isAuthenticated, customer?.id])

  // Notification tap handler
  useEffect(() => {
    const cleanup = setupNotificationListeners(
      undefined,
      (response) => {
        const data = response.notification.request.content.data as any
        if (data?.orderId) router.push('/orders/' + data.orderId)
        else if (data?.productId) router.push('/product/' + data.productId)
      }
    )
    return cleanup
  }, [])

  if (!isConnected) {
    return (
      <SafeAreaProvider>
        <NoInternet onRetry={() => queryClient.invalidateQueries()} />
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  )
}

// Root layout — provides QueryClient
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  })

  if (!fontsLoaded) return <View style={{ flex: 1 }} />

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}