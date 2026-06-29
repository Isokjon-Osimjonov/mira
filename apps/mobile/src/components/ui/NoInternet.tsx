import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import * as Network from 'expo-network'
import { tokens } from '../../lib/tokens'
import EmptyState from './EmptyState'

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true)
  useEffect(() => {
    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync()
        setIsConnected(state.isConnected === true && state.isInternetReachable !== false)
      } catch {
        setIsConnected(true)
      }
    }
    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [])
  return isConnected
}

export default function NoInternet({ onRetry }: { onRetry?: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: tokens.colors.background }}>
      <EmptyState
        icon="wifi-off"
        heading="Internetga ulanish yo'q"
        subtitle="Internet aloqangizni tekshiring va qayta urinib ko'ring"
        actionLabel={onRetry ? 'Qayta urinish' : undefined}
        onAction={onRetry}
      />
    </View>
  )
}
