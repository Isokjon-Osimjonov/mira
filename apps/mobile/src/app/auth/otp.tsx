import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import Constants from 'expo-constants'
import { tokens } from '../../lib/tokens'
import OtpInput from '../../components/ui/OtpInput'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { Feather } from '@expo/vector-icons'

export default function OtpScreen() {
  const { phone, region } = useLocalSearchParams<{ phone: string; region: 'UZB' | 'KOR' }>()
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [seconds, setSeconds] = useState(300)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (seconds <= 0) return
    const interval = setInterval(() => {
      setSeconds((s) => s - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [seconds])

  useEffect(() => {
    openTelegram()
  }, [])

  const openTelegram = async () => {
    const BOT_USERNAME = Constants.expoConfig?.extra?.botUsername ?? ''
    const tokenStr = '' // Sprint 2: real token from API response
    const url = `tg://resolve?domain=${BOT_USERNAME}&start=${tokenStr}`
    const canOpen = await Linking.canOpenURL('tg://')
    if (!canOpen) {
      setError('Telegram topilmadi. SMS orqali kod yuboriladi.')
      return
    }
    await Linking.openURL(url)
  }

  const formatMaskedPhone = () => {
    const last4 = phone?.slice(-4) || 'xxxx'
    if (region === 'UZB') {
      return `+998 ** *** ${last4.slice(0, 2)} ${last4.slice(2)}`
    }
    return `+82 ** **** ${last4.slice(0, 2)} ${last4.slice(2)}`
  }

  const handleVerify = () => {
    if (otp.length < 6) return
    setLoading(true)
    
    // Sprint 2: UI only
    setTimeout(() => {
      setLoading(false)
      if (otp === '111111') { // Mock success for testing
        router.push('/auth/profile-setup')
      } else {
        setError('Kod noto\'g\'ri')
        setAttempts(a => a + 1)
        setOtp('')
      }
    }, 800)
  }

  const handleOtpChange = (value: string) => {
    setOtp(value)
    setError('')
    if (value.length === 6) {
      // Small delay to allow user to see the last digit filled
      setTimeout(() => handleVerify(), 100)
    }
  }

  const handleResend = () => {
    setSeconds(300)
    setOtp('')
    setError('')
    setAttempts(0)
    openTelegram()
  }

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={24} color={tokens.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.top}>
        <Text style={styles.title}>Tasdiqlash kodi</Text>
        <Text style={styles.subtitle}>
          Telegram'ga yuborilgan 6 raqamli kodni kiriting
        </Text>
        <Text style={styles.maskedPhone}>{formatMaskedPhone()}</Text>
      </View>

      <View style={styles.otpArea}>
        <OtpInput
          value={otp}
          onChange={handleOtpChange}
          error={!!error}
          disabled={attempts >= 3}
        />
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={styles.timer}>
        {seconds > 0 ? (
          <Text style={styles.timerText}>
            Qayta yuborish: {formatTime(seconds)}
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendText}>Qayta yuborish</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bottom}>
        <PrimaryButton
          label="Tasdiqlash"
          onPress={handleVerify}
          loading={loading}
          disabled={otp.length < 6 || attempts >= 3}
        />
        {attempts >= 3 && (
          <Text style={styles.lockoutText}>
            Juda ko'p urinish. Yangi kod so'rang.
          </Text>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.white,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  top: {
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: tokens.colors.text,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: tokens.colors.textMuted,
    marginTop: 8,
  },
  maskedPhone: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: tokens.colors.primary,
    marginTop: 4,
  },
  otpArea: {
    marginTop: 40,
    paddingHorizontal: 24,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: tokens.colors.primaryDark,
    marginTop: 8,
    textAlign: 'center',
  },
  timer: {
    marginTop: 24,
    alignItems: 'center',
  },
  timerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: tokens.colors.textMuted,
  },
  resendText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: tokens.colors.primary,
  },
  bottom: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  lockoutText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: tokens.colors.primaryDark,
    textAlign: 'center',
    marginTop: 12,
  },
})
