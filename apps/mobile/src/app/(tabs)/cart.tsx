import React, { useCallback, useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useCartStore } from '../../lib/cart-store'
import { useAuthStore } from '../../lib/auth-store'
import { useExchangeStore } from '../../lib/exchange-store'
import { formatKRW, formatUZS, krwToUzs } from '../../lib/price'
import { tokens } from '../../lib/tokens'
import { cartService } from '../../services/cart.service'
import { productService, calculateKorCargo } from '../../services/product.service'
import { useQuery } from '@tanstack/react-query'
import PrimaryButton from '../../components/ui/PrimaryButton'
import EmptyState from '../../components/ui/EmptyState'

export default function CartScreen() {
  const insets = useSafeAreaInsets()
  const { cart, isLoading, fetchCart, updateItem, removeItem, clearCart } = useCartStore()
  const customer = useAuthStore((s) => s.customer)
  const exchangeRate = useExchangeStore((s) => s.rate)
  const showUzs = customer?.phoneRegion === 'UZB'
  const isKOR = customer?.phoneRegion === 'KOR'

  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<{
    discountAmount: number
    coupon: { id: string; code: string; type: string }
  } | null>(null)
  const [couponError, setCouponError] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  const { data: tiers } = useQuery({
    queryKey: ['kor-shipping-tiers'],
    queryFn: productService.getKorShippingTiers,
    enabled: isKOR,
    staleTime: 10 * 60 * 1000,
  })

  useFocusEffect(
    useCallback(() => {
      fetchCart()
    }, [fetchCart])
  )

  const handleClearCart = () => {
    Alert.alert('Savatni tozalash', "Haqiqatan ham barcha mahsulotlarni o'chirmoqchimisiz?", [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: clearCart,
      },
    ])
  }

  const handleRemoveItem = (id: string) => {
    Alert.alert("Mahsulotni o'chirish", "Ushbu mahsulotni savatdan o'chirmoqchimisiz?", [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: () => removeItem(id),
      },
    ])
  }

  const handleValidateCoupon = async () => {
    if (couponCode.length < 2) return
    setValidatingCoupon(true)
    setCouponError('')
    setCouponResult(null)
    try {
      const result = await cartService.validateCoupon(couponCode)
      setCouponResult(result)
    } catch (err: any) {
      setCouponError(err?.response?.data?.error?.message ?? 'Kupon topilmadi yoki muddati tugagan')
    } finally {
      setValidatingCoupon(false)
    }
  }

  const items = cart?.items ?? []
  const summary = cart?.summary ?? { itemCount: 0, subtotal: 0, currency: 'KRW' }

  const korCargo = isKOR && tiers ? calculateKorCargo(summary.subtotal, tiers) : null

  const finalTotal = couponResult
    ? summary.subtotal - couponResult.discountAmount + (korCargo ?? 0)
    : summary.subtotal + (korCargo ?? 0)

  if (isLoading && !cart) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Savat</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="shopping-bag"
            heading="Savat bo'sh"
            subtitle="Mahsulot qo'shish uchun katalogga o'ting"
            actionLabel="Katalogga o'tish"
            onAction={() => router.push('/(tabs)/categories')}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Savat</Text>
          {items.length > 0 && (
            <TouchableOpacity onPress={handleClearCart}>
              <Text style={styles.clearBtn}>Tozalash</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 280 }]}
      >
        {items.map((item) => (
          <View key={item.id} style={styles.cartCard}>
            <View style={styles.cardContent}>
              <View style={styles.imageContainer}>
                <Image source={item.imageUrls[0]} style={styles.itemImage} contentFit="cover" />
              </View>
              <View style={styles.itemInfo}>
                <View style={styles.itemInfoHeader}>
                  <Text style={styles.brandName}>{item.brandName}</Text>
                  <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                    <Feather name="trash-2" size={15} color={tokens.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>

                {item.isWholesale && <Text style={styles.wholesaleBadge}>Ulgurji</Text>}

                <View style={styles.priceRow}>
                  <Text style={styles.unitPrice}>{formatKRW(item.unitPrice)}</Text>

                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateItem(item.id, item.quantity - 1)}
                    >
                      <Feather name="minus" size={13} color={tokens.colors.textMuted} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[
                        styles.qtyBtn,
                        item.quantity >= item.stockAvailable && styles.qtyBtnDisabled,
                      ]}
                      onPress={() => updateItem(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stockAvailable}
                    >
                      <Feather name="plus" size={13} color={tokens.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {!item.inStock && <Text style={styles.errorText}>Tugagan</Text>}
              </View>
            </View>
          </View>
        ))}

        {/* COUPON SECTION */}
        <View style={styles.couponSection}>
          <Text style={styles.couponLabel}>Kupon kodi</Text>
          <View style={styles.couponInputRow}>
            <TextInput
              style={styles.couponInput}
              placeholder="Kupon kodini kiriting"
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[
                styles.couponApplyBtn,
                couponCode.length > 2
                  ? { backgroundColor: tokens.colors.primary }
                  : { backgroundColor: tokens.colors.skeleton },
              ]}
              onPress={handleValidateCoupon}
              disabled={couponCode.length < 2 || validatingCoupon}
            >
              {validatingCoupon ? (
                <ActivityIndicator size="small" color={tokens.colors.white} />
              ) : (
                <Text style={styles.couponApplyText}>Qo'llash</Text>
              )}
            </TouchableOpacity>
          </View>
          {couponError ? <Text style={styles.couponErrorText}>{couponError}</Text> : null}
          {couponResult ? (
            <View style={styles.couponSuccessRow}>
              <Feather name="check-circle" size={14} color={tokens.colors.success} />
              <Text style={styles.couponSuccessText}>
                Kupon qo'llanildi — {formatKRW(couponResult.discountAmount)} chegirma
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bottomSummary, { paddingBottom: insets.bottom + 60 }]}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Mahsulotlar:</Text>
          <Text style={styles.summaryValue}>{formatKRW(summary.subtotal)}</Text>
        </View>

        {isKOR && korCargo !== null && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Yetkazib berish:</Text>
            <Text style={[styles.summaryValue, korCargo === 0 && { color: '#16A34A' }]}>
              {korCargo === 0 ? 'Bepul ✓' : formatKRW(korCargo)}
            </Text>
          </View>
        )}

        {!isKOR && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kargo:</Text>
            <Text style={styles.summaryValue}>Quti tanlanganda</Text>
          </View>
        )}

        {couponResult && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: tokens.colors.success }]}>
              Kupon chegirmasi:
            </Text>
            <Text style={[styles.summaryValue, { color: tokens.colors.success }]}>
              - {formatKRW(couponResult.discountAmount)}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={[styles.summaryRow, { marginBottom: 14 }]}>
          <Text style={styles.totalLabel}>Jami:</Text>
          <Text style={styles.totalValue}>{formatKRW(finalTotal)}</Text>
        </View>

        {showUzs && (
          <Text style={styles.totalUzs}>≈ {formatUZS(krwToUzs(finalTotal, exchangeRate))}</Text>
        )}

        <View style={{ marginTop: 0 }}>
          <PrimaryButton
            label="Buyurtma berish"
            disabled={items.length === 0 || items.some((i) => !i.inStock)}
            onPress={() =>
              router.push({
                pathname: '/checkout/address',
                params: {
                  couponCode: couponResult?.coupon.code ?? '',
                },
              })
            }
          />
        </View>
      </View>
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: tokens.colors.text,
    margin: 'auto',
  },
  clearBtn: {
    fontSize: 13,
    color: tokens.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: tokens.colors.textSecondary,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginTop: 8,
  },
  scrollContent: {
    paddingTop: 8,
  },
  cartCard: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: tokens.colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    padding: 14,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: tokens.colors.background,
    overflow: 'hidden',
  },
  itemImage: {
    flex: 1,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandName: {
    fontSize: 11,
    color: tokens.colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
  itemName: {
    fontSize: 13,
    color: tokens.colors.text,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  wholesaleBadge: {
    backgroundColor: tokens.colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  wholesaleBadgeContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  wholesaleBadgeText: {
    fontSize: 10,
    color: '#16A34A',
    fontFamily: 'Inter_400Regular',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  unitPrice: {
    fontSize: 15,
    fontWeight: '500',
    color: tokens.colors.text,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '400',
    color: tokens.colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 11,
    color: tokens.colors.error,
    marginTop: 4,
  },
  couponSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  couponLabel: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginBottom: 8,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.surface,
  },
  couponApplyBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponApplyText: {
    fontSize: 13,
    color: tokens.colors.white,
    fontFamily: 'Inter_400Regular',
  },
  couponErrorText: {
    fontSize: 12,
    color: tokens.colors.error,
    marginTop: 6,
  },
  couponSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  couponSuccessText: {
    fontSize: 12,
    color: tokens.colors.success,
    marginLeft: 4,
  },
  bottomSummary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: tokens.colors.border,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: tokens.colors.textMuted,
  },
  summaryValue: {
    fontSize: 13,
    color: tokens.colors.text,
  },
  divider: {
    height: 0.5,
    backgroundColor: tokens.colors.border,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: tokens.colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '500',
    color: tokens.colors.text,
  },
  totalUzs: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    textAlign: 'right',
    marginBottom: 10,
  },
})
