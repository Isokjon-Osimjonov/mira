import React, { useState, useEffect, useRef } from 'react'
import { ScrollView, View, Text, TextInput, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../lib/auth-store'
import { useCartStore } from '../../lib/cart-store'
import { tokens } from '../../lib/tokens'
import { addressService, type Address } from '../../services/address.service'
import { boxService, type Box } from '../../services/box.service'
import { cartService } from '../../services/cart.service'
import { orderService, type CheckoutResult } from '../../services/order.service'
import { uploadService } from '../../services/upload.service'
import * as ImagePicker from 'expo-image-picker'
import api from '../../lib/api'
import { useQuery } from '@tanstack/react-query'

const getBoxStatus = (box: Box, totalWeightG: number) => {
  const totalWeightKg = totalWeightG / 1000
  const maxKg = Number(box.maxWeightKg)

  if (totalWeightKg > maxKg) {
    return {
      status: 'too_small' as const,
      reason: `Juda kichik (${totalWeightKg.toFixed(1)}kg > ${maxKg}kg)`
    }
  }

  return {
    status: totalWeightKg <= maxKg ? 'available' as const : 'too_small' as const,
    reason: null
  }
}

const getRecommendedBoxId = (boxes: Box[], totalWeightG: number): string | null => {
  const totalWeightKg = totalWeightG / 1000
  const fitting = [...boxes]
    .sort((a, b) => Number(a.maxWeightKg) - Number(b.maxWeightKg))
    .find(box => Number(box.maxWeightKg) >= totalWeightKg)
  return fitting?.id ?? null
}

export default function SingleCheckoutScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const customer = useAuthStore((s) => s.customer)
  const region = customer?.phoneRegion || 'UZB'
  const cartItems = useCartStore((s) => s.cart?.items || [])

  const scrollRef = useRef<ScrollView>(null)

  // STATE 1 & 2
  const [orderPlaced, setOrderPlaced] = useState<{
    orderId: string
    orderNumber: string
    totalAmount: number
    bankDetails: CheckoutResult['paymentInfo'] | null
  } | null>(null)

  // -- STATE 1 VARIABLES --

  // Address
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)

  // Box (UZB only)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null)
  const [totalWeightG, setTotalWeightG] = useState(0)

  // Coupon
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<{ code: string; discountAmount: number } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'UZB_BANK' | 'KOREAN_BANK' | 'E9PAY'>(
    region === 'UZB' ? 'UZB_BANK' : 'KOREAN_BANK'
  )

  // Submission
  const [submitting, setSubmitting] = useState(false)

  // Payment settings for account numbers (fallback)
  const { data: paymentSettings } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const res = await api.get('/settings/payment-info')
      return res.data.data
    },
  })

  useEffect(() => {
    // Load addresses
    addressService.getAddresses().then(data => {
      setAddresses(data)
      const def = data.find(a => a.isDefault)
      if (def) setSelectedAddressId(def.id)
      else if (data.length > 0) setSelectedAddressId(data[0].id)
    })

    // Calculate total weight
    const weightG = cartItems.reduce((sum, item) => sum + (Number(item.weightGrams ?? 0) * item.quantity), 0)
    setTotalWeightG(weightG)

    // Load boxes (UZB only)
    if (region === 'UZB') {
      boxService.getBoxes().then(data => {
        setBoxes(data)
        const recommended = getRecommendedBoxId(data, weightG)
        if (recommended) {
          setSelectedBoxId(recommended)
        }
      })
    }
  }, [region, cartItems])

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const res = await cartService.validateCoupon(couponCode.trim())
      setCouponResult({
        code: couponCode.trim(),
        discountAmount: res.discountAmount
      })
      setCouponCode('')
    } catch (err: any) {
      Alert.alert('Kupon xatosi', err.response?.data?.error?.message ?? 'Kupon qo\'llanilmadi')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponResult(null)
    setCouponCode('')
  }

  const handleCreateOrder = async () => {
    if (!selectedAddressId) return
    if (region === 'UZB' && !selectedBoxId) return

    setSubmitting(true)
    try {
      const result = await orderService.checkout({
        addressId: selectedAddressId,
        boxId: selectedBoxId ?? undefined,
        paymentMethod,
        couponCode: couponResult?.code ?? undefined,
      })
      setOrderPlaced({
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        totalAmount: result.order.totalAmount,
        bankDetails: result.paymentInfo,
      })
    } catch (err: any) {
      Alert.alert('Xatolik', err.response?.data?.error?.message ?? 'Buyurtma yaratilmadi')
    } finally {
      setSubmitting(false)
    }
  }

  // -- STATE 2 VARIABLES --
  const [receiptUri, setReceiptUri] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    })

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReceiptUri(result.assets[0].uri)
      handleUploadReceipt(result.assets[0].uri)
    }
  }

  const handleUploadReceipt = async (uri: string) => {
    if (!orderPlaced) return
    setIsUploading(true)
    try {
      const receiptUrl = await uploadService.uploadReceipt(uri)
      // Since it's a bank transfer, passing the amount.
      // Payment currency is UZS if UZB, else KRW, but the backend accepts it.
      const paymentCurrency = region === 'UZB' ? 'UZS' : 'KRW'
      // Note: in a real scenario we'd use krwToUzs for UZS, but passing orderTotal is fine for backend receipt logic here.
      await orderService.uploadReceipt(
        orderPlaced.orderId,
        receiptUrl,
        Number(orderPlaced.totalAmount),
        paymentCurrency
      )
      setUploadSuccess(true)
      await useCartStore.getState().clearCart()
    } catch (err: any) {
      Alert.alert('Xatolik', 'Chekni yuklashda xatolik yuz berdi. Qaytadan urinib ko\'ring.')
      setReceiptUri(null)
    } finally {
      setIsUploading(false)
    }
  }

  // Calculate totals
  const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const couponDiscount = couponResult?.discountAmount ?? 0
  const selectedBox = boxes.find(b => b.id === selectedBoxId)
  const boxCost = selectedBox ? Number(selectedBox.costKrw) : 0

  if (orderPlaced) {
    // STATE 2: Receipt Upload
    const bankDetails = orderPlaced.bankDetails
    const bankName = bankDetails?.bankName || (region === 'UZB' ? paymentSettings?.uzb?.bankName : paymentSettings?.kor?.bankName) || 'Bank'
    const accountNumber = bankDetails?.accountNumber || (region === 'UZB' ? paymentSettings?.uzb?.bankNumber : paymentSettings?.kor?.bankNumber) || '---'
    const holderName = bankDetails?.holderName || (region === 'UZB' ? paymentSettings?.uzb?.bankHolder : paymentSettings?.kor?.bankHolder) || '---'

    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>Buyurtma qabul qilindi</Text>
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.section, styles.orderConfirmed]}>
            <Text style={styles.orderNumber}>Buyurtma: {orderPlaced.orderNumber}</Text>
            <Text style={styles.orderTotal}>To'lov summasi: ₩{Number(orderPlaced.totalAmount).toLocaleString('ko-KR')}</Text>
            <Text style={styles.orderNote}>Buyurtmangizni tasdiqlash uchun quyidagi hisobga to'lov qiling va chekni yuklang.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>To'lov rekvizitlari</Text>
            <View style={styles.bankCard}>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Bank:</Text>
                <Text style={styles.bankValue}>{bankName}</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Hisob raqam:</Text>
                <Text style={styles.referenceCode}>{accountNumber}</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Qabul qiluvchi:</Text>
                <Text style={styles.bankValue}>{holderName}</Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Jami summa:</Text>
                <Text style={styles.bankAmount}>₩{Number(orderPlaced.totalAmount).toLocaleString('ko-KR')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>To'lov cheki</Text>
            {uploadSuccess ? (
              <View style={styles.uploadedBadge}>
                <Feather name="check-circle" size={20} color={tokens.colors.success} />
                <Text style={styles.uploadedText}>Kvitansiya yuborildi</Text>
              </View>
            ) : isUploading ? (
              <View style={[styles.uploadButton, { borderColor: tokens.colors.border }]}>
                <ActivityIndicator color={tokens.colors.primary} />
                <Text style={[styles.uploadButtonText, { marginTop: 8, color: tokens.colors.textMuted }]}>Yuklanmoqda...</Text>
              </View>
            ) : (
              <Pressable style={styles.uploadButton} onPress={handlePickImage}>
                <Feather name="upload-cloud" size={24} color={tokens.colors.primary} style={{ marginBottom: 8 }} />
                <Text style={styles.uploadButtonText}>Chek rasmiga bosing yoki yuklang</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.viewOrdersButton, { marginTop: 16 }]}
              onPress={() => router.replace('/(tabs)/orders')}
            >
              <Text style={styles.viewOrdersText}>Buyurtmalarni ko'rish</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // STATE 1: Checkout Form
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={tokens.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Buyurtmani rasmiylashtirish</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1: ORDER ITEMS */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Mahsulotlar</Text>
          {cartItems.map(item => (
            <View key={item.productId} style={styles.orderItem}>
              <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.orderItemQty}>{item.quantity} ta</Text>
              <Text style={styles.orderItemPrice}>₩{(item.unitPrice * item.quantity).toLocaleString('ko-KR')}</Text>
            </View>
          ))}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Mahsulotlar jami</Text>
            <Text style={styles.subtotalValue}>₩{cartSubtotal.toLocaleString('ko-KR')}</Text>
          </View>
        </View>

        {/* SECTION 2: COUPON */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Kupon</Text>
          {couponResult ? (
            <View style={styles.couponApplied}>
              <Text style={styles.couponAppliedText}>
                {couponResult.code} (₩{couponResult.discountAmount.toLocaleString('ko-KR')})
              </Text>
              <Pressable onPress={handleRemoveCoupon}>
                <Feather name="x" size={18} color={tokens.colors.success} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.couponRow}>
              <TextInput
                value={couponCode}
                onChangeText={t => setCouponCode(t.toUpperCase())}
                placeholder="Kupon kodini kiriting"
                autoCapitalize="characters"
                style={styles.couponInput}
                editable={!couponLoading}
              />
              <Pressable
                onPress={handleApplyCoupon}
                disabled={!couponCode.trim() || couponLoading}
                style={[
                  styles.couponButton,
                  (!couponCode.trim() || couponLoading) && { opacity: 0.5 }
                ]}>
                {couponLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.couponButtonText}>Qo'llash</Text>
                )}
              </Pressable>
            </View>
          )}
          <Pressable onPress={() => router.push('/profile/coupons')} style={styles.viewCouponsLink}>
            <Text style={styles.viewCouponsText}>Mavjud kuponlarni ko'rish</Text>
          </Pressable>
        </View>

        {/* SECTION 3: BOX SELECTION (UZB ONLY) */}
        {region === 'UZB' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Quti</Text>
            <Text style={styles.weightText}>Jami og'irlik: {(totalWeightG / 1000).toFixed(2)}kg</Text>
            {boxes
              .sort((a, b) => Number(a.maxWeightKg) - Number(b.maxWeightKg))
              .map(box => {
                const status = getBoxStatus(box, totalWeightG)
                const isRecommended = box.id === getRecommendedBoxId(boxes, totalWeightG)
                const isSelected = selectedBoxId === box.id
                const isDisabled = status.status === 'too_small'

                return (
                  <Pressable
                    key={box.id}
                    disabled={isDisabled}
                    onPress={() => {
                      if (!isDisabled) setSelectedBoxId(box.id)
                    }}
                    style={[
                      styles.boxOption,
                      isSelected && styles.boxOptionSelected,
                      isDisabled && styles.boxOptionDisabled,
                    ]}>
                    <View style={[styles.radioOuter, isSelected && !isDisabled && styles.radioOuterSelected]}>
                      {isSelected && !isDisabled && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={styles.boxName}>{box.name}</Text>
                        {isRecommended && !isDisabled && (
                          <View style={styles.boxRecommendedBadge}>
                            <Text style={styles.boxRecommendedText}>Tavsiya</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.boxDetail}>
                        Max {box.maxWeightKg}kg · ₩{Number(box.costKrw).toLocaleString('ko-KR')}
                      </Text>
                      {isDisabled && (
                        <Text style={styles.boxDisabledText}>{status.reason}</Text>
                      )}
                    </View>
                  </Pressable>
                )
              })}
          </View>
        )}

        {/* SECTION 4: ADDRESS */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Yetkazib berish manzili</Text>
          {addresses.map(addr => (
            <Pressable
              key={addr.id}
              style={[
                styles.addressCard,
                selectedAddressId === addr.id && styles.addressCardSelected
              ]}
              onPress={() => setSelectedAddressId(addr.id)}>
              <View style={[styles.radioOuter, selectedAddressId === addr.id && styles.radioOuterSelected, { marginTop: 2 }]}>
                {selectedAddressId === addr.id && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressName}>{addr.fullName}</Text>
                <Text style={styles.addressDetail}>{addr.addressLine1}, {addr.city}</Text>
                <Text style={styles.addressDetail}>{addr.phone}</Text>
              </View>
            </Pressable>
          ))}
          <Pressable style={styles.addAddressRow} onPress={() => router.push('/profile/address-form')}>
            <Feather name="plus" size={16} color={tokens.colors.primary} />
            <Text style={styles.addAddressText}>Yangi manzil qo'shish</Text>
          </Pressable>
        </View>

        {/* SECTION 5: PAYMENT METHOD */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>To'lov usuli</Text>
          {region === 'UZB' && (
            <Pressable
              style={[
                styles.paymentOption,
                paymentMethod === 'UZB_BANK' && styles.paymentOptionSelected
              ]}
              onPress={() => setPaymentMethod('UZB_BANK')}>
              <View style={[styles.radioOuter, paymentMethod === 'UZB_BANK' && styles.radioOuterSelected]}>
                {paymentMethod === 'UZB_BANK' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.paymentLabel}>O'zbekiston bank o'tkazma</Text>
            </Pressable>
          )}
          {region === 'KOR' && (
            <Pressable
              style={[
                styles.paymentOption,
                paymentMethod === 'KOREAN_BANK' && styles.paymentOptionSelected
              ]}
              onPress={() => setPaymentMethod('KOREAN_BANK')}>
              <View style={[styles.radioOuter, paymentMethod === 'KOREAN_BANK' && styles.radioOuterSelected]}>
                {paymentMethod === 'KOREAN_BANK' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.paymentLabel}>Koreya bank o'tkazma</Text>
            </Pressable>
          )}
        </View>

        {/* SECTION 6: PRICE BREAKDOWN */}
        <View style={[styles.section, { borderBottomWidth: 0, paddingBottom: 40 }]}>
          <Text style={styles.sectionLabel}>Hisob-kitob</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Mahsulotlar jami</Text>
            <Text style={styles.priceValue}>₩{cartSubtotal.toLocaleString('ko-KR')}</Text>
          </View>
          
          {couponDiscount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Kupon chegirmasi</Text>
              <Text style={[styles.priceValue, styles.priceDiscount]}>−₩{couponDiscount.toLocaleString('ko-KR')}</Text>
            </View>
          )}
          
          {region === 'UZB' && boxCost > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Quti ({selectedBox?.name})</Text>
              <Text style={styles.priceValue}>₩{boxCost.toLocaleString('ko-KR')}</Text>
            </View>
          )}
          
          <View style={styles.priceDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Jami</Text>
            <Text style={styles.totalValue}>₩{(cartSubtotal - couponDiscount + boxCost).toLocaleString('ko-KR')}</Text>
          </View>
          
          <Text style={styles.cargoNote}>Qo'shimcha kargo narxi buyurtma tasdiqlangandan so'ng qo'shiladi</Text>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM BUTTON */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[
            styles.confirmButton,
            (!selectedAddressId || (region === 'UZB' && !selectedBoxId) || submitting) && styles.confirmButtonDisabled
          ]}
          disabled={!selectedAddressId || (region === 'UZB' && !selectedBoxId) || submitting}
          onPress={handleCreateOrder}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Buyurtmani tasdiqlash</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: tokens.colors.text,
  },
  scroll: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  sectionLabel: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  // Order items
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    color: tokens.colors.text,
    marginRight: 12,
  },
  orderItemQty: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginRight: 16,
    minWidth: 30,
    textAlign: 'right',
  },
  orderItemPrice: {
    fontSize: 14,
    color: tokens.colors.text,
    minWidth: 70,
    textAlign: 'right',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: tokens.colors.border,
  },
  subtotalLabel: {
    fontSize: 13,
    color: tokens.colors.textMuted,
  },
  subtotalValue: {
    fontSize: 14,
    color: tokens.colors.text,
  },
  // Coupon
  couponRow: {
    flexDirection: 'row',
    gap: 10,
  },
  couponInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.surface,
  },
  couponButton: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: tokens.colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  couponApplied: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: (tokens.colors as any).successLight ?? '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tokens.colors.success,
  },
  couponAppliedText: {
    fontSize: 14,
    color: tokens.colors.success,
  },
  viewCouponsLink: {
    marginTop: 10,
  },
  viewCouponsText: {
    fontSize: 13,
    color: tokens.colors.primary,
  },
  // Box selection
  weightText: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginBottom: 14,
  },
  boxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: 8,
  },
  boxOptionSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight ?? '#f5f3ff',
  },
  boxOptionDisabled: {
    opacity: 0.4,
  },
  boxName: {
    fontSize: 14,
    color: tokens.colors.text,
    flex: 1,
  },
  boxDetail: {
    fontSize: 13,
    color: tokens.colors.textMuted,
  },
  boxRecommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: tokens.colors.primary,
    borderRadius: 4,
    marginLeft: 8,
  },
  boxRecommendedText: {
    fontSize: 11,
    color: '#fff',
  },
  boxDisabledText: {
    fontSize: 11,
    color: tokens.colors.error,
    marginTop: 2,
  },
  // Address
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: 8,
    gap: 12,
  },
  addressCardSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight ?? '#f5f3ff',
  },
  addressName: {
    fontSize: 14,
    color: tokens.colors.text,
    marginBottom: 2,
  },
  addressDetail: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginBottom: 1,
  },
  addAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addAddressText: {
    fontSize: 14,
    color: tokens.colors.primary,
  },
  // Payment method
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: 8,
    gap: 12,
  },
  paymentOptionSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight ?? '#f5f3ff',
  },
  paymentLabel: {
    fontSize: 14,
    color: tokens.colors.text,
  },
  // Price breakdown
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  priceLabel: {
    fontSize: 14,
    color: tokens.colors.textMuted,
  },
  priceValue: {
    fontSize: 14,
    color: tokens.colors.text,
  },
  priceDiscount: {
    color: tokens.colors.success,
  },
  priceDivider: {
    height: 0.5,
    backgroundColor: tokens.colors.border,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    color: tokens.colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: tokens.colors.text,
  },
  cargoNote: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 12,
    lineHeight: 18,
  },
  // Bottom button
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: tokens.colors.border,
    backgroundColor: tokens.colors.background,
  },
  confirmButton: {
    backgroundColor: tokens.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  // STATE 2: Payment styles
  orderConfirmed: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: tokens.colors.text,
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 15,
    color: tokens.colors.textMuted,
  },
  orderNote: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  bankCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankLabel: {
    fontSize: 13,
    color: tokens.colors.textMuted,
  },
  bankValue: {
    fontSize: 14,
    color: tokens.colors.text,
  },
  bankAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: tokens.colors.text,
  },
  referenceCode: {
    fontSize: 14,
    color: tokens.colors.primary,
    fontWeight: '500',
  },
  uploadButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderStyle: 'dashed',
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButtonText: {
    fontSize: 14,
    color: tokens.colors.primary,
  },
  uploadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: (tokens.colors as any).successLight ?? '#f0fdf4',
    borderRadius: 10,
    marginBottom: 10,
  },
  uploadedText: {
    fontSize: 14,
    color: tokens.colors.success,
  },
  viewOrdersButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewOrdersText: {
    fontSize: 15,
    color: tokens.colors.primary,
  },
  // Shared
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioOuterSelected: {
    borderColor: tokens.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.colors.primary,
  },
})
