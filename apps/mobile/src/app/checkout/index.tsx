import React, { useState, useEffect, useRef, useCallback } from 'react'
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
import { orderService } from '../../services/order.service'

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
      const order = await orderService.checkout({
        addressId: selectedAddressId,
        boxId: selectedBoxId ?? undefined,
        paymentMethod,
        couponCode: couponResult?.code ?? undefined,
      })
      router.replace({
        pathname: '/checkout/receipt',
        params: { orderId: order.order.id }
      })
    } catch (err: any) {
      Alert.alert('Xatolik', err.response?.data?.error?.message ?? 'Buyurtma yaratilmadi')
    } finally {
      setSubmitting(false)
    }
  }

  const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const couponDiscount = couponResult?.discountAmount ?? 0
  const selectedBox = boxes.find(b => b.id === selectedBoxId)
  const boxCost = selectedBox ? Number(selectedBox.costKrw) : 0

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={tokens.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Buyurtmani rasmiylashtirish</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1: ADDRESS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Yetkazib berish manzili</Text>
          {addresses.length === 0 ? (
            <Text style={styles.emptyText}>Manzil qo'shilmagan</Text>
          ) : (
            addresses.map(addr => (
              <Pressable
                key={addr.id}
                style={[
                  styles.addressCard,
                  selectedAddressId === addr.id && styles.addressCardSelected
                ]}
                onPress={() => setSelectedAddressId(addr.id)}>
                <View style={styles.radioOuter}>
                  {selectedAddressId === addr.id && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressName}>{addr.fullName}</Text>
                  <Text style={styles.addressDetail}>{addr.addressLine1}, {addr.city}</Text>
                  <Text style={styles.addressPhone}>{addr.phone}</Text>
                </View>
                {selectedAddressId === addr.id && (
                  <Feather name="check-circle" size={20} color={tokens.colors.primary} />
                )}
              </Pressable>
            ))
          )}
          <Pressable style={styles.addAddressBtn} onPress={() => router.push('/profile/address-form')}>
            <Feather name="plus" size={16} color={tokens.colors.primary} />
            <Text style={styles.addAddressText}>Yangi manzil qo'shish</Text>
          </Pressable>
        </View>

        {/* SECTION 2: ORDER ITEMS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Buyurtma</Text>
          {cartItems.map(item => (
            <View key={item.productId} style={styles.orderItem}>
              <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.orderItemQty}>{item.quantity} ta</Text>
              <Text style={styles.orderItemPrice}>₩{(item.unitPrice * item.quantity).toLocaleString('ko-KR')}</Text>
            </View>
          ))}
        </View>

        {/* SECTION 3: BOX SELECTION (UZB ONLY) */}
        {region === 'UZB' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📫 Quti tanlash</Text>
            <Text style={styles.weightInfo}>Jami og'irlik: {(totalWeightG / 1000).toFixed(2)}kg</Text>
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
                      styles.boxCard,
                      isSelected && styles.boxCardSelected,
                      isDisabled && styles.boxCardDisabled,
                    ]}>
                    <View style={styles.radioOuter}>
                      {isSelected && !isDisabled && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.boxHeader}>
                        <Text style={[styles.boxName, isDisabled && styles.textDisabled]}>
                          Quti nomi: {box.name}
                        </Text>
                        {isRecommended && !isDisabled && (
                          <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedText}>Tavsiya</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.boxDetail, isDisabled && styles.textDisabled]}>
                        Max {box.maxWeightKg}kg · ₩{Number(box.costKrw).toLocaleString('ko-KR')}
                      </Text>
                      {isDisabled && (
                        <Text style={styles.boxDisabledReason}>{status.reason}</Text>
                      )}
                    </View>
                    {isSelected && !isDisabled && (
                      <Feather name="check-circle" size={20} color={tokens.colors.primary} />
                    )}
                  </Pressable>
                )
              })}
          </View>
        )}

        {/* SECTION 4: COUPON */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏷 Kupon</Text>
          {couponResult ? (
            <View style={styles.couponApplied}>
              <View style={styles.couponAppliedLeft}>
                <Feather name="tag" size={16} color={tokens.colors.success} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.couponAppliedCode}>{couponResult.code}</Text>
                  <Text style={styles.couponAppliedDiscount}>−₩{couponResult.discountAmount.toLocaleString('ko-KR')} chegirma</Text>
                </View>
              </View>
              <Pressable onPress={handleRemoveCoupon} style={styles.removeCouponBtn}>
                <Feather name="x" size={20} color={tokens.colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.couponInput}>
              <TextInput
                value={couponCode}
                onChangeText={t => setCouponCode(t.toUpperCase())}
                placeholder="Kupon kodini kiriting"
                autoCapitalize="characters"
                style={styles.couponTextField}
                editable={!couponLoading}
              />
              <Pressable
                onPress={handleApplyCoupon}
                disabled={!couponCode.trim() || couponLoading}
                style={[
                  styles.couponApplyBtn,
                  (!couponCode.trim() || couponLoading) && styles.couponApplyBtnDisabled
                ]}>
                {couponLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.couponApplyText}>Qo'llash</Text>
                )}
              </Pressable>
            </View>
          )}
          <Pressable onPress={() => router.push('/profile/coupons')} style={styles.viewCouponsLink}>
            <Text style={styles.viewCouponsText}>Mavjud kuponlarni ko'rish →</Text>
          </Pressable>
        </View>

        {/* SECTION 5: PAYMENT METHOD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 To'lov usuli</Text>
          {region === 'UZB' && (
            <Pressable
              style={[
                styles.paymentOption,
                paymentMethod === 'UZB_BANK' && styles.paymentOptionSelected
              ]}
              onPress={() => setPaymentMethod('UZB_BANK')}>
              <View style={styles.radioOuter}>
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
              <View style={styles.radioOuter}>
                {paymentMethod === 'KOREAN_BANK' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.paymentLabel}>Koreya bank o'tkazma</Text>
            </Pressable>
          )}
        </View>

        {/* SECTION 6: PRICE BREAKDOWN */}
        <View style={[styles.section, { marginBottom: 100 }]}>
          <Text style={styles.sectionTitle}>📊 Hisob-kitob</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Mahsulotlar jami</Text>
            <Text style={styles.priceValue}>₩{cartSubtotal.toLocaleString('ko-KR')}</Text>
          </View>
          
          {couponDiscount > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: tokens.colors.success }]}>Kupon ({couponResult?.code})</Text>
              <Text style={[styles.priceValue, { color: tokens.colors.success }]}>−₩{couponDiscount.toLocaleString('ko-KR')}</Text>
            </View>
          )}
          
          {region === 'UZB' && boxCost > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Quti ({selectedBox?.name})</Text>
              <Text style={styles.priceValue}>₩{boxCost.toLocaleString('ko-KR')}</Text>
            </View>
          )}
          
          <View style={[styles.priceRow, styles.priceTotalRow]}>
            <Text style={styles.priceTotalLabel}>Taxminiy jami</Text>
            <Text style={styles.priceTotalValue}>₩{(cartSubtotal - couponDiscount + boxCost).toLocaleString('ko-KR')}</Text>
          </View>
          
          <Text style={styles.cargoNote}>* Kargo narxi buyurtma tasdiqlangandan so'ng qo'shiladi</Text>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM BUTTON */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[
            styles.confirmBtn,
            (!selectedAddressId || (region === 'UZB' && !selectedBoxId) || submitting) && styles.confirmBtnDisabled
          ]}
          disabled={!selectedAddressId || (region === 'UZB' && !selectedBoxId) || submitting}
          onPress={handleCreateOrder}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>Buyurtmani tasdiqlash</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: tokens.colors.text },
  scroll: { flex: 1 },
  section: { backgroundColor: '#fff', padding: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: tokens.colors.text, marginBottom: 16 },
  emptyText: { color: tokens.colors.textMuted, fontSize: 14, fontStyle: 'italic', marginBottom: 12 },
  
  // Address
  addressCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: tokens.colors.border, borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  addressCardSelected: { borderColor: tokens.colors.primary, backgroundColor: tokens.colors.primaryLight },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: tokens.colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.colors.primary },
  addressName: { fontSize: 15, fontWeight: '600', color: tokens.colors.text, marginBottom: 4 },
  addressDetail: { fontSize: 14, color: tokens.colors.textLight, marginBottom: 4 },
  addressPhone: { fontSize: 14, color: tokens.colors.textLight },
  addAddressBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: tokens.colors.primaryLight, borderRadius: 8, marginTop: 4 },
  addAddressText: { color: tokens.colors.primary, fontSize: 14, fontWeight: '600', marginLeft: 8 },

  // Order Items
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  orderItemName: { flex: 1, fontSize: 14, color: tokens.colors.text, marginRight: 16 },
  orderItemQty: { width: 40, fontSize: 14, color: tokens.colors.textLight, textAlign: 'right', marginRight: 16 },
  orderItemPrice: { width: 80, fontSize: 14, fontWeight: '600', color: tokens.colors.text, textAlign: 'right' },

  // Box
  weightInfo: { fontSize: 14, color: tokens.colors.textMuted, marginBottom: 16 },
  boxCard: { flexDirection: 'row', padding: 16, borderWidth: 1, borderColor: tokens.colors.border, borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  boxCardSelected: { borderColor: tokens.colors.primary, backgroundColor: tokens.colors.primaryLight },
  boxCardDisabled: { backgroundColor: '#F9FAFB', opacity: 0.6 },
  boxHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  boxName: { fontSize: 15, fontWeight: '600', color: tokens.colors.text },
  textDisabled: { color: tokens.colors.textMuted },
  recommendedBadge: { backgroundColor: tokens.colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  recommendedText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  boxDetail: { fontSize: 13, color: tokens.colors.textLight },
  boxDisabledReason: { fontSize: 12, color: tokens.colors.error, marginTop: 4 },

  // Coupon
  couponInput: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  couponTextField: { flex: 1, height: 48, borderWidth: 1, borderColor: tokens.colors.border, borderRadius: 8, paddingHorizontal: 16, backgroundColor: '#fff', fontSize: 14 },
  couponApplyBtn: { height: 48, backgroundColor: tokens.colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, borderRadius: 8, marginLeft: 8 },
  couponApplyBtnDisabled: { opacity: 0.5 },
  couponApplyText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  couponApplied: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#ECFDF5', borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 12 },
  couponAppliedLeft: { flexDirection: 'row', alignItems: 'center' },
  couponAppliedCode: { fontSize: 14, fontWeight: '700', color: tokens.colors.success },
  couponAppliedDiscount: { fontSize: 13, color: tokens.colors.success, marginTop: 2 },
  removeCouponBtn: { padding: 4 },
  viewCouponsLink: { alignSelf: 'flex-start', marginTop: 4 },
  viewCouponsText: { color: tokens.colors.primary, fontSize: 14, fontWeight: '500' },

  // Payment
  paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: tokens.colors.border, borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  paymentOptionSelected: { borderColor: tokens.colors.primary, backgroundColor: tokens.colors.primaryLight },
  paymentLabel: { fontSize: 15, fontWeight: '500', color: tokens.colors.text },

  // Prices
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  priceLabel: { fontSize: 14, color: tokens.colors.textLight },
  priceValue: { fontSize: 14, fontWeight: '500', color: tokens.colors.text },
  priceTotalRow: { borderTopWidth: 1, borderTopColor: tokens.colors.border, paddingTop: 16, marginTop: 4 },
  priceTotalLabel: { fontSize: 16, fontWeight: '700', color: tokens.colors.text },
  priceTotalValue: { fontSize: 18, fontWeight: '700', color: tokens.colors.text },
  cargoNote: { fontSize: 12, color: tokens.colors.textMuted, marginTop: 12, fontStyle: 'italic' },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: tokens.colors.border },
  confirmBtn: { backgroundColor: tokens.colors.primary, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})
