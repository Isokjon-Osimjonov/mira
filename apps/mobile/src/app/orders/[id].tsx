import React, { useState, useEffect, useCallback, Fragment } from 'react'
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Ionicons, Feather } from '@expo/vector-icons'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { orderService } from '../../services/order.service'
import { tokens } from '../../lib/tokens'
import { formatKRW, formatUZS, formatCountdown, krwToUzs } from '../../lib/price'
import { useAuthStore } from '../../lib/auth-store'
import { useExchangeStore } from '../../lib/exchange-store'
import api from '../../lib/api'

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

const STEPS = [
  { key: 'PENDING_PAYMENT', label: "To'lov" },
  { key: 'PAYMENT_CONFIRMED', label: 'Tasdiqlandi' },
  { key: 'PACKING', label: 'Tayyorlanmoqda' },
  { key: 'SHIPPED', label: "Jo'natildi" },
  { key: 'DELIVERED', label: 'Yetkazildi' },
]

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || { label: status, bg: '#F3F4F6', color: '#374151' }
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg, marginTop: 4 }]}>
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  )
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams()
  const customer = useAuthStore((s) => s.customer)
  const exchangeRate = useExchangeStore((s) => s.rate)
  const isUZB = customer?.phoneRegion === 'UZB'
  const showUzs = isUZB
  const queryClient = useQueryClient()

  const formatPrice = (amount: number, region?: 'UZB' | 'KOR') => {
    if (region === 'UZB') {
      return `₩${Math.round(amount).toLocaleString('ko-KR')}` 
    }
    return `₩${Math.round(amount).toLocaleString('ko-KR')}`
  }

  const {
    data: order,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getOrderById(id as string),
    enabled: !!id,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return ['PENDING_PAYMENT', 'PAYMENT_REJECTED', 'PAYMENT_SUBMITTED'].includes(status ?? '')
        ? 15000
        : false
    },
  })

  const [timeLeft, setTimeLeft] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [receiptModalVisible, setReceiptModalVisible] = useState(false)

  useEffect(() => {
    if (!order?.paymentDeadline) return
    const update = () => {
      const diff = new Date(order.paymentDeadline!).getTime() - Date.now()
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [order?.paymentDeadline])

  const handleUploadReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (result.canceled) return
    setIsUploading(true)
    try {
      // Step 1: Upload to Cloudinary
      const formData = new FormData()
      formData.append('receipt', {
        uri: result.assets[0].uri,
        name: 'receipt.jpg',
        type: 'image/jpeg',
      } as any)

      const uploadRes = await api.post('/upload/receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const receiptUrl = uploadRes.data.data.url

      // Step 2: Link to order
      const totalKrw = Number(order?.totalAmount ?? 0)
      await orderService.uploadReceipt(
        id as string,
        receiptUrl,
        isUZB ? Math.round(totalKrw * exchangeRate) : totalKrw,
        isUZB ? 'UZS' : 'KRW'
      )
      await refetch()
      Alert.alert('✓', 'Chek muvaffaqiyatli yuklandi')
    } catch (err: any) {
      Alert.alert('Xatolik', err?.response?.data?.error?.message ?? 'Xatolik')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    Alert.alert('Bekor qilish', 'Buyurtmani bekor qilmoqchimisiz?', [
      { text: "Yo'q", style: 'cancel' },
      {
        text: 'Ha',
        style: 'destructive',
        onPress: async () => {
          setIsCanceling(true)
          try {
            await orderService.cancelOrder(id as string)
            await refetch()
            Alert.alert('✓', 'Buyurtma bekor qilindi')
          } catch (err: any) {
            Alert.alert('Xatolik', err?.response?.data?.error?.message ?? 'Xatolik')
          } finally {
            setIsCanceling(false)
          }
        },
      },
    ])
  }

  const handleRefundRequest = () => {
    Alert.prompt(
      "Qaytarish so'rovi",
      'Qaytarish sababini kiriting',
      [
        { text: 'Bekor', style: 'cancel' },
        {
          text: 'Yuborish',
          onPress: async (reason?: string) => {
            if (!reason?.trim()) return
            setIsRefunding(true)
            try {
              await api.post(`/orders/${id}/request-refund`, { reason: reason.trim() })
              await refetch()
              Alert.alert('✓', "So'rov yuborildi")
            } catch (err: any) {
              Alert.alert('Xatolik', err?.response?.data?.error?.message ?? 'Xatolik')
            } finally {
              setIsRefunding(false)
            }
          },
        },
      ],
      'plain-text'
    )
  }

  const infoRow = (label: string, value: string | null) => {
    if (!value) return null
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    )
  }

  const summaryRow = (label: string, value: string, bold = false, color?: string) => (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && { fontWeight: '500' }]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && { fontWeight: '500' }, color ? { color } : {}]}>
        {value}
      </Text>
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

  const currentIdx = STEPS.findIndex(
    (s) =>
      s.key === order.status ||
      (order.status === 'PAYMENT_SUBMITTED' && s.key === 'PENDING_PAYMENT') ||
      (order.status === 'PAYMENT_REJECTED' && s.key === 'PENDING_PAYMENT')
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={tokens.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>#{order.orderNumber}</Text>
          <StatusBadge status={order.status} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* PAYMENT COUNTDOWN */}
        {(order.status === 'PENDING_PAYMENT' || order.status === 'PAYMENT_REJECTED') &&
          order.paymentDeadline && (
            <View style={styles.countdownBox}>
              <View style={styles.countdownInner}>
                <View style={styles.countdownHeader}>
                  <Text style={styles.countdownLabel}>⏰ To'lov muddati:</Text>
                  <Text style={styles.countdownValue}>
                    {formatCountdown(order.paymentDeadline)}
                  </Text>
                </View>
                <Text style={styles.countdownSub}>Muddat o'tsa buyurtma bekor qilinadi</Text>
              </View>
            </View>
          )}

        {order.status === 'PAYMENT_REJECTED' && (
          <View style={styles.rejectBox}>
            <Text style={styles.rejectText}>
              {order.paymentRejectedReason ?? "To'lov rad etildi"}
            </Text>
          </View>
        )}

        {/* STATUS TIMELINE */}
        {order.status !== 'CANCELED' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Buyurtma holati</Text>
            <View style={styles.timelineContainer}>
              {STEPS.map((step, idx) => (
                <Fragment key={step.key}>
                  <View style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineCircle,
                        idx < currentIdx ||
                        (idx === STEPS.length - 1 && order.status === 'DELIVERED')
                          ? styles.circleDone
                          : idx === currentIdx
                            ? styles.circleActive
                            : styles.circleNext,
                      ]}
                    >
                      {idx < currentIdx ||
                      (idx === STEPS.length - 1 && order.status === 'DELIVERED') ? (
                        <Feather name="check" size={14} color="white" />
                      ) : (
                        <View style={idx === currentIdx ? styles.dotActive : styles.dotNext} />
                      )}
                    </View>
                    <Text
                      style={styles.timelineLabel}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {step.label}
                    </Text>
                  </View>
                  {idx < STEPS.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        idx < currentIdx && { backgroundColor: tokens.colors.primary },
                      ]}
                    />
                  )}
                </Fragment>
              ))}
            </View>
          </View>
        )}

        {isUZB && order.estimatedDeliveryStart && (
          <View style={styles.deliveryEstimateCard}>
            <Feather name="calendar" size={16} color={tokens.colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.deliveryEstimateLabel}>Taxminiy yetkazib berish</Text>
              <Text style={styles.deliveryEstimateDate}>
                {order.estimatedDeliveryStart.split('T')[0]} —{' '}
                {order.estimatedDeliveryEnd?.split('T')[0]}
              </Text>
            </View>
          </View>
        )}

        {/* ORDER ITEMS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mahsulotlar</Text>
          {order.items?.map((item: any) => (
            <View key={item.id} style={styles.orderItem}>
              <Image source={item.imageUrl} style={styles.itemImage} contentFit="cover" />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text style={styles.itemQty}>{item.quantity} ta</Text>
              </View>
              <Text style={styles.itemPrice}>{formatKRW(item.unitPrice)}</Text>
            </View>
          ))}
        </View>

        {/* PRICE BREAKDOWN */}
        <View style={[styles.section, { marginTop: 2 }]}>
          {summaryRow('Mahsulotlar:', formatKRW(Number(order.subtotal ?? 0)))}
          {Number(order.cargoFee) > 0 &&
            summaryRow('Yetkazib berish:', formatKRW(Number(order.cargoFee)))}
          {/* After subtotal row, before cargo: */}
          {order.couponCode && Number(order.discountAmount) > 0 && (
            <View style={styles.priceRow}>
              <View style={styles.priceRowLeft}>
                <Feather name="tag" size={12} color={tokens.colors.success} />
                <Text style={[styles.priceLabel, { color: tokens.colors.success }]}>
                  Kupon ({order.couponCode})
                </Text>
              </View>
              <Text style={[styles.priceValue, { color: tokens.colors.success }]}>
                −{formatPrice(order.discountAmount, order.deliveryRegion as any)}
              </Text>
            </View>
          )}
          <View style={styles.priceDivider} />
          {summaryRow('Jami:', formatKRW(Number(order.totalAmount)), true)}
          {showUzs && (
            <Text style={styles.totalUzs}>
              ≈ {formatUZS(krwToUzs(Number(order.totalAmount), exchangeRate))}
            </Text>
          )}
          {/* After total row, savings summary: */}
          {Number(order.discountAmount) > 0 && (
            <View
              style={[
                styles.priceRow,
                {
                  borderTopWidth: 0.5,
                  borderTopColor: tokens.colors.success,
                  borderStyle: 'dashed',
                  marginTop: 4,
                  paddingTop: 6,
                },
              ]}
            >
              <Text style={[styles.priceLabel, { color: tokens.colors.success, fontWeight: '500' }]}>
                Tejadingiz
              </Text>
              <Text style={[styles.priceValue, { color: tokens.colors.success, fontWeight: '500' }]}>
                {formatPrice(order.discountAmount, order.deliveryRegion as any)}
              </Text>
            </View>
          )}
        </View>

        {/* DELIVERY ADDRESS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yetkazib berish manzili</Text>
          {infoRow('Ism:', order.deliveryFullName)}
          {infoRow('Tel:', order.deliveryPhone)}
          {infoRow('Manzil:', order.deliveryAddressLine1)}
          {infoRow('', order.deliveryAddressLine2)}
          {infoRow('Indeks:', order.deliveryPostalCode)}
        </View>

        {/* TRACKING */}
        {order.trackingNumber && (order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kuzatuv</Text>
            <View style={styles.trackingRow}>
              <Feather
                name="truck"
                size={16}
                color={tokens.colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.trackingText}>{order.trackingNumber}</Text>
            </View>
          </View>
        )}

        {/* RECEIPT SECTION */}
        {['PENDING_PAYMENT', 'PAYMENT_REJECTED', 'PAYMENT_SUBMITTED', 'PAYMENT_CONFIRMED'].includes(
          order.status
        ) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>To'lov cheki</Text>
            {order.paymentReceiptUrl && (
              <View style={{ marginBottom: 12 }}>
                <TouchableOpacity onPress={() => setReceiptModalVisible(true)}>
                  <Image
                    source={order.paymentReceiptUrl}
                    style={styles.receiptImage}
                    contentFit="cover"
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.zoomText}>Kattalashtirish</Text>
                    <Feather name="maximize-2" size={14} color={styles.zoomText.color} />
                  </View>
                </TouchableOpacity>
                {order.status === 'PAYMENT_SUBMITTED' && (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Chekni almashtirmoqchimisiz?',
                        "Yangi chek yuklaganingizda oldingisi o'chiriladi.",
                        [
                          { text: 'Bekor qilish', style: 'cancel' },
                          { text: "O'zgartirish", onPress: handleUploadReceipt },
                        ]
                      )
                    }}
                    style={[styles.uploadBtn, { marginTop: 12 }]}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator color={tokens.colors.primary} />
                    ) : (
                      <>
                        <Feather name="refresh-cw" size={16} color={tokens.colors.primary} />
                        <Text style={styles.uploadText}>Chekni o'zgartirish</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {order.status === 'PAYMENT_REJECTED' && (
              <Text style={styles.receiptHint}>Chek rad etildi. Yangi chek yuklang</Text>
            )}

            {['PENDING_PAYMENT', 'PAYMENT_REJECTED'].includes(order.status) && (
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
                    <Text style={styles.uploadText}>
                      {order.paymentReceiptUrl ? 'Qayta yuklash' : 'Chekni yuklash'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* REFUND REQUEST */}
        {order.status === 'DELIVERED' && !order.refundRequestedAt && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Qaytarish</Text>
            <Text style={styles.refundDesc}>
              Mahsulot bilan muammo bo'lsa qaytarish so'rovini yuboring
            </Text>
            <TouchableOpacity
              onPress={handleRefundRequest}
              style={styles.refundBtn}
              disabled={isRefunding}
            >
              {isRefunding ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <Text style={styles.refundBtnText}>Qaytarish so'rovi</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {order.refundRequestedAt && (
          <View style={{ marginHorizontal: 24, marginTop: 12 }}>
            <View style={styles.refundSuccessBox}>
              <Text style={styles.refundSuccessText}>✓ Qaytarish so'rovi yuborildi</Text>
            </View>
          </View>
        )}

        {/* CANCEL BUTTON */}
        {['PENDING_PAYMENT', 'PAYMENT_REJECTED'].includes(order.status) && (
          <View style={styles.cancelWrapper}>
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

      {/* RECEIPT MODAL */}
      <Modal
        visible={receiptModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            activeOpacity={1}
            onPress={() => setReceiptModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setReceiptModalVisible(false)}
            >
              <Feather name="x" size={24} color="white" />
            </TouchableOpacity>
            {order?.paymentReceiptUrl && (
              <Image
                source={order.paymentReceiptUrl}
                style={styles.modalImage}
                contentFit="contain"
              />
            )}
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: tokens.colors.background,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: tokens.colors.text,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  countdownBox: {
    marginHorizontal: 24,
    marginTop: 12,
  },
  countdownInner: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
  },
  countdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 13,
    color: '#92400E',
  },
  countdownValue: {
    fontSize: 20,
    fontWeight: '500',
    color: '#C2410C',
  },
  countdownSub: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 4,
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
  },
  section: {
    marginHorizontal: 24,
    marginTop: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: tokens.colors.text,
    marginBottom: 16,
  },
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineItem: {
    alignItems: 'center',
    width: 57,
  },
  timelineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleDone: {
    backgroundColor: tokens.colors.primary,
  },
  circleActive: {
    borderWidth: 2,
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight,
  },
  circleNext: {
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.colors.primary,
  },
  dotNext: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  timelineLabel: {
    fontSize: 7,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 1,
  },
  deliveryEstimateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 24,
    marginTop: 12,
  },
  deliveryEstimateLabel: {
    fontSize: 12,
    color: tokens.colors.textMuted,
  },
  deliveryEstimateDate: {
    fontSize: 14,
    fontWeight: '500',
    color: tokens.colors.text,
    marginTop: 2,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: tokens.colors.background,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  itemName: {
    fontSize: 13,
    color: tokens.colors.text,
  },
  itemQty: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: tokens.colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  infoLabel: {
    width: 70,
    fontSize: 12,
    color: tokens.colors.textMuted,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: tokens.colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: tokens.colors.textMuted,
  },
  summaryValue: {
    fontSize: 13,
    color: tokens.colors.text,
  },
  priceDivider: {
    height: 0.5,
    backgroundColor: tokens.colors.border,
    marginVertical: 8,
  },
  totalUzs: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingText: {
    fontSize: 14,
    color: tokens.colors.text,
  },
  receiptImage: {
    height: 160,
    borderRadius: 8,
  },
  zoomText: {
    fontSize: 11,
    color: tokens.colors.primary,
    marginTop: 4,
  },
  receiptHint: {
    fontSize: 12,
    color: tokens.colors.error,
    marginTop: 8,
    marginBottom: 4,
  },
  uploadBtn: {
    marginTop: 12,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: tokens.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 13,
    color: tokens.colors.primary,
  },
  refundDesc: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginBottom: 12,
  },
  refundBtn: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  refundBtnText: {
    fontSize: 13,
    color: '#DC2626',
  },
  refundSuccessBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 24,
    marginTop: 12,
  },
  refundSuccessText: {
    fontSize: 13,
    color: '#DC2626',
  },
  cancelWrapper: {
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 40,
  },
  cancelBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelText: {
    fontSize: 14,
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  priceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: tokens.colors.textMuted,
  },
  priceValue: {
    fontSize: 14,
    color: tokens.colors.text,
  },
})
