import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useQuery } from '@tanstack/react-query'
import { tokens } from '../../lib/tokens'
import api from '../../lib/api'
import { useCartStore } from '../../lib/cart-store'
import { useExchangeStore } from '../../lib/exchange-store'
import { formatKRW, formatUZS, krwToUzs } from '../../lib/price'
import { orderService, type CheckoutResult } from '../../services/order.service'
import { productService, calculateKorCargo } from '../../services/product.service'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { cartService } from '../../services/cart.service'
import { useAuthStore } from '../../lib/auth-store'
import { uploadService } from '../../services/upload.service'
import { boxService } from '../../services/box.service'

export default function CheckoutPaymentScreen() {
  const { addressId, couponCode: initialCouponCode, boxId } = useLocalSearchParams<{
    addressId?: string
    couponCode?: string
    boxId?: string
  }>()

  const insets = useSafeAreaInsets()
  const cart = useCartStore((s) => s.cart)
  const exchangeRate = useExchangeStore((s) => s.rate)
  const customer = useAuthStore((s) => s.customer)
  const isUZB = customer?.phoneRegion === 'UZB'

  const [couponResult, setCouponResult] = useState<any>(null)
  const [receiptUri, setReceiptUri] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState<CheckoutResult['paymentInfo'] | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'KOREAN_BANK' | 'UZB_BANK' | 'E9PAY'>(
    isUZB ? 'UZB_BANK' : 'KOREAN_BANK'
  )

  const { data: tiers } = useQuery({
    queryKey: ['kor-shipping-tiers'],
    queryFn: productService.getKorShippingTiers,
    enabled: !isUZB,
  })

  const { data: paymentSettings } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const res = await api.get('/settings/payment-info')
      return res.data.data
    },
  })

  const { data: boxes } = useQuery({
    queryKey: ['boxes'],
    queryFn: boxService.getBoxes,
    enabled: !!boxId,
  })
  const selectedBox = boxes?.find((b) => b.id === boxId)

  React.useEffect(() => {
    if (initialCouponCode) {
      handleValidateCoupon(initialCouponCode)
    }
  }, [initialCouponCode])

  const handleValidateCoupon = async (code: string) => {
    try {
      const res = await cartService.validateCoupon(code)
      if (res.valid) {
        setCouponResult(res)
      }
    } catch (err) {
      console.error('Coupon validation failed', err)
    }
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    })

    if (!result.canceled) {
      setReceiptUri(result.assets[0].uri)
    }
  }

  const handleCheckout = async () => {
    if (!receiptUri || !addressId) return
    setIsSubmitting(true)
    try {
      // Step 1: Upload to Cloudinary
      const receiptUrl = await uploadService.uploadReceipt(receiptUri)

      // Step 2: Create Order
      const result = await orderService.checkout({
        addressId: addressId,
        paymentMethod: selectedPaymentMethod,
        couponCode: couponResult?.coupon?.code ?? initialCouponCode,
        boxId: boxId,
      })
      
      setPaymentInfo(result.paymentInfo)

      // Step 3: Link receipt
      const orderTotalKrw = Number(result.order.totalAmount)
      const currentExchangeRate = useExchangeStore.getState().rate

      const paymentAmountForReceipt = isUZB
        ? krwToUzs(orderTotalKrw, currentExchangeRate)
        : orderTotalKrw
      const paymentCurrencyForReceipt: 'KRW' | 'UZS' = isUZB ? 'UZS' : 'KRW'

      await orderService.uploadReceipt(
        result.order.id,
        receiptUrl,
        paymentAmountForReceipt,
        paymentCurrencyForReceipt
      )

      await useCartStore.getState().clearCart()

      router.replace({
        pathname: '/checkout/confirmed',
        params: { 
          orderId: result.order.id,
          paymentInfoJson: JSON.stringify(result.paymentInfo)
        },
      })
    } catch (err: any) {
      Alert.alert('Xatolik', err?.response?.data?.error?.message ?? 'Buyurtma saqlanmadi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const subtotal = cart?.summary.subtotal ?? 0
  const discount = couponResult?.discountAmount ?? 0
  const korCargoFee = tiers ? calculateKorCargo(subtotal, tiers) : 0
  
  // Calculate cargo estimate for UZB
  const totalWeightKg = (cart?.items ?? []).reduce(
    (acc, item) => acc + ((item.weightGrams ?? 0) * item.quantity) / 1000,
    0
  )
  const selectedBoxWeight = selectedBox?.boxWeightKg ?? 0
  const totalWeightWithBox = totalWeightKg + Number(selectedBoxWeight)
  
  const cargoUsdPerKg = paymentSettings?.cargo?.uzbCargoUsdPerKg ?? 3
  const usdToKrw = paymentSettings?.rates?.usdToKrw ?? 1350
  
  const estimatedCargoKrw = isUZB
    ? Math.round(totalWeightWithBox * cargoUsdPerKg * usdToKrw / 100) * 100
    : null

  const boxAndCargo = (selectedBox?.costKrw ?? 0) + (estimatedCargoKrw ?? 0)

  const total = isUZB
    ? subtotal - discount + boxAndCargo
    : subtotal - discount + korCargoFee

  const infoRow = (label: string, value: string | null) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '...'}</Text>
    </View>
  )

  const renderPaymentMethod = (
    id: 'KOREAN_BANK' | 'UZB_BANK' | 'E9PAY',
    label: string,
    subLabel: string
  ) => {
    const selected = selectedPaymentMethod === id
    
    let displaySub = subLabel
    if (paymentSettings) {
      if (id === 'KOREAN_BANK') {
        const korLast4 = paymentSettings.kor?.bankNumber
          ? paymentSettings.kor.bankNumber.slice(-4)
          : null
        displaySub = (paymentSettings.kor?.bankName || '') + (korLast4 ? ' · ...' + korLast4 : '')
      } else if (id === 'UZB_BANK') {
        const uzbLast4 = paymentSettings.uzb?.bankNumber
          ? paymentSettings.uzb.bankNumber.slice(-4)
          : null
        displaySub = (paymentSettings.uzb?.bankName || 'Humo') + (uzbLast4 ? ' · ...' + uzbLast4 : '')
      } else if (id === 'E9PAY') {
        const e9Last4 = paymentSettings.e9pay?.account
          ? paymentSettings.e9pay.account.slice(-4)
          : null
        displaySub = e9Last4 ? '...' + e9Last4 : '---'
      }
    }

    return (
      <View key={id}>
        <TouchableOpacity
          style={[styles.methodOption, selected && styles.methodOptionSelected]}
          onPress={() => setSelectedPaymentMethod(id)}
          activeOpacity={0.7}
        >
          <View style={[styles.radioCircle, selected && styles.radioSelected]}>
            {selected && <View style={styles.radioDot} />}
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodLabel}>{label}</Text>
            <Text style={styles.methodSubLabel}>{displaySub}</Text>
          </View>
          {selected && (
            <Feather name="check" size={16} color={tokens.colors.primary} />
          )}
        </TouchableOpacity>

        {selected && id === 'KOREAN_BANK' && (paymentInfo || paymentSettings) && (
          <View style={styles.inlineInfo}>
            {infoRow(
              'Bank:',
              paymentInfo?.bankName || paymentSettings?.kor?.bankName || '---'
            )}
            {infoRow(
              'Hisob:',
              paymentInfo?.accountNumber || paymentSettings?.kor?.bankNumber || '---'
            )}
            {infoRow(
              'Egasi:',
              paymentInfo?.holderName || paymentSettings?.kor?.bankHolder || '---'
            )}
          </View>
        )}

        {selected && id === 'UZB_BANK' && (paymentInfo || paymentSettings) && (
          <View style={styles.inlineInfo}>
            {infoRow(
              'Bank:',
              paymentInfo?.bankName || paymentSettings?.uzb?.bankName || '---'
            )}
            {infoRow(
              'Hisob:',
              paymentInfo?.accountNumber || paymentSettings?.uzb?.bankNumber || '---'
            )}
            {infoRow(
              'Egasi:',
              paymentInfo?.holderName || paymentSettings?.uzb?.bankHolder || '---'
            )}
          </View>
        )}

        {selected && id === 'E9PAY' && (paymentInfo || paymentSettings) && (
          <View style={styles.inlineInfo}>
            {infoRow(
              'E9Pay:',
              paymentInfo?.accountNumber || paymentSettings?.e9pay?.account || '---'
            )}
            {infoRow(
              'Egasi:',
              paymentInfo?.holderName || paymentSettings?.e9pay?.name || '---'
            )}
          </View>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>To'lov</Text>
        <Text style={styles.stepIndicator}>{isUZB ? '3 / 3' : '2 / 2'}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ORDER SUMMARY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buyurtma xulosasi</Text>
          {cart?.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Image source={item.imageUrls[0]} style={styles.itemImage} contentFit="cover" />
              <View style={styles.itemMain}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemQty}>{item.quantity} ta</Text>
              </View>
              <Text style={styles.itemPrice}>{formatKRW(item.subtotal)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mahsulotlar:</Text>
            <Text style={styles.summaryValue}>{formatKRW(subtotal)}</Text>
          </View>

          {couponResult && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: tokens.colors.success }]}>
                Kupon chegirmasi:
              </Text>
              <Text style={[styles.summaryValue, { color: tokens.colors.success }]}>
                -{formatKRW(discount)}
              </Text>
            </View>
          )}

          {!isUZB && tiers && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Yetkazib berish:</Text>
              <Text style={[
                styles.summaryValue,
                korCargoFee === 0 && { color: tokens.colors.success }
              ]}>
                {korCargoFee === 0 ? 'Bepul ✓' : formatKRW(korCargoFee)}
              </Text>
            </View>
          )}

          {isUZB && boxAndCargo > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Yetkazib berish:</Text>
              <Text style={styles.summaryValue}>
                {'≈ ' + formatKRW(boxAndCargo)}
              </Text>
            </View>
          )}

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Jami:</Text>
            <Text style={styles.totalValue}>{formatKRW(total)}</Text>
          </View>

          {isUZB && (
            <View style={styles.summaryRow}>
              <View />
              <Text style={styles.summaryLabelSmall}>
                ≈ {formatUZS(krwToUzs(total, exchangeRate))}
              </Text>
            </View>
          )}
        </View>

        {/* PAYMENT METHOD SELECTOR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To'lov usuli</Text>
          {!isUZB ? (
            paymentSettings?.kor?.isEnabled !== false && renderPaymentMethod(
              'KOREAN_BANK',
              "Korea bank o'tkazmasi",
              `Toss · ${paymentInfo?.accountNumber ?? '...'}`
            )
          ) : (
            <>
              {paymentSettings?.uzb?.isEnabled !== false && renderPaymentMethod(
                'UZB_BANK',
                "O'zbekiston bank",
                `Humo · ${paymentInfo?.accountNumber ?? '...'}`
              )}
              {paymentSettings?.e9pay?.isEnabled !== false && renderPaymentMethod(
                'E9PAY',
                "E9Pay",
                paymentInfo?.accountNumber ?? '...'
              )}
            </>
          )}
        </View>

        {/* RECEIPT UPLOAD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To'lov cheki</Text>
          {!receiptUri ? (
            <TouchableOpacity 
              onPress={pickImage}
              style={styles.uploadPlaceholder}
              activeOpacity={0.7}
            >
              <Feather name="camera" size={28} color={tokens.colors.textMuted} />
              <Text style={styles.uploadText}>To'lov chekini yuklang</Text>
              <Text style={styles.uploadHint}>JPEG, PNG · Max 10MB</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.receiptContainer}>
              <Image source={{ uri: receiptUri }} style={styles.receiptImage} contentFit="cover" />
              <TouchableOpacity 
                style={styles.changeBtn} 
                onPress={pickImage}
                activeOpacity={0.8}
              >
                <View style={styles.changeBtnInner}>
                  <Text style={styles.changeText}>O'zgartirish</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          label="Buyurtmani tasdiqlash"
          loading={isSubmitting}
          disabled={!receiptUri || isSubmitting}
          onPress={handleCheckout}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  stepIndicator: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    width: 40,
    textAlign: 'right',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.text,
    marginBottom: 12,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    marginBottom: 8,
  },
  methodOptionSelected: {
    borderWidth: 1.5,
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: tokens.colors.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.white,
  },
  methodInfo: {
    marginLeft: 12,
    flex: 1,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: tokens.colors.text,
    fontFamily: 'Inter_400Regular',
  },
  methodSubLabel: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  inlineInfo: {
    backgroundColor: tokens.colors.background,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginLeft: 32,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    width: 60,
    fontFamily: 'Inter_400Regular',
  },
  infoValue: {
    fontSize: 12,
    color: tokens.colors.text,
    flex: 1,
    fontFamily: 'Inter_400Regular',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: tokens.colors.background,
  },
  itemMain: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
  },
  itemQty: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
  },
  divider: {
    height: 0.5,
    backgroundColor: tokens.colors.border,
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
  },
  summaryLabelSmall: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
  },
  cargoNotice: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    textAlign: 'right',
    marginTop: -4,
    marginBottom: 8,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: tokens.colors.border,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.text,
  },
  uploadPlaceholder: {
    height: 140,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: tokens.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.background,
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    color: tokens.colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
  uploadHint: {
    fontSize: 11,
    color: tokens.colors.textLight,
    fontFamily: 'Inter_400Regular',
  },
  receiptContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
  },
  receiptImage: {
    flex: 1,
  },
  changeBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  changeBtnInner: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  changeText: {
    color: tokens.colors.white,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  bottomBar: {
    padding: 24,
    borderTopWidth: 0.5,
    borderTopColor: tokens.colors.border,
    backgroundColor: tokens.colors.white,
  },
})
