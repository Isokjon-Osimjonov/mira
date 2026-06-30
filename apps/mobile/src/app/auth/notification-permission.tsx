import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { tokens } from '../../lib/tokens'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { Feather } from '@expo/vector-icons'

export default function NotificationPermissionScreen() {
  const { returnTo } = useLocalSearchParams()
  const handleAllow = async () => {
    try {
      // expo-notifications requires dev build
      // For now just navigate — token save in Sprint 4
      router.replace(returnTo ? String(returnTo) : '/(tabs)/home')
    } catch {
      router.replace(returnTo ? String(returnTo) : '/(tabs)/home')
    }
  }

  const handleSkip = () => {
    router.replace(returnTo ? String(returnTo) : '/(tabs)/home')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <View style={styles.iconContainer}>
          <Feather name="bell" size={40} color={tokens.colors.primary} />
        </View>

        <Text style={styles.title}>Bildirishnomalarni yoqing</Text>
        <Text style={styles.description}>
          Buyurtma holati, chegirmalar va yangi{'\n'}
          mahsulotlar haqida birinchi bo'lib xabar oling
        </Text>
      </View>

      <View style={styles.bottom}>
        <PrimaryButton label="Yoqish" onPress={handleAllow} />

        <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
          <Text style={styles.skipText}>Keyinroq</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.white,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    fontSize: 26,
    color: tokens.colors.text,
    textAlign: 'center',
    marginTop: 24,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '300',
    fontSize: 14,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  skipButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '300',
    fontSize: 14,
    color: tokens.colors.textMuted,
    textAlign: 'center',
  },
})
