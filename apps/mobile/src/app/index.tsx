import React, { useEffect } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { router } from 'expo-router'
import { tokens } from '../lib/tokens'
import { useFonts, Inter_700Bold } from '@expo-google-fonts/inter'

export default function SplashScreen() {
  const [fontsLoaded] = useFonts({
    Inter_700Bold,
  })

  useEffect(() => {
    const checkState = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      router.replace('/onboarding')
    }

    if (fontsLoaded) {
      checkState()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) {
    return null
  }

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
    backgroundColor: 'FFF5F9',
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
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: tokens.colors.white,
    marginTop: 20,
    fontWeight: 'bold',
  },
})
