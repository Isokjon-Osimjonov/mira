import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { tokens } from '../../lib/tokens'
import { productService } from '../../services/product.service'
import { waitlistService } from '../../services/waitlist.service'
import { useAuthStore } from '../../lib/auth-store'
import { useExchangeStore } from '../../lib/exchange-store'
import { useCartStore } from '../../lib/cart-store'
import { useWishlistStore } from '../../lib/wishlist-store'
import { formatKRW, formatUZS, krwToUzs } from '../../lib/price'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import { Toast, useToast } from '../../components/ui/Toast'
import CartBadgeIcon from '../../components/ui/CartBadgeIcon'
import { requireAuth } from '../../lib/require-auth'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const WaitlistButton = ({ productId, showToast }: { productId: string; showToast: any }) => {
  const [isOnWaitlist, setIsOnWaitlist] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!useAuthStore.getState().isAuthenticated) return

    waitlistService
      .getWaitlist()
      .then((items) => {
        setIsOnWaitlist(items.some((i) => i.id === productId))
      })
      .catch(() => {})
  }, [productId])

  const handlePress = async () => {
    if (isOnWaitlist) return
    if (!requireAuth(useAuthStore.getState().isAuthenticated, router, `/product/${productId}`))
      return

    setIsLoading(true)
    try {
      const result = await waitlistService.addToWaitlist(productId)
      if (result.inStock) {
        showToast("Mahsulot mavjud! Savatga qo'shishingiz mumkin", 'info')
      } else {
        setIsOnWaitlist(true)
        showToast("Kutish ro'yxatiga qo'shildingiz ✓", 'success')
      }
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'WAITLIST_ALREADY_EXISTS') {
        setIsOnWaitlist(true)
      } else {
        showToast(err?.response?.data?.error?.message ?? 'Xatolik', 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TouchableOpacity
      style={[styles.waitlistBtn, isOnWaitlist && styles.waitlistBtnActive]}
      onPress={handlePress}
      disabled={isOnWaitlist || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={tokens.colors.primary} />
      ) : (
        <>
          <Feather
            name={isOnWaitlist ? 'check' : 'bell'}
            size={18}
            color={isOnWaitlist ? tokens.colors.success : tokens.colors.white}
          />
          <Text style={[styles.waitlistBtnText, isOnWaitlist && { color: tokens.colors.success }]}>
            {isOnWaitlist ? "Kutish ro'yxatidasiz" : "Mavjud bo'lganda xabardor qiling"}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams()
  const insets = useSafeAreaInsets()
  const customer = useAuthStore((s) => s.customer)
  const exchangeRate = useExchangeStore((s) => s.rate)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const { toast, showToast, hideToast } = useToast()

  const addItem = useCartStore((s) => s.addItem)
  const [isAdding, setIsAdding] = useState(false)

  const toggleWishlist = useWishlistStore((s) => s.toggle)
  const productIds = useWishlistStore((s) => s.productIds)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getProductById(id as string),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  })

  const isWishlisted = product ? productIds.has(product.id) : false

  const showUzs = customer?.phoneRegion === 'UZB'



  const totalStock = Number(product?.totalStock ?? 0)
  const isOutOfStock = totalStock === 0

  const handleAddToCart = async () => {
    if (isAdding || !id || isOutOfStock) return
    setIsAdding(true)
    try {
      await addItem(id as string, 1)
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'REGION_MISMATCH') {
        showToast('Savatda boshqa hududdan mahsulot bor', 'error')
      } else {
        showToast(err?.response?.data?.error?.message ?? "Savatga qo'shib bo'lmadi", 'error')
      }
    } finally {
      setIsAdding(false)
    }
  }

  const handleWishlistToggle = () => {
    if (!product) return
    if (!requireAuth(useAuthStore.getState().isAuthenticated, router, `/product/${product.id}`))
      return
    toggleWishlist(product.id)
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonLoader width={SCREEN_WIDTH} height={SCREEN_HEIGHT * 0.45} />
        <View style={{ padding: 24 }}>
          <SkeletonLoader width={100} height={12} borderRadius={4} />
          <View style={{ height: 8 }} />
          <SkeletonLoader width={200} height={24} borderRadius={4} />
          <View style={{ height: 16 }} />
          <SkeletonLoader width={150} height={20} borderRadius={4} />
        </View>
      </View>
    )
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>Mahsulot topilmadi</Text>
      </View>
    )
  }

  const getPrice = () => {
    if (product?.retailPrice) return Number(product.retailPrice)
    const customerRegion = customer?.phoneRegion ?? 'UZB'
    const config =
      product?.regionalConfigs?.find((c) => c.regionCode === customerRegion) ??
      product?.regionalConfigs?.[0]
    return config?.retailPrice ? Number(config.retailPrice) : null
  }

  const price = getPrice()
  const customerRegion = customer?.phoneRegion ?? 'UZB'
  const activeConfig =
    product?.regionalConfigs?.find((c) => c.regionCode === customerRegion) ??
    product?.regionalConfigs?.[0]
  const wholesalePrice = activeConfig?.wholesalePrice ? Number(activeConfig.wholesalePrice) : null

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageArea}>
          <Image
            source={product.imageUrls[activeImageIndex]}
            style={styles.mainImage}
            contentFit="cover"
          />
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={tokens.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleWishlistToggle}
            style={[styles.wishlistBtn, { top: insets.top + 12 }]}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.wishlistIconCircle,
                isWishlisted ? styles.wishlistIconCircleActive : undefined,
              ]}
            >
              <Feather
                name="heart"
                size={18}
                color={isWishlisted ? tokens.colors.white : tokens.colors.text}
              />
            </View>
          </TouchableOpacity>
          <View style={styles.thumbContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={product.imageUrls}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={styles.thumbList}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => setActiveImageIndex(index)}
                  style={[styles.thumbItem, activeImageIndex === index && styles.thumbItemActive]}
                >
                  <Image source={item} style={styles.thumbImage} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.brandName}>{product.brandName}</Text>
          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceKrw}>
              {price !== null ? formatKRW(price) : 'Narx mavjud emas'}
            </Text>
            {showUzs && price !== null && (
              <Text style={styles.priceUzs}>≈ {formatUZS(krwToUzs(price, exchangeRate))}</Text>
            )}
          </View>

          {wholesalePrice && wholesalePrice !== price && (
            <View style={styles.priceRow}>
              <Text style={styles.wholesalePrice}>{formatKRW(wholesalePrice)}</Text>
              {showUzs && (
                <Text style={styles.wholesalePriceUzs}>
                  ≈ {formatUZS(krwToUzs(wholesalePrice, exchangeRate))}
                </Text>
              )}
            </View>
          )}

          {Boolean(activeConfig?.minWholesaleQty) && (
            <Text style={styles.wholesaleQtyText}>
              {'Ulgurji: ' + String(activeConfig?.minWholesaleQty) + ' tadan boshlab'}
            </Text>
          )}

          {(activeConfig?.minOrderQty ?? 0) > 1 && (
            <Text style={styles.minQty}>Minimal buyurtma: {activeConfig?.minOrderQty} ta</Text>
          )}

          <View style={styles.detailSections}>
            {/* Tavsif */}
            {Boolean(product.descriptionUz) && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionHeading}>Tavsif</Text>
                <Text style={styles.sectionBody}>{product.descriptionUz}</Text>
              </View>
            )}

            {/* Qo'llash usuli */}
            {Boolean(product.howToUseUz) && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionHeading}>Qo'llash usuli</Text>
                <Text style={styles.sectionBody}>{product.howToUseUz}</Text>
              </View>
            )}

            {/* Tarkibi */}
            {Boolean(product.ingredients?.length) && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionHeading}>Tarkibi</Text>
                <View style={styles.pillWrap}>
                  {product.ingredients!.map((item, i) => (
                    <View key={i} style={styles.pillBadge}>
                      <Text style={styles.pillBadgeText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Teri turlari */}
            {Boolean(product.skinTypes?.length) && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionHeading}>Teri turlari</Text>
                <View style={styles.pillWrap}>
                  {product.skinTypes!.map((type, i) => (
                    <View key={i} style={styles.pillBadge}>
                      <Text style={styles.pillBadgeText}>{type}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Foydali xususiyatlari */}
            {Boolean(product.benefits?.length) && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionHeading}>Foydali xususiyatlari</Text>
                <View style={styles.benefitsList}>
                  {product.benefits!.map((benefit, i) => (
                    <Text key={i} style={styles.sectionBody}>
                      {benefit}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Weight — standalone, below all sections */}
          {product.weightGrams ? (
            <Text style={styles.weightText}>{"Og'irligi: " + product.weightGrams + 'g'}</Text>
          ) : null}
          <View style={{ height: 140 }} />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {isOutOfStock ? (
          <View style={styles.oosContainer}>
            <Text style={styles.oosText}>Bu mahsulot hozir mavjud emas</Text>
            <View style={styles.actionRow}>
              <View style={styles.cartIconWrapper}>
                <CartBadgeIcon size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <WaitlistButton productId={product.id} showToast={showToast} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <View style={styles.cartIconWrapper}>
              <CartBadgeIcon size={22} />
            </View>
            <TouchableOpacity
              style={[styles.addToCartBtnMain, { flex: 1 }]}
              onPress={handleAddToCart}
              disabled={isAdding}
              activeOpacity={0.8}
            >
              {isAdding ? (
                <ActivityIndicator color={tokens.colors.white} />
              ) : (
                <Feather name="shopping-bag" size={18} color={tokens.colors.white} />
              )}
              <Text style={styles.addToCartTextMain}>
                {isAdding ? "Qo'shilmoqda..." : "Savatga qo'shish"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageArea: {
    height: SCREEN_HEIGHT * 0.46,
    backgroundColor: tokens.colors.background,
    position: 'relative',
  },
  mainImage: { width: '100%', height: '100%' },
  backBtn: {
    position: 'absolute',
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.white,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  wishlistBtn: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
  },
  wishlistIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
  },
  wishlistIconCircleActive: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  thumbContainer: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' },
  thumbList: { paddingHorizontal: 24, gap: 12 },
  thumbItem: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: tokens.colors.primaryLight,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbItemActive: { borderColor: tokens.colors.primary },
  thumbImage: { width: '100%', height: '100%' },
  content: { paddingHorizontal: 24, paddingTop: 20 },

  brandName: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
    color: tokens.colors.text,
    marginTop: 4,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },

  priceKrw: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.amber,
  },
  priceUzs: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.amber,
    marginLeft: 8,
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginRight: 6,
  },
  wholesalePrice: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.green,
  },
  wholesalePriceUzs: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.green,
    marginLeft: 6,
  },
  wholesaleQtyText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  minQty: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginTop: 4,
  },
  detailSections: {
    marginTop: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
    color: tokens.colors.text,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.textSecondary,
    lineHeight: 21,
  },
  benefitsList: {
    gap: 6,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillBadge: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.textSecondary,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  weightText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.colors.white,
    borderTopWidth: 0.5,
    borderTopColor: tokens.colors.border,
    paddingHorizontal: 24,
    paddingTop: 12,
    zIndex: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartBtnMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: tokens.colors.primary,
  },
  addToCartTextMain: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.white,
  },
  oosContainer: { gap: 8 },
  oosText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
  waitlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: tokens.colors.primary,
  },
  waitlistBtnActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: tokens.colors.success,
  },
  waitlistBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.white,
  },
})
