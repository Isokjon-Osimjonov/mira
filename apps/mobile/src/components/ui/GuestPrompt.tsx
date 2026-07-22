import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { tokens } from '../../lib/tokens'

export const GuestPrompt = () => (
  <View style={styles.guestContainer}>
    <Text style={styles.guestTitle}>Kirish talab etiladi</Text>
    <Text style={styles.guestSubtitle}>
      Bu funksiyadan foydalanish uchun tizimga kiring
    </Text>
    <TouchableOpacity
      style={styles.loginBtn}
      onPress={() => router.push('/auth/login')}
    >
      <Text style={styles.loginBtnText}>Kirish</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.guestBtn} onPress={() => router.back()}>
      <Text style={styles.guestBtnText}>Orqaga</Text>
    </TouchableOpacity>
  </View>
)

const styles = StyleSheet.create({
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: tokens.colors.background,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: tokens.colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    color: tokens.colors.textMuted,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginBtn: {
    backgroundColor: tokens.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  loginBtnText: {
    color: tokens.colors.white,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  guestBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  guestBtnText: {
    color: tokens.colors.textMuted,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
})
