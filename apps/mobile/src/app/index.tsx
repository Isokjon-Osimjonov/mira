import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../lib/auth-store'
import { tokens } from '../lib/tokens'
import * as ExpoStorage from 'expo-secure-store'

export default function IndexScreen() {
  const initialize = useAuthStore((s) => s.initialize)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initialize().finally(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready) return
    checkOnboardingAndAuth()
  }, [ready, isAuthenticated])

  async function checkOnboardingAndAuth() {
    const seenOnboarding = await ExpoStorage.getItemAsync('onboarding_complete')
    if (!seenOnboarding) {
      router.replace('/onboarding')
      return
    }
    if (isAuthenticated) {
      router.replace('/(tabs)/home')
    } else {
      router.replace('/(tabs)/home')
    }
  }

  // Show spinner while initializing
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tokens.colors.background,
      }}
    >
      <ActivityIndicator size="large" color={tokens.colors.primary} />
    </View>
  )
}
