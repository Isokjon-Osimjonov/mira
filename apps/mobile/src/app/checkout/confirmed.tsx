import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { tokens } from '../../lib/tokens'
import { orderService } from '../../services/order.service'
import { productService } from '../../services/product.service'
import { formatKRW } from '../../lib/price'
import PrimaryButton from '../../components/ui/PrimaryButton'

export default function OrderConfirmedScreen() {
  const { orderId, paymentInfoJson } = useLocalSearchParams<{
    orderId: string
    paymentInfoJson?: string
  }>()

  const { data: paymentSettings } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: productService.getPaymentInfo,
    staleTime: 10 * 60 * 1000,
  })

  const paymentInfo = paymentInfoJson ? JSON.parse(paymentInfoJson) : null

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getOrderById(orderId),
    enabled: !!orderId,
  })

  // Payment countdown
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!order?.paymentDeadline) return
    const updateTimer = () => {
      const diff = new Date(order.paymentDeadline!).getTime() - Date.now()
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)))
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [order?.paymentDeadline])

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const infoRow = (label: string, value: string | null) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '...'}</Text>
    </View>
  )

  if (!order) return null

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.main}>
          <View style={styles.successCircle}>
            <Feather name="check-circle" size={40} color={tokens.colors.primary} />
          </View>

          <Text style={styles.title}>Buyurtma qabul qilindi!</Text>
          <Text style={styles.orderNumber}>Buyurtma #{order.orderNumber}</Text>

          <View style={styles.divider} />

          {order.status === 'PENDING_PAYMENT' ? (
            <>
              {timeLeft !== null && timeLeft > 0 && (
                <View style={styles.paymentCard}>
                  <Text style={styles.paymentLabel}>To'lov muddati:</Text>
                  <Text style={styles.countdown}>{formatCountdown(timeLeft)}</Text>
                  <Text style={styles.paymentSub}>ichida to'lovni amalga oshiring</Text>
                </View>
              )}

              {timeLeft === 0 && (
                <View style={[styles.paymentCard, { backgroundColor: tokens.colors.error + '10' }]}>
                  <Text style={[styles.paymentSub, { color: tokens.colors.error }]}>
                    To'lov muddati tugadi
                  </Text>
                </View>
              )}
            </>
          ) : order.status === 'PAYMENT_SUBMITTED' ? (
            <View style={[styles.paymentCard, { backgroundColor: tokens.colors.primary + '10' }]}>
              <Feather
                name="check-circle"
                size={24}
                color={tokens.colors.primary}
                style={{ marginBottom: 8 }}
              />
              <Text
                style={[
                  styles.paymentSub,
                  { color: tokens.colors.primary, fontSize: 14, fontWeight: '500' },
                ]}
              >
                Chek yuklandi, tasdiqlash kutilmoqda
              </Text>
            </View>
          ) : null}

          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>To'lov ma'lumotlari</Text>
            {paymentInfo?.method === 'KOREAN_BANK' && (
              <>
                {infoRow(
                  'Hisob raqam:',
                  paymentInfo.accountNumber ?? paymentSettings?.kor.bankNumber
                )}
                {infoRow('Bank:', paymentInfo.bankName ?? paymentSettings?.kor.bankName)}
                {infoRow('Egasi:', paymentInfo.holderName ?? paymentSettings?.kor.bankHolder)}
              </>
            )}
            {paymentInfo?.method === 'UZB_BANK' && (
              <>
                {infoRow('Hisob:', paymentInfo.accountNumber ?? paymentSettings?.uzb.bankNumber)}
                {infoRow('Bank:', paymentInfo.bankName ?? paymentSettings?.uzb.bankName)}
                {infoRow('Egasi:', paymentInfo.holderName ?? paymentSettings?.uzb.bankHolder)}
              </>
            )}
            {paymentInfo?.method === 'E9PAY' && (
              <>
                {infoRow('E9Pay:', paymentInfo.accountNumber ?? paymentSettings?.e9pay.account)}
                {infoRow('Egasi:', paymentInfo.holderName ?? paymentSettings?.e9pay.name)}
              </>
            )}
            {!paymentInfo && (
              <>
                {infoRow(
                  'Hisob raqam:',
                  paymentSettings?.uzb.bankNumber ?? paymentSettings?.kor.bankNumber ?? null
                )}
                {infoRow(
                  'Bank:',
                  paymentSettings?.uzb.bankName ?? paymentSettings?.kor.bankName ?? null
                )}
              </>
            )}
            <View
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTopWidth: 0.5,
                borderTopColor: tokens.colors.border,
              }}
            >
              <Text style={styles.amountText}>To'lov miqdori: {formatKRW(order.totalAmount)}</Text>
            </View>
          </View>

          <Text style={styles.botNotice}>Telegram botimiz orqali to'lov haqida xabar olasiz</Text>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <PrimaryButton label="Buyurtmalarimni ko'rish" onPress={() => router.replace('/orders')} />
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)/home')}>
          <Text style={styles.homeBtnText}>Bosh sahifaga qaytish</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
    marginTop: 20,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  divider: {
    width: '100%',
    height: 0.5,
    backgroundColor: tokens.colors.border,
    marginTop: 24,
  },
  paymentCard: {
    width: '100%',
    backgroundColor: tokens.colors.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
  },
  countdown: {
    fontSize: 28,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.primary,
    marginTop: 4,
  },
  paymentSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginTop: 4,
  },
  instructionsBox: {
    width: '100%',
    backgroundColor: tokens.colors.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
  },
  instructionDetail: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
  },
  instructionDetailSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  amountText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  botNotice: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  homeBtn: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  homeBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.primary,
  },
})
