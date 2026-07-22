import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import * as SecureStore from 'expo-secure-store'

export default function Index() {
  const [checked, setChecked] = useState(false)
  const [hasSeenOnboarding, setHasSeen] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const seen = await SecureStore.getItemAsync('onboarding_complete')
        setHasSeen(seen === 'true')
      } catch {
        setHasSeen(false)
      } finally {
        setChecked(true)
      }
    }
    check()
  }, [])

  if (!checked) return null

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />
  }

  return <Redirect href="/(tabs)/home" />
}
