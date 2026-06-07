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
import { tokens } from '../../lib/tokens'
import OtpInput from '../../components/ui/OtpInput'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { authService } from '../../services/auth.service'
import { useAuthStore } from '../../lib/auth-store'

export default function OtpScreen() {
  const { phone, region, deepLink } = useLocalSearchParams<{
    phone:    string
    region:   string
    deepLink: string
  }>()

  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [seconds, setSeconds] = useState(300)
  const [attempts, setAttempts] = useState(0)

  // Guard: if params missing redirect back
  useEffect(() => {
    if (!phone || !deepLink) {
      router.replace('/auth/login')
    }
  }, [phone, deepLink])

  const extractToken = (deepLink: string): string => {
    try {
      const url = new URL(deepLink)
      const token = url.searchParams.get('start') ?? ''
      if (token.length !== 64) {
        console.warn('Token length unexpected:', token.length)
      }
      return token
    } catch {
      return deepLink
    }
  }

  // Cast region safely
  const safeRegion: 'UZB' | 'KOR' = region === 'KOR' ? 'KOR' : 'UZB'

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
    if (!deepLink) return
    try {
      // Server returns https://t.me/... URL
      // Try tg:// deep link first for native app
      // Fall back to https:// which opens Telegram or browser
      const canOpenTg = await Linking.canOpenURL('tg://')
      if (canOpenTg) {
        // Convert https://t.me/BOT?start=TOKEN
        // to tg://resolve?domain=BOT&start=TOKEN
        const urlObj = new URL(deepLink)
        const botUsername = urlObj.pathname.replace('/', '')
        const startToken = urlObj.searchParams.get('start') ?? ''
        const nativeUrl =
          `tg://resolve?domain=${botUsername}&start=${startToken}`
        await Linking.openURL(nativeUrl)
      } else {
        // Telegram not installed — open https link
        // Opens in browser or App Store
        await Linking.openURL(deepLink)
        setError('Telegram topilmadi. SMS orqali kod yuboriladi.')
      }
    } catch {
      setError('Telegram ochilmadi. Qayta urinib ko\'ring.')
    }
  }

  const formatMaskedPhone = () => {
    const last4 = phone?.slice(-4) || 'xxxx'
    if (safeRegion === 'UZB') {
      return `+998 ** *** ${last4.slice(0, 2)} ${last4.slice(2)}`
    }
    return `+82 ** **** ${last4.slice(0, 2)} ${last4.slice(2)}`
  }

  const handleVerify = async () => {
    if (otp.length < 6 || attempts >= 3) return
    setLoading(true)
    setError('')
    try {
      const startToken = extractToken(deepLink)

      const result = await authService.verifyOtp({
        phone,
        token: startToken,
        otp,
        region: safeRegion,
      })
      const { accessToken, refreshToken, customer, isNewCustomer } = result
      await useAuthStore.getState().saveRefresh(refreshToken)
      useAuthStore.getState().setAuth(accessToken, customer)

      if (isNewCustomer || !customer.firstName) {
        router.replace('/auth/profile-setup')
      } else {
        router.replace('/(tabs)/home')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= 3) {
        setError("Juda ko'p urinish. Yangi kod so'rang.")
      } else {
        setError(msg ?? "Noto'g'ri kod. Qayta urinib ko'ring.")
      }
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (value: string) => {
    setOtp(value)
    setError('')
    if (value.length === 6) {
      handleVerify()
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
          <Text style={{ fontSize: 24, color: tokens.colors.text }}>‹</Text>
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
