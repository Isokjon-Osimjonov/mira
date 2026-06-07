import React, { useState } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { tokens } from '../../lib/tokens'
import PhoneInput, { validatePhone } from '../../components/ui/PhoneInput'
import PrimaryButton from '../../components/ui/PrimaryButton'

export default function LoginScreen() {
  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState<'UZB' | 'KOR'>('UZB')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)

  const handleSubmit = () => {
    if (!validatePhone(phone, region)) {
      setError("Telefon raqam noto'g'ri")
      return
    }
    
    setLoading(true)
    // Sprint 2: UI Only - simulate API call or just navigate
    setTimeout(() => {
      setLoading(false)
      router.push({
        pathname: '/auth/otp',
        params: { phone, region },
      })
    }, 500)
  }

  const handlePhoneChange = (v: string) => {
    setPhone(v)
    if (error) setError('')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>Kirish</Text>
        <Text style={styles.subtitle}>Telefon raqamingizni kiriting</Text>
      </View>

      <View style={styles.form}>
        <PhoneInput
          phone={phone}
          onPhoneChange={handlePhoneChange}
          region={region}
          onRegionChange={setRegion}
          error={error}
          focused={focused}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        <View style={{ marginTop: 24 }}>
          <PrimaryButton
            label="Davom etish"
            onPress={handleSubmit}
            loading={loading}
            disabled={!validatePhone(phone, region)}
          />
        </View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.bottomText}>
          Telegram orqali OTP kodi yuboriladi
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.white,
  },
  top: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: tokens.colors.text,
    marginTop: 24,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: tokens.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    marginTop: 40,
    paddingHorizontal: 24,
  },
  bottom: {
    marginTop: 16,
    alignItems: 'center',
  },
  bottomText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: tokens.colors.textMuted,
  },
})
