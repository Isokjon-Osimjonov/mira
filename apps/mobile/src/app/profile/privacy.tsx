import { Linking, Alert } from 'react-native'
import { useEffect } from 'react'
import { useRouter } from 'expo-router'

const openURL = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    } else {
      Alert.alert('Xatolik', 'Havola ochilmadi. Brauzeringizni tekshiring.', [{ text: 'OK' }])
    }
  } catch (err) {
    Alert.alert('Xatolik', 'Havola ochilmadi.')
  }
}

export default function PrivacyScreen() {
  const router = useRouter()
  
  useEffect(() => {
    // Open in browser and go back
    openURL('https://miramarket.uz/privacy')
      .then(() => router.back())
      .catch(() => router.back())
  }, [router])
  
  return null
}
