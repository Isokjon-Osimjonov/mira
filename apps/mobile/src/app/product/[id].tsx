import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { tokens } from '../../lib/tokens'
import { productService } from '../../services/product.service'
import { useAuthStore } from '../../lib/auth-store'
import { useExchangeStore } from '../../lib/exchange-store'
import { useCartStore } from '../../lib/cart-store'
import { formatKRW, formatUZS, krwToUzs } from '../../lib/price'
import SkeletonLoader from '../../components/ui/SkeletonLoader'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const TABS = [
  { key: 'tavsif', label: 'Tavsif' },
  { key: 'ishlatish', label: 'Ishlatish' },
  { key: 'teri', label: 'Teri turi' },
  { key: 'foydalar', label: 'Foydalar' },
]

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams()
  const insets = useSafeAreaInsets()
  const customer = useAuthStore((s) => s.customer)
  const exchangeRate = useExchangeStore((s) => s.rate)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('tavsif')

  const addItem = useCartStore(s => s.addItem)
  const [isAdding, setIsAdding] = useState(false)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getProductById(id as string),
    enabled: !!id,
  })

  const showUzs = customer?.phoneRegion === 'UZB'

  const handleAddToCart = async () => {
    if (isAdding || !id) return
    setIsAdding(true)
    try {
      await addItem(id as string, 1)
      Alert.alert('Muvaffaqiyatli', 'Mahsulot savatga qo\'shildi', [{ text: 'OK' }])
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'REGION_MISMATCH') {
        Alert.alert(
          'Hudud mos kelmaydi',
          'Savatingizda boshqa hududdan mahsulot bor. Savatni tozalab qayta urinib ko\'ring.',
          [{ text: 'OK' }]
        )
      } else {
        Alert.alert(
          'Xatolik',
          err?.response?.data?.error?.message ?? 'Savatga qo\'shib bo\'lmadi'
        )
      }
    } finally {
      setIsAdding(false)
    }
  }

  const handleBuyNow = () => {
    console.log('Buy now:', id)
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

  // Get price from regional configs or flat field
  const getPrice = () => {
    // Try flat retailPrice first (from list endpoint format)
    if (product?.retailPrice) {
      return Number(product.retailPrice)
    }
    // Fall back to regionalConfigs
    const customerRegion = customer?.phoneRegion ?? 'UZB'
    const config = product?.regionalConfigs?.find(
      c => c.regionCode === customerRegion
    ) ?? product?.regionalConfigs?.[0]
    if (config?.retailPrice) {
      return Number(config.retailPrice)
    }
    return null
  }

  const price = product ? getPrice() : null

  const customerRegion = customer?.phoneRegion ?? 'UZB'
  const activeConfig = product?.regionalConfigs?.find(
    c => c.regionCode === customerRegion
  ) ?? product?.regionalConfigs?.[0]
  const wholesalePrice = activeConfig?.wholesalePrice
    ? Number(activeConfig.wholesalePrice)
    : null

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* IMAGE AREA */}
        <View style={styles.imageArea}>
          <Image
            source={product.imageUrls[activeImageIndex]}
            style={styles.mainImage}
            contentFit="contain"
          />

          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={tokens.colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.wishlistBtn, { top: insets.top + 12 }]}
            onPress={() => {}}
          >
            <Feather name="heart" size={20} color={tokens.colors.textLight} />
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

        {/* CONTENT */}
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

          {/* Wholesale price row */}
          {wholesalePrice && wholesalePrice !== price && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Ulgurji narx:</Text>
              <Text style={styles.wholesalePrice}>
                {formatKRW(wholesalePrice)}
              </Text>
              {showUzs && (
                <Text style={styles.wholesalePriceUzs}>
                  ≈ {formatUZS(krwToUzs(wholesalePrice, exchangeRate))}
                </Text>
              )}
            </View>
          )}

          {/* Min order qty */}
          {activeConfig?.minOrderQty > 1 && (
            <Text style={styles.minQty}>
              Minimal buyurtma: {activeConfig.minOrderQty} ta
            </Text>
          )}

          {/* Wholesale min qty */}
          {activeConfig?.minWholesaleQty && (
            <Text style={styles.minQty}>
              Ulgurji: {activeConfig.minWholesaleQty} tadan
            </Text>
          )}

          {/* Stock */}
          {product?.totalStock !== undefined && (
            <View style={styles.stockRow}>
              <View style={[
                styles.stockDot,
                {
                  backgroundColor:
                    product.totalStock === 0
                      ? tokens.colors.error
                      : product.totalStock <= 5
                      ? tokens.colors.warning
                      : tokens.colors.success
                }
              ]} />
              <Text style={styles.stockText}>
                {product.totalStock === 0
                  ? 'Tugagan'
                  : product.totalStock <= 5
                  ? `Faqat ${product.totalStock} ta qoldi`
                  : 'Mavjud'}
              </Text>
            </View>
          )}

          {/* TAB BAR */}
          <View style={styles.tabBar}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tabItem}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                  <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
                </TouchableOpacity>
              )
            })}
          </View>

          {/* TAB CONTENT */}
          <View style={styles.tabContent}>
            {activeTab === 'tavsif' && (
              <Text style={styles.contentText}>
                {product.descriptionUz || "Ma'lumot mavjud emas"}
              </Text>
            )}

            {activeTab === 'ishlatish' && (
              <Text style={styles.contentText}>{product.howToUseUz || "Ma'lumot mavjud emas"}</Text>
            )}

            {activeTab === 'teri' && (
              <View style={styles.pillWrap}>
                {product.skinTypes && product.skinTypes.length > 0 ? (
                  product.skinTypes.map((type, i) => (
                    <View key={i} style={styles.pillBadge}>
                      <Text style={styles.pillBadgeText}>{type}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.contentText}>Ma'lumot mavjud emas</Text>
                )}
              </View>
            )}

            {activeTab === 'foydalar' && (
              <View style={styles.benefitsWrap}>
                {product.benefits && product.benefits.length > 0 ? (
                  product.benefits.map((benefit, i) => (
                    <View key={i} style={styles.benefitRow}>
                      <View style={styles.benefitDot} />
                      <Text style={styles.contentText}>{benefit}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.contentText}>Ma'lumot mavjud emas</Text>
                )}
              </View>
            )}
          </View>

          {product.weightGrams ? (
            <Text style={styles.weightText}>Og'irligi: {product.weightGrams}g</Text>
          ) : null}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* FIXED BOTTOM BAR */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart} activeOpacity={0.8}>
          <Text style={styles.addToCartText}>Savatga qo'shish</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buyNowBtn} onPress={handleBuyNow} activeOpacity={0.8}>
          <Text style={styles.buyNowText}>Sotib olish</Text>
        </TouchableOpacity>
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
  imageArea: {
    height: SCREEN_HEIGHT * 0.45,
    backgroundColor: tokens.colors.surface,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
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
  },
  wishlistBtn: {
    position: 'absolute',
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.white,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  thumbList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  thumbItem: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: tokens.colors.primaryLight,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbItemActive: {
    borderColor: tokens.colors.primary,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  brandName: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.text,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  priceKrw: {
    fontSize: 20,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.primary,
  },
  priceUzs: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.textMuted,
    marginLeft: 8,
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
  },
  wholesalePrice: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.textSecondary,
  },
  wholesalePriceUzs: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
  },
  minQty: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginTop: 4,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.textMuted,
  },
  tabTextActive: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.primary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -0.5,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: tokens.colors.primary,
  },
  tabContent: {
    marginTop: 16,
    minHeight: 60,
  },
  contentText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textSecondary,
    lineHeight: 22,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillBadge: {
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textSecondary,
  },
  benefitsWrap: {
    gap: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.primary,
  },
  weightText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginTop: 16,
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
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
  },
  addToCartBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: tokens.colors.white,
    borderWidth: 1,
    borderColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.primary,
  },
  buyNowBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.white,
  },
})
