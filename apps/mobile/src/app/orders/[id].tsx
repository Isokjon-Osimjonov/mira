import React, { useState, useEffect, useCallback } from 'react'
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { orderService } from '../../services/order.service'
import { uploadService } from '../../services/upload.service'
import * as ImagePicker from 'expo-image-picker'
import { tokens } from '../../lib/tokens'
import { formatKRW, formatUZS, formatDate, formatCountdown, krwToUzs } from '../../lib/price'
import { useAuthStore } from '../../lib/auth-store'
import { useExchangeStore } from '../../lib/exchange-store'
import api from '../../lib/api'
import StatusBadge from '../../components/ui/StatusBadge'

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  PENDING_PAYMENT: { label: "To'lov kutilmoqda", bg: '#FFF7ED', color: '#C2410C' },
  PAYMENT_SUBMITTED: { label: 'Tekshirilmoqda', bg: '#FEFCE8', color: '#A16207' },
  PAYMENT_REJECTED: { label: 'Rad etildi', bg: '#FEF2F2', color: '#DC2626' },
  PAYMENT_CONFIRMED: { label: 'Tasdiqlandi', bg: '#EFF6FF', color: '#2563EB' },
  PACKING: { label: 'Tayyorlanmoqda', bg: '#F5F3FF', color: '#7C3AED' },
  SHIPPED: { label: "Yo'lda", bg: '#F0F9FF', color: '#0369A1' },
  DELIVERED: { label: 'Yetkazildi', bg: '#F0FDF4', color: '#16A34A' },
  CANCELED: { label: 'Bekor qilindi', bg: '#FEF2F2', color: '#DC2626' },
}

const STEPS = ['PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED']

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams()
  const customer = useAuthStore(s => s.customer)
  const exchangeRate = useExchangeStore(s => s.rate)
  const showUzs = customer?.phoneRegion === 'UZB'
  const queryClient = useQueryClient()

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getOrderById(id as string),
    enabled: !!id,
    staleTime: 0,
    refetchInterval: (data) =>
      data?.status === 'PENDING_PAYMENT' || data?.status === 'PAYMENT_REJECTED'
        ? 15000 : false,
  })

  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)

  // Focus effect for refetching
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  // Countdown timer
  useEffect(() => {
    if (!order?.paymentExpiresAt) return
    const update = () => {
      const diff = new Date(order.paymentExpiresAt!).getTime() - Date.now()
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [order?.paymentExpiresAt])

  const handleUploadReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (result.canceled) return
    setIsUploading(true)
    try {
      // 1. Upload to cloudinary
      const localUri = result.assets[0].uri
      const receiptUrl = await uploadService.uploadReceipt(localUri)

      // 2. Link to order
      await orderService.uploadReceipt(id as string, {
        receiptUrl,
        paymentAmount: Number(order?.totalAmount ?? 0),
        paymentCurrency: 'KRW',
      })
      
      await refetch()
      Alert.alert('✓', 'Chek muvaffaqiyatli yuklandi')
    } catch (err: any) {
      Alert.alert('Xatolik', err?.response?.data?.error?.message ?? 'Yuklashda xatolik')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    Alert.alert(
      'Bekor qilish',
      'Buyurtmani bekor qilmoqchimisiz?',
      [
        { text: 'Yo\'q', style: 'cancel' },
        {
          text: 'Ha, bekor qilish',
          style: 'destructive',
          onPress: async () => {
            setIsCanceling(true)
            try {
              await orderService.cancelOrder(id as string)
              await refetch()
              Alert.alert('✓', 'Buyurtma bekor qilindi')
            } catch (err: any) {
              Alert.alert('Xatolik', err?.response?.data?.error?.message ?? 'Xatolik yuz berdi')
            } finally {
              setIsCanceling(false)
            }
          }
        }
      ]
    )
  }

  const infoRow = (label: string, value: string) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )

  const priceRow = (label: string, value: string, bold?: boolean, color?: string) => (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, bold && styles.boldText]}>{label}</Text>
      <Text style={[styles.priceValue, bold && styles.boldText, color ? { color } : {}]}>{value}</Text>
    </View>
  )

  if (isLoading || !order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const currentStepIndex = STEPS.indexOf(order.status)
  const statusConfig = STATUS_MAP[order.status] || { label: order.status, bg: tokens.colors.background, color: tokens.colors.text }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>#{order.orderNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* PAYMENT COUNTDOWN */}
        {(order.status === 'PENDING_PAYMENT' || order.status === 'PAYMENT_REJECTED') && order.paymentExpiresAt && (
          <View style={styles.countdownBox}>
            <View style={styles.countdownRow}>
              <Text style={styles.countdownLabel}>⏰ To'lov muddati:</Text>
              <Text style={styles.countdownValue}>{formatCountdown(order.paymentExpiresAt)}</Text>
            </View>
            <Text style={styles.countdownSub}>Muddat o'tsa buyurtma bekor qilinadi</Text>
          </View>
        )}

        {order.status === 'PAYMENT_REJECTED' && (
          <View style={styles.rejectBox}>
            <Text style={styles.rejectText}>❌ Rad etildi: {order.paymentRejectedReason ?? 'Sabab ko\'rsatilmadi'}</Text>
          </View>
        )}

        {/* STATUS TIMELINE */}
        {order.status !== 'CANCELED' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Buyurtma holati</Text>
            <View style={styles.timelineRow}>
              {STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIndex || order.status === 'DELIVERED'
                const isCurrent = idx === currentStepIndex && order.status !== 'DELIVERED'
                
                return (
                  <React.Fragment key={step}>
                    <View style={styles.timelineItem}>
                      <View style={[
                        styles.timelineCircle,
                        isCompleted && styles.circleCompleted,
                        isCurrent && styles.circleCurrent,
                        !isCompleted && !isCurrent && styles.circleFuture
                      ]}>
                        {isCompleted ? (
                          <Feather name="check" size={14} color={tokens.colors.white} />
                        ) : isCurrent ? (
                          <View style={styles.circleDotActive} />
                        ) : (
                          <View style={styles.circleDotInactive} />
                        )}
                      </View>
                    </View>
                    {idx < STEPS.length - 1 && (
                      <View style={[styles.timelineLine, isCompleted && styles.lineCompleted]} />
                    )}
                  </React.Fragment>
                )
              })}
            </View>
            <View style={styles.timelineLabels}>
               <Text style={styles.stepMiniLabel}>To'lov</Text>
               <Text style={styles.stepMiniLabel}>Tasdiq</Text>
               <Text style={styles.stepMiniLabel}>Tayyorlov</Text>
               <Text style={styles.stepMiniLabel}>Yo'lda</Text>
               <Text style={styles.stepMiniLabel}>Yetkazildi</Text>
            </View>
          </View>
        )}

        {/* ITEMS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mahsulotlar</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.orderItem}>
              <Image 
                source={item.imageUrl} 
                style={styles.itemImage} 
                contentFit="cover"
              />
              <View style={styles.itemMain}>
                <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                <Text style={styles.itemQty}>{item.quantity} ta</Text>
              </View>
              <Text style={styles.itemPrice}>{formatKRW(Number(item.unitPrice))}</Text>
            </View>
          ))}
        </View>

        {/* PRICE BREAKDOWN */}
        <View style={[styles.section, { marginTop: 2 }]}>
          {priceRow("Mahsulotlar:", formatKRW(Number(order.totalAmount + (order.discountAmount ?? 0) - (order.cargoFee ?? 0))))}
          {(order.cargoFee ?? 0) > 0 && priceRow("Kargo:", formatKRW(Number(order.cargoFee)))}
          {(order.discountAmount ?? 0) > 0 && priceRow("Chegirma:", "- " + formatKRW(Number(order.discountAmount)), false, tokens.colors.success)}
          <View style={styles.divider} />
          {priceRow("Jami:", formatKRW(Number(order.totalAmount)), true)}
          {showUzs && (
            <Text style={styles.totalUzs}>
              ≈ {formatUZS(krwToUzs(Number(order.totalAmount), exchangeRate))}
            </Text>
          )}
        </View>

        {/* DELIVERY ADDRESS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yetkazib berish manzili</Text>
          {infoRow("Ism:", order.address.recipientName)}
          {infoRow("Tel:", order.address.phone)}
          {order.address.addressLine1 && infoRow("Manzil:", order.address.addressLine1)}
          {order.address.addressLine2 && infoRow("", order.address.addressLine2)}
          {order.address.postalCode && infoRow("Indeks:", order.address.postalCode)}
        </View>

        {/* RECEIPT SECTION */}
        {(order.status === 'PENDING_PAYMENT' || order.status === 'PAYMENT_REJECTED') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>To'lov cheki</Text>
            
            {order.paymentReceiptUrl && (
              <View>
                <Text style={styles.receiptSuccess}>Chek yuklangan ✓</Text>
                <TouchableOpacity 
                  onPress={() => Linking.openURL(order.paymentReceiptUrl!)}
                  activeOpacity={0.8}
                >
                  <Image 
                    source={order.paymentReceiptUrl} 
                    style={styles.receiptPreview} 
                    contentFit="cover"
                  />
                  <Text style={styles.receiptZoom}>Kattalashtirish</Text>
                </TouchableOpacity>
              </View>
            )}

            {order.status === 'PAYMENT_REJECTED' && (
              <Text style={styles.receiptError}>Yangi chek yuklang</Text>
            )}

            <TouchableOpacity 
              onPress={handleUploadReceipt}
              style={styles.uploadBtn}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color={tokens.colors.primary} />
              ) : (
                <>
                  <Feather name="upload" size={16} color={tokens.colors.primary} />
                  <Text style={styles.uploadBtnText}>
                    {order.paymentReceiptUrl ? "Qayta yuklash" : "Chekni yuklash"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* CANCEL BUTTON */}
        {(order.status === 'PENDING_PAYMENT' || order.status === 'PAYMENT_REJECTED') && (
          <View style={styles.cancelContainer}>
            <TouchableOpacity 
              onPress={handleCancel}
              style={styles.cancelBtn}
              disabled={isCanceling}
            >
              {isCanceling ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <Text style={styles.cancelText}>Buyurtmani bekor qilish</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: tokens.colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
  },
  section: {
    backgroundColor: tokens.colors.white,
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: tokens.colors.text,
    marginBottom: 12,
    fontFamily: 'Inter_400Regular',
  },
  countdownBox: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
  },
  countdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  countdownLabel: {
    fontSize: 13,
    color: '#92400E',
    fontFamily: 'Inter_400Regular',
  },
  countdownValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#C2410C',
    fontFamily: 'Inter_400Regular',
  },
  countdownSub: {
    fontSize: 12,
    color: '#92400E',
    fontFamily: 'Inter_400Regular',
  },
  rejectBox: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
  },
  rejectText: {
    fontSize: 13,
    color: '#DC2626',
    fontFamily: 'Inter_400Regular',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timelineItem: {
    alignItems: 'center',
    zIndex: 2,
  },
  timelineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: tokens.colors.primary,
  },
  circleCurrent: {
    borderWidth: 2,
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight,
  },
  circleFuture: {
    backgroundColor: '#E5E7EB',
  },
  circleDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.colors.primary,
  },
  circleDotInactive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: -4,
  },
  lineCompleted: {
    backgroundColor: tokens.colors.primary,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 0,
  },
  stepMiniLabel: {
    fontSize: 8,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    width: 40,
    fontFamily: 'Inter_400Regular',
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: tokens.colors.background,
  },
  itemMain: {
    flex: 1,
    marginLeft: 10,
  },
  itemName: {
    fontSize: 13,
    color: tokens.colors.text,
    fontFamily: 'Inter_400Regular',
  },
  itemQty: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: tokens.colors.text,
    fontFamily: 'Inter_400Regular',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
  priceValue: {
    fontSize: 13,
    color: tokens.colors.text,
    fontFamily: 'Inter_400Regular',
  },
  boldText: {
    fontWeight: '500',
    color: tokens.colors.text,
  },
  divider: {
    height: 0.5,
    backgroundColor: tokens.colors.border,
    marginVertical: 10,
  },
  totalUzs: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    width: 80,
    fontFamily: 'Inter_400Regular',
  },
  infoValue: {
    fontSize: 13,
    color: tokens.colors.text,
    flex: 1,
    fontFamily: 'Inter_400Regular',
  },
  receiptSuccess: {
    fontSize: 13,
    color: tokens.colors.success,
    marginBottom: 8,
    fontFamily: 'Inter_400Regular',
  },
  receiptError: {
    fontSize: 13,
    color: tokens.colors.error,
    marginBottom: 8,
    fontFamily: 'Inter_400Regular',
  },
  receiptPreview: {
    width: 160,
    height: 120,
    borderRadius: 8,
    alignSelf: 'center',
  },
  receiptZoom: {
    fontSize: 11,
    color: tokens.colors.primary,
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  uploadBtn: {
    borderWidth: 1.5,
    borderColor: tokens.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadBtnText: {
    fontSize: 13,
    color: tokens.colors.primary,
    fontFamily: 'Inter_400Regular',
  },
  cancelContainer: {
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 40,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  cancelText: {
    fontSize: 14,
    color: '#DC2626',
    fontFamily: 'Inter_400Regular',
  },
})
