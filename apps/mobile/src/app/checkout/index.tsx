import React, { useState, useEffect, useRef } from 'react'
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
  Share,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'

import { useAuthStore } from '../../lib/auth-store'
import { useCartStore } from '../../lib/cart-store'
import { tokens } from '../../lib/tokens'
import { addressService, type Address } from '../../services/address.service'
import { boxService, type Box } from '../../services/box.service'
import { cartService } from '../../services/cart.service'
import { orderService } from '../../services/order.service'
import { uploadService } from '../../services/upload.service'
import api from '../../lib/api'

interface OrderResult {
  id: string
  orderNumber: string
  totalAmount: number
  cargoFee: number
  subtotal: number
  discountAmount: number
  boxCostKrw: number
}

function CheckoutScreen() {
  const router = useRouter()
  const { couponCode: incomingCouponCode } = useLocalSearchParams<{
    couponCode?: string
  }>()
  const insets = useSafeAreaInsets()
  const customer = useAuthStore((s) => s.customer)
  const { cart } = useCartStore()
  const cartItems = cart?.items || []
  const region = customer?.phoneRegion ?? 'KOR'

  // Main state variables:
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null)

  // CONFIG state (STATE 1 only):
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null)
  const [totalWeightG, setTotalWeightG] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<{
    code: string
    discountAmount: number
  } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  // RECEIPT state (STATE 2 only):
  const [receiptUri, setReceiptUri] = useState<string | null>(null)
  const [receiptUploading, setReceiptUploading] = useState(false)
  const [receiptUploaded, setReceiptUploaded] = useState(false)

  // BANK INFO:
  const [bankInfo, setBankInfo] = useState<{
    bankName: string
    accountNumber: string
    holderName: string
  } | null>(null)

  // SUBMISSION:
  const [submitting, setSubmitting] = useState(false)

  const [publicConfig, setPublicConfig] = useState<{
    uzbCargoUsdPerKg: number
    usdToKrw: number
    minOrderKorKrw: number
    minOrderUzbUzs: number
    krwToUzs: number
  } | null>(null)

  // Add state for shipping tiers (KOR only)
  const [korShippingTiers, setKorShippingTiers] = useState<Array<{
    maxOrderKrw: number | null
    cargoFeeKrw: number
    sortOrder: number
  }>>([])

  // Add helper function
  const getKorCargoFee = (
    subtotal: number,
    tiers: typeof korShippingTiers
  ): number => {
    if (!tiers.length) return 0
    const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder)
    const matched = sorted.find(t => t.maxOrderKrw === null || subtotal <= t.maxOrderKrw)
    const tier = matched ?? sorted[sorted.length - 1]
    return tier?.cargoFeeKrw ?? 0
  }

  const getUzbCargoFee = (
    productWeightG: number,
    boxWeightKg: number,
    uzbCargoUsdPerKg: number,
    usdToKrw: number
  ): number => {
    const totalWeightKg = (productWeightG / 1000) + boxWeightKg
    const cargoUsd = totalWeightKg * uzbCargoUsdPerKg
    const cargoKrw = Math.round(cargoUsd * usdToKrw)
    return Math.round(cargoKrw / 100) * 100
  }

  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (incomingCouponCode) {
      setCouponCode(incomingCouponCode)
      cartService.validateCoupon(incomingCouponCode)
        .then(res => {
          setCouponResult({
            code: incomingCouponCode,
            discountAmount: Number(res.discountAmount)
          })
        })
        .catch(() => {
          setCouponCode(incomingCouponCode)
        })
    }
  }, [incomingCouponCode])

  useEffect(() => {
    const load = async () => {
      // Load addresses
      const addrs = await addressService.getAddresses()
      setAddresses(addrs)
      const def = addrs.find((a) => a.isDefault)
      if (def) setSelectedAddressId(def.id)
      else if (addrs.length > 0) setSelectedAddressId(addrs[0].id)

      // Load payment info
      try {
        const res = await api.get('/settings/payment-info')
        const info = res.data.data
        const regionData = region === 'UZB' ? info.uzb : info.kor
        if (regionData?.bankName) {
          setBankInfo({
            bankName: regionData.bankName,
            accountNumber: regionData.bankNumber || regionData.accountNumber,
            holderName: regionData.bankHolder || regionData.holderName,
          })
        }
      } catch (err) {}

      // Load boxes + calculate weight (UZB)
      if (region === 'UZB') {
        const bxs = await boxService.getBoxes()
        setBoxes(bxs)
        const wg = cartItems.reduce(
          (sum: number, item: any) => sum + Number(item.weightGrams ?? 0) * item.quantity,
          0
        )
        setTotalWeightG(wg)
        const rec = getRecommendedBoxId(bxs, wg)
        if (rec) setSelectedBoxId(rec)

        api.get('/settings/public-config')
          .then(res => {
            setPublicConfig(res.data.data)
          })
          .catch(() => {
            setPublicConfig({
              uzbCargoUsdPerKg: 10,
              usdToKrw: 1350,
              minOrderKorKrw: 0,
              minOrderUzbUzs: 0,
              krwToUzs: 7.74,
            })
          })
      } else if (region === 'KOR') {
        api.get('/kor-shipping-tiers')
          .then(res => {
            const tiers = res.data.data ?? []
            setKorShippingTiers(tiers.map((t: any) => ({
              maxOrderKrw: t.maxOrderKrw ? Number(t.maxOrderKrw) : null,
              cargoFeeKrw: Number(t.cargoFeeKrw),
              sortOrder: Number(t.sortOrder),
            })))
          })
          .catch(() => {})
      }
    }
    load()
  }, [])

  const getRecommendedBoxId = (boxes: Box[], weightG: number): string | null => {
    const kg = weightG / 1000
    return [...boxes]
      .sort((a, b) => Number(a.maxWeightKg) - Number(b.maxWeightKg))
      .find((b) => Number(b.maxWeightKg) >= kg)?.id ?? null
  }

  const isBoxTooSmall = (box: Box, weightG: number): boolean =>
    Number(box.maxWeightKg) < weightG / 1000

  const cartSubtotal = cartItems.reduce(
    (sum: number, item: any) => sum + item.unitPrice * item.quantity,
    0
  )

  const couponDiscount = couponResult?.discountAmount ?? 0

  const selectedBox = boxes.find((b) => b.id === selectedBoxId)
  const boxCost = selectedBox ? Number(selectedBox.costKrw) : 0
  const boxWeightKg = selectedBox ? Number(selectedBox.boxWeightKg) : 0

  const uzbCargoFee = region === 'UZB' && publicConfig && selectedBoxId
    ? getUzbCargoFee(totalWeightG, boxWeightKg, publicConfig.uzbCargoUsdPerKg, publicConfig.usdToKrw)
    : null

  const korCargoFee = region === 'KOR'
    ? getKorCargoFee(cartSubtotal - couponDiscount, korShippingTiers)
    : 0

  const cargoFeeDisplay = region === 'KOR' ? korCargoFee : uzbCargoFee

  const estimatedTotal = cartSubtotal - couponDiscount + boxCost + (cargoFeeDisplay ?? 0)

  // MIN ORDER WARNING COMPUTATION
  const minOrderKrw = region === 'KOR' ? (publicConfig?.minOrderKorKrw ?? 0) : 0
  const minOrderUzbKrw = region === 'UZB' && publicConfig?.minOrderUzbUzs && publicConfig?.krwToUzs
    ? Math.round(publicConfig.minOrderUzbUzs / publicConfig.krwToUzs)
    : 0

  const effectiveMinKrw = region === 'KOR' ? minOrderKrw : region === 'UZB' ? minOrderUzbKrw : 0
  const isBelowMinOrder = effectiveMinKrw > 0 && cartSubtotal < effectiveMinKrw
  const shortfallKrw = isBelowMinOrder ? effectiveMinKrw - cartSubtotal : 0

  // Active payment method to display
  // Derived directly from bankInfo state

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const res = await cartService.validateCoupon(couponCode.trim())
      setCouponResult({
        code: couponCode.trim(),
        discountAmount: Number(res.discountAmount),
      })
      setCouponCode('')
    } catch (err: any) {
      Alert.alert(
        'Kupon',
        err.response?.data?.error?.message ?? "Kupon qo'llanilmadi"
      )
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponResult(null)
    setCouponCode('')
  }

  const handlePickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri)
    }
  }

  const handleCameraReceipt = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Kamera ruxsati kerak')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri)
    }
  }

  const handleSubmit = async () => {
    if (!selectedAddressId) {
      Alert.alert('Manzil tanlang')
      scrollRef.current?.scrollTo({ y: 0, animated: true })
      return
    }
    if (region === 'UZB' && !selectedBoxId) {
      Alert.alert('Quti tanlang')
      return
    }

    setSubmitting(true)
    try {
      // Step 1: Create order
      const res = await orderService.checkout({
        addressId: selectedAddressId,
        boxId: selectedBoxId ?? undefined,
        paymentMethod: region === 'UZB' ? 'UZB_BANK' : 'KOREAN_BANK',
        couponCode: couponResult?.code ?? undefined,
      })

      const order = res.order

      let uploaded = false
      // Step 2: Upload receipt if selected
      if (receiptUri) {
        try {
          const receiptUrl = await uploadService.uploadReceipt(receiptUri)
          const paymentCurrency = region === 'UZB' ? 'UZS' : 'KRW'
          await orderService.uploadReceipt(order.id, receiptUrl, Number(order.totalAmount), paymentCurrency)
          uploaded = true
        } catch (e) {
          Alert.alert('Diqqat', 'Buyurtma yaratildi, lekin kvitansiya yuklanmadi.')
        }
      }

      await useCartStore.getState().clearCart()

      // Step 3: Transition to STATE 2
      setOrderResult({
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        cargoFee: Number(order.cargoFee ?? 0),
        subtotal: Number(order.subtotal ?? cartSubtotal),
        discountAmount: Number(order.discountAmount ?? couponDiscount),
        boxCostKrw: Number(order.boxCostKrw ?? boxCost),
      })
      setReceiptUploaded(uploaded)

      scrollRef.current?.scrollTo({ y: 0, animated: true })
    } catch (err: any) {
      Alert.alert('Xatolik', err.response?.data?.error?.message ?? 'Buyurtma yaratilmadi')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUploadReceipt = async () => {
    if (!orderResult || !receiptUri) return
    setReceiptUploading(true)
    try {
      const receiptUrl = await uploadService.uploadReceipt(receiptUri)
      const paymentCurrency = region === 'UZB' ? 'UZS' : 'KRW'
      await orderService.uploadReceipt(orderResult.id, receiptUrl, orderResult.totalAmount, paymentCurrency)
      setReceiptUploaded(true)
    } catch (err: any) {
      Alert.alert('Xatolik', 'Kvitansiya yuklanmadi')
    } finally {
      setReceiptUploading(false)
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        {!orderResult ? (
          <Pressable onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={tokens.colors.text} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={styles.headerTitle}>
          {orderResult ? "To'lov" : 'Buyurtma'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════ */}
        {/* STATE 1: CHECKOUT CONFIG   */}
        {/* ═══════════════════════════ */}
        {!orderResult && (
          <>
            {/* PRODUCTS WITH IMAGES */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Mahsulotlar</Text>
              {cartItems.map((item: any, i: number) => (
                <View
                  key={item.productId}
                  style={[
                    styles.productRow,
                    i < cartItems.length - 1 && styles.productRowBorder,
                  ]}
                >
                  {item.imageUrls?.[0] ? (
                    <Image
                      source={{
                        uri: item.imageUrls[0],
                      }}
                      style={styles.productImage}
                    />
                  ) : (
                    <View
                      style={[styles.productImage, styles.productImagePlaceholder]}
                    />
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.productQty}>{item.quantity} ta</Text>
                  </View>
                  <Text style={styles.productPrice}>
                    ₩{(item.unitPrice * item.quantity).toLocaleString('ko-KR')}
                  </Text>
                </View>
              ))}
            </View>

            {/* COUPON */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Kupon kodi</Text>
              {couponResult ? (
                <View style={styles.couponApplied}>
                  <View>
                    <Text style={styles.couponCode}>{couponResult.code}</Text>
                    <Text style={styles.couponDiscount}>
                      −₩{couponResult.discountAmount.toLocaleString('ko-KR')} chegirma
                    </Text>
                  </View>
                  <Pressable onPress={handleRemoveCoupon} hitSlop={8}>
                    <Feather name="x" size={18} color={tokens.colors.textMuted} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.couponRow}>
                  <TextInput
                    value={couponCode}
                    onChangeText={(t) => setCouponCode(t.toUpperCase())}
                    placeholder="Kod kiriting"
                    placeholderTextColor={tokens.colors.textMuted}
                    autoCapitalize="characters"
                    style={styles.couponInput}
                    editable={!couponLoading}
                  />
                  <Pressable
                    onPress={handleApplyCoupon}
                    disabled={!couponCode.trim() || couponLoading}
                    style={[
                      styles.couponBtn,
                      (!couponCode.trim() || couponLoading) && styles.couponBtnDisabled,
                    ]}
                  >
                    {couponLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.couponBtnText}>Qo'llash</Text>
                    )}
                  </Pressable>
                </View>
              )}
              <Pressable
                onPress={() => router.push('/profile/coupons')}
                style={{ marginTop: 10 }}
              >
                <Text style={styles.couponLink}>Mavjud kuponlar</Text>
              </Pressable>
            </View>

            {/* BOX SELECTION (UZB ONLY) */}
            {region === 'UZB' && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Quti tanlash</Text>
                <Text style={styles.weightNote}>
                  Jami og'irlik: {(totalWeightG / 1000).toFixed(2)}kg
                </Text>
                {[...boxes]
                  .sort((a, b) => Number(a.maxWeightKg) - Number(b.maxWeightKg))
                  .map((box) => {
                    const tooSmall = isBoxTooSmall(box, totalWeightG)
                    const recommended =
                      box.id === getRecommendedBoxId(boxes, totalWeightG)
                    const selected = selectedBoxId === box.id

                    return (
                      <Pressable
                        key={box.id}
                        disabled={tooSmall}
                        onPress={() => !tooSmall && setSelectedBoxId(box.id)}
                        style={[
                          styles.boxOption,
                          selected && styles.boxSelected,
                          tooSmall && styles.boxDisabled,
                        ]}
                      >
                        {/* Radio */}
                        <View style={[styles.radio, selected && styles.radioSelected]}>
                          {selected && <View style={styles.radioDot} />}
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <Text style={[styles.boxName, tooSmall && styles.textMuted]}>
                              {box.name}
                            </Text>
                            {recommended && !tooSmall && (
                              <View style={styles.badge}>
                                <Text style={styles.badgeText}>Tavsiya</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.boxMeta, tooSmall && styles.textMuted]}>
                            {`Max ${box.maxWeightKg}kg`}
                            {Number(box.costKrw) > 0
                              ? ` · ₩${Number(box.costKrw).toLocaleString('ko-KR')}`
                              : ''}
                          </Text>
                          {tooSmall && (
                            <Text style={styles.boxError}>
                              {`Juda kichik (${(totalWeightG / 1000).toFixed(1)}kg > ${box.maxWeightKg}kg)`}
                            </Text>
                          )}
                        </View>

                        {/* Check */}
                        {selected && (
                          <Feather
                            name="check-circle"
                            size={20}
                            color={tokens.colors.primary}
                          />
                        )}
                      </Pressable>
                    )
                  })}
              </View>
            )}

            {/* ADDRESS */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Yetkazib berish manzili</Text>
              {addresses.map((addr) => (
                <Pressable
                  key={addr.id}
                  onPress={() => setSelectedAddressId(addr.id)}
                  style={[
                    styles.addrCard,
                    selectedAddressId === addr.id && styles.addrCardSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.radio,
                      selectedAddressId === addr.id && styles.radioSelected,
                    ]}
                  >
                    {selectedAddressId === addr.id && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addrName}>{addr.fullName}</Text>
                    <Text style={styles.addrDetail}>
                      {[addr.addressLine1, addr.city, addr.province]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                    <Text style={styles.addrPhone}>{addr.phone}</Text>
                  </View>
                  {selectedAddressId === addr.id && (
                    <Feather name="check-circle" size={20} color={tokens.colors.primary} />
                  )}
                </Pressable>
              ))}
              <Pressable
                onPress={() => router.push('/profile/address-form')}
                style={styles.addAddrBtn}
              >
                <Feather name="plus" size={16} color={tokens.colors.primary} />
                <Text style={styles.addAddrText}>Yangi manzil qo'shish</Text>
              </Pressable>
            </View>

            {/* PRICE BREAKDOWN */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Hisob-kitob</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Mahsulotlar</Text>
                <Text style={styles.priceVal}>
                  ₩{cartSubtotal.toLocaleString('ko-KR')}
                </Text>
              </View>

              {couponDiscount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: tokens.colors.success }]}>
                    Kupon ({couponResult?.code})
                  </Text>
                  <Text style={[styles.priceVal, { color: tokens.colors.success }]}>
                    −₩{couponDiscount.toLocaleString('ko-KR')}
                  </Text>
                </View>
              )}

              {region === 'UZB' && boxCost > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Quti ({selectedBox?.name})</Text>
                  <Text style={styles.priceVal}>
                    ₩{boxCost.toLocaleString('ko-KR')}
                  </Text>
                </View>
              )}

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Yetkazib berish
                </Text>
                <Text style={[
                  styles.priceVal,
                  cargoFeeDisplay === null && { color: tokens.colors.textMuted }
                ]}>
                  {cargoFeeDisplay !== null
                    ? `₩${cargoFeeDisplay.toLocaleString('ko-KR')}`
                    : selectedBoxId
                      ? 'Hisoblanmoqda...'
                      : 'Quti tanlang'}
                </Text>
              </View>

              {isBelowMinOrder && (
                <View style={styles.minOrderWarning}>
                  <Text style={styles.minOrderText}>
                    {region === 'KOR'
                      ? `Minimal buyurtma: ₩${effectiveMinKrw.toLocaleString('ko-KR')}. Yana ₩${shortfallKrw.toLocaleString('ko-KR')} qo'shing.`
                      : `Minimal buyurtma: ${(publicConfig?.minOrderUzbUzs ?? 0).toLocaleString()} so'm. Savatingizni to'ldiring.`}
                  </Text>
                </View>
              )}

              <View style={styles.priceDivider} />

              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>
                  {cargoFeeDisplay !== null ? 'Jami to\'lov' : 'Taxminiy jami'}
                </Text>
                <Text style={styles.totalVal}>
                  ₩{estimatedTotal.toLocaleString('ko-KR')}
                </Text>
              </View>

              {region === 'UZB' && (
                <Text style={styles.cargoNote}>
                  Kargo narxi quti va og'irlikka qarab aniqlanadi
                </Text>
              )}
            </View>

            {/* BANK DETAILS — visible before order so user can prepare */}
            {bankInfo?.bankName && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>To'lov rekvizitlari</Text>
                <View style={styles.bankCard}>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Bank</Text>
                    <Text style={styles.bankValue}>{bankInfo.bankName}</Text>
                  </View>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Hisob raqami</Text>
                    <Text style={styles.bankValue}>
                      {bankInfo.accountNumber}
                    </Text>
                  </View>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Egasi</Text>
                    <Text style={styles.bankValue}>{bankInfo.holderName}</Text>
                  </View>
                  <View style={[styles.bankRow, { marginTop: 8 }]}>
                    <Text style={[styles.bankLabel, { fontWeight: '500' }]}>
                      To'lov miqdori
                    </Text>
                    <Text style={[styles.bankValue, { fontSize: 17, fontWeight: '600' }]}>
                      {region === 'KOR' || cargoFeeDisplay !== null
                        ? `₩${estimatedTotal.toLocaleString('ko-KR')}`
                        : `₩${(cartSubtotal - couponDiscount + boxCost).toLocaleString('ko-KR')} + kargo`}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* RECEIPT UPLOAD (before order) */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Kvitansiya</Text>
              <Text style={styles.receiptNote}>
                To'lovni amalga oshirib, kvitansiyani yuklang
              </Text>

              {receiptUri ? (
                <View>
                  <Image
                    source={{ uri: receiptUri }}
                    style={styles.receiptPreview}
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => setReceiptUri(null)}
                    style={styles.removeReceipt}
                  >
                    <Text style={styles.removeReceiptText}>Boshqa rasm tanlash</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.uploadRow}>
                  <Pressable onPress={handlePickReceipt} style={styles.uploadBtn}>
                    <Text style={styles.uploadBtnText}>Galereyadan</Text>
                  </Pressable>
                  <Pressable onPress={handleCameraReceipt} style={styles.uploadBtn}>
                    <Text style={styles.uploadBtnText}>Kameradan</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </>
        )}

        {/* ═══════════════════════════ */}
        {/* STATE 2: ORDER PLACED      */}
        {/* ═══════════════════════════ */}
        {orderResult && (
          <>
            {/* ORDER CONFIRMED */}
            <View style={styles.section}>
              <Text style={styles.orderNumber}>{orderResult.orderNumber}</Text>
              <Text style={styles.orderStatus}>Buyurtma qabul qilindi</Text>
            </View>

            {/* FINAL PRICE BREAKDOWN */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>To'lov tafsiloti</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Mahsulotlar</Text>
                <Text style={styles.priceVal}>
                  ₩{orderResult.subtotal.toLocaleString('ko-KR')}
                </Text>
              </View>

              {orderResult.discountAmount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: tokens.colors.success }]}>
                    Kupon chegirmasi
                  </Text>
                  <Text style={[styles.priceVal, { color: tokens.colors.success }]}>
                    −₩{orderResult.discountAmount.toLocaleString('ko-KR')}
                  </Text>
                </View>
              )}

              {orderResult.boxCostKrw > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Quti</Text>
                  <Text style={styles.priceVal}>
                    ₩{orderResult.boxCostKrw.toLocaleString('ko-KR')}
                  </Text>
                </View>
              )}

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Kargo</Text>
                <Text style={styles.priceVal}>
                  ₩{orderResult.cargoFee.toLocaleString('ko-KR')}
                </Text>
              </View>

              <View style={styles.priceDivider} />

              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>Jami to'lov</Text>
                <Text style={styles.totalVal}>
                  ₩{orderResult.totalAmount.toLocaleString('ko-KR')}
                </Text>
              </View>
            </View>

            {/* BANK DETAILS (STATE 2) */}
            {bankInfo?.bankName && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Bank rekvizitlari</Text>
                <View style={styles.bankCard}>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Bank</Text>
                    <Text style={styles.bankValue}>{bankInfo.bankName}</Text>
                  </View>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Hisob raqami</Text>
                    <Pressable
                      onPress={async () => {
                        await Share.share({
                          message: bankInfo.accountNumber ?? ''
                        })
                      }}
                    >
                      <Text style={[styles.bankValue, { color: tokens.colors.primary }]}>
                        {bankInfo.accountNumber}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Egasi</Text>
                    <Text style={styles.bankValue}>{bankInfo.holderName}</Text>
                  </View>
                  <View style={[styles.priceDivider, { marginVertical: 12 }]} />
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>To'lov miqdori</Text>
                    <Text style={[styles.bankValue, { fontSize: 17, fontWeight: '600' }]}>
                      ₩{orderResult.totalAmount.toLocaleString('ko-KR')}
                    </Text>
                  </View>
                  <View style={[styles.bankRow, { marginTop: 4 }]}>
                    <Text style={styles.bankLabel}>Izoh (to'lovda)</Text>
                    <Pressable
                      onPress={async () => {
                        await Share.share({
                          message: orderResult.orderNumber
                        })
                      }}
                    >
                      <Text
                        style={[
                          styles.bankValue,
                          { color: tokens.colors.primary, fontWeight: '500' },
                        ]}
                      >
                        {orderResult.orderNumber}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {/* RECEIPT UPLOAD — STATE 2 */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Kvitansiya yuklash
              </Text>
              <Text style={styles.receiptNote}>
                To'lovni amalga oshirib, kvitansiyani
                yuklang. Admin tekshirib,
                buyurtmangizni tasdiqlaydi.
              </Text>

              {receiptUploaded ? (
                // STATE D: Success
                <View style={styles.uploadedBadge}>
                  <Feather
                    name="check-circle"
                    size={20}
                    color={tokens.colors.success}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadedTitle}>
                      Kvitansiya yuborildi
                    </Text>
                    <Text style={styles.uploadedSub}>
                      Admin tekshirib tasdiqlaydi
                    </Text>
                  </View>
                </View>
              ) : receiptUri ? (
                // STATE B & C: Image selected
                <View>
                  <View style={styles.receiptPreviewWrap}>
                    <Image
                      source={{ uri: receiptUri }}
                      style={[
                        styles.receiptPreview,
                        receiptUploading && { opacity: 0.5 }
                      ]}
                      resizeMode="cover"
                    />
                    {receiptUploading && (
                      <View style={styles.receiptOverlay}>
                        <ActivityIndicator
                          size="large"
                          color={tokens.colors.primary}
                        />
                        <Text style={
                          styles.receiptOverlayText}>
                          Yuklanmoqda...
                        </Text>
                      </View>
                    )}
                  </View>

                  {!receiptUploading && (
                    <>
                      <Pressable
                        onPress={handleUploadReceipt}
                        style={styles.uploadSubmitBtn}>
                        <Text style={
                          styles.uploadSubmitText}>
                          Yuborish
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          setReceiptUri(null)}
                        style={styles.changeReceiptBtn}>
                        <Text style={
                          styles.changeReceiptText}>
                          Boshqa rasm tanlash
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              ) : (
                // STATE A: No image yet
                <View>
                  {/* Skeleton placeholder */}
                  <View style={styles.receiptSkeleton}>
                    <Feather
                      name="image"
                      size={32}
                      color={tokens.colors.border}
                    />
                    <Text style={
                      styles.receiptSkeletonText}>
                      Kvitansiya rasmi shu yerga
                      yuklanadi
                    </Text>
                  </View>

                  <View style={styles.uploadRow}>
                    <Pressable
                      onPress={handlePickReceipt}
                      style={styles.uploadBtn}>
                      <Feather
                        name="image"
                        size={16}
                        color={tokens.colors.primary}
                      />
                      <Text style={styles.uploadBtnText}>
                        Galereya
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleCameraReceipt}
                      style={styles.uploadBtn}>
                      <Feather
                        name="camera"
                        size={16}
                        color={tokens.colors.primary}
                      />
                      <Text style={styles.uploadBtnText}>
                        Kamera
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* STICKY BOTTOM */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {!orderResult ? (
          // STATE 1 button
          <Pressable
            onPress={handleSubmit}
            disabled={
              submitting ||
              !selectedAddressId ||
              (region === 'UZB' && !selectedBoxId) ||
              isBelowMinOrder
            }
            style={[
              styles.primaryBtn,
              (submitting ||
                !selectedAddressId ||
                (region === 'UZB' && !selectedBoxId) ||
                isBelowMinOrder) &&
                styles.btnDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Buyurtmani tasdiqlash</Text>
            )}
          </Pressable>
        ) : (
          // STATE 2 button
          <Pressable
            onPress={() => router.replace('/orders')}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Buyurtmalarni ko'rish</Text>
          </Pressable>
        )}
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
  scroll: { flex: 1 },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  sectionLabel: {
    fontSize: 11,
    color: tokens.colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  // Products
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  productRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    backgroundColor: tokens.colors.surface,
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 14,
    color: tokens.colors.text,
    lineHeight: 20,
  },
  productQty: {
    fontSize: 13,
    color: tokens.colors.textMuted,
  },
  productPrice: {
    fontSize: 14,
    color: tokens.colors.text,
    minWidth: 72,
    textAlign: 'right',
  },
  // Coupon
  couponRow: {
    flexDirection: 'row',
    gap: 10,
  },
  couponInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.surface,
  },
  couponBtn: {
    height: 46,
    paddingHorizontal: 18,
    backgroundColor: tokens.colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponBtnDisabled: { opacity: 0.5 },
  couponBtnText: {
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.success,
  },
  couponCode: {
    fontSize: 14,
    fontWeight: '500',
    color: tokens.colors.success,
    marginBottom: 2,
  },
  couponDiscount: {
    fontSize: 13,
    color: tokens.colors.success,
  },
  couponLink: {
    fontSize: 13,
    color: tokens.colors.primary,
    marginTop: 10,
  },
  // Box
  weightNote: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginBottom: 14,
  },
  boxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: 8,
  },
  boxSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: '#f5f3ff',
  },
  boxDisabled: { opacity: 0.4 },
  boxName: {
    fontSize: 14,
    color: tokens.colors.text,
    marginBottom: 2,
  },
  boxMeta: {
    fontSize: 13,
    color: tokens.colors.textMuted,
  },
  boxError: {
    fontSize: 12,
    color: tokens.colors.error,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: tokens.colors.primary,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    color: '#fff',
  },
  // Radio
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: tokens.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.colors.primary,
  },
  // Address
  addrCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: 8,
  },
  addrCardSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: '#f5f3ff',
  },
  addrName: {
    fontSize: 14,
    color: tokens.colors.text,
    marginBottom: 2,
  },
  addrDetail: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginBottom: 1,
  },
  addrPhone: {
    fontSize: 13,
    color: tokens.colors.textMuted,
  },
  addAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addAddrText: {
    fontSize: 14,
    color: tokens.colors.primary,
  },
  // Price
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: tokens.colors.textMuted,
  },
  priceVal: {
    fontSize: 14,
    color: tokens.colors.text,
  },
  priceDivider: {
    height: 0.5,
    backgroundColor: tokens.colors.border,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    color: tokens.colors.text,
  },
  totalVal: {
    fontSize: 17,
    fontWeight: '600',
    color: tokens.colors.text,
  },
  cargoNote: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 10,
    lineHeight: 18,
  },
  // Bank
  bankCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 10,
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
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  // Receipt
  receiptNote: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginBottom: 14,
    lineHeight: 20,
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  uploadBtnText: {
    fontSize: 14,
    color: tokens.colors.primary,
  },
  receiptPreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 12,
  },
  removeReceipt: {
    alignItems: 'center',
    padding: 8,
  },
  removeReceiptText: {
    color: tokens.colors.primary,
    fontSize: 14,
  },
  uploadSubmitBtn: {
    backgroundColor: tokens.colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  uploadSubmitText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  uploadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: (tokens.colors as any).successLight ?? '#f0fdf4',
    borderRadius: 10,
  },
  uploadedText: {
    fontSize: 14,
    color: tokens.colors.success,
    flex: 1,
    lineHeight: 20,
  },
  // Order confirmed
  orderNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: tokens.colors.text,
    marginBottom: 4,
  },
  orderStatus: {
    fontSize: 14,
    color: tokens.colors.textMuted,
  },
  // Bottom bar
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: tokens.colors.border,
    backgroundColor: tokens.colors.background,
  },
  primaryBtn: {
    backgroundColor: tokens.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    color: tokens.colors.primary,
  },
  btnDisabled: { opacity: 0.5 },
  textMuted: {
    color: tokens.colors.textMuted,
  },
  minOrderWarning: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  minOrderText: {
    fontSize: 13,
    color: '#C2410C',
    lineHeight: 18,
  },
  receiptPreviewWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  receiptOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  receiptOverlayText: {
    fontSize: 14,
    color: tokens.colors.primary,
    fontWeight: '500',
  },
  receiptSkeleton: {
    height: 140,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
    backgroundColor: tokens.colors.surface,
  },
  receiptSkeletonText: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  uploadedTitle: {
    fontSize: 14,
    color: tokens.colors.success,
    fontWeight: '500',
    marginBottom: 2,
  },
  uploadedSub: {
    fontSize: 12,
    color: tokens.colors.success,
  },
  changeReceiptBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  changeReceiptText: {
    fontSize: 13,
    color: tokens.colors.textMuted,
  },
})

export default CheckoutScreen
