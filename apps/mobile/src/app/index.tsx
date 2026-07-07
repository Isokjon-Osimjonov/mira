import { useEffect } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import * as ExpoStorage from 'expo-secure-store'

export default function IndexScreen() {
  const router = useRouter()

  useEffect(() => {
    checkOnboarding()
  }, [])

  async function checkOnboarding() {
    const seenOnboarding = await ExpoStorage.getItemAsync('onboarding_complete')
    if (!seenOnboarding) {
      router.replace('/onboarding')
    } else {
      router.replace('/(tabs)/home')
    }
  }

  // Brief transparent screen while
  // useEffect fires
  return (
    <View style={{
      flex: 1,
      backgroundColor: '#ffffff'
    }} />
  )
}
