import { Linking } from 'react-native'
import { useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function PrivacyScreen() {
  const router = useRouter()
  
  useEffect(() => {
    // Open in browser and go back
    Linking.openURL('https://miramarket.uz/privacy')
    router.back()
  }, [router])
  
  return null
}
