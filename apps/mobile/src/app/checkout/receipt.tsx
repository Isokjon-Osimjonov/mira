import { useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'

export default function ReceiptRedirect() {
  const { orderId } = useLocalSearchParams()
  const router = useRouter()
  
  useEffect(() => {
    // Receipt is now handled in checkout
    // This is just a safety redirect
    router.replace('/(tabs)/orders')
  }, [])
  
  return null
}
