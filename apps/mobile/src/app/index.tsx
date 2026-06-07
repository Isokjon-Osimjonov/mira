import React, { useEffect } from 'react'
import { View, Image, StyleSheet } from 'react-native'
import { router } from 'expo-router'

export default function SplashScreen() {
  useEffect(() => {
    const checkState = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      router.replace('/onboarding')
    }
    checkState()
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
    backgroundColor: '#FFF5F9',
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
