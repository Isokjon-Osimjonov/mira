import React, { useEffect } from 'react'
import { View, Image, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../lib/auth-store'
import * as SecureStore from 'expo-secure-store'

export default function SplashScreen() {
  useEffect(() => {
    const init = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await useAuthStore.getState().initialize()

      const { isAuthenticated } = useAuthStore.getState()
      const onboardingDone = await SecureStore.getItemAsync('onboarding_complete')

      if (!onboardingDone) {
        router.replace('/onboarding')
      } else if (!isAuthenticated) {
        router.replace('/auth/login')
      } else {
        router.replace('/(tabs)/home')
      }
    }
    init()
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/icon.png')}
          style={[styles.logo, { borderRadius: 22 }]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
  },
})
