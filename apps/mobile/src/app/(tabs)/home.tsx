import React, { useEffect, useState, useRef } from 'react'
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  Linking,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useAuthStore } from '../../lib/auth-store'
import { useRegionStore } from '../../lib/region-store'
import { useExchangeStore } from '../../lib/exchange-store'
import { productService } from '../../services/product.service'
import { bannerService, Banner } from '../../services/banner.service'
import { ProductCard } from '../../components/ui/ProductCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import EmptyState from '../../components/ui/EmptyState'
import { tokens } from '../../lib/tokens'
import { formatKRW, formatUZS } from '../../lib/price'
import { notificationService } from '../../services/notification.service'

import { Alert } from 'react-native'
import { useCartStore } from '../../lib/cart-store'
import { useWishlistStore } from '../../lib/wishlist-store'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function HomeScreen() {
  const customer = useAuthStore((s) => s.customer)
  const guestRegion = useRegionStore((s) => s.guestRegion)
  const activeRegion = customer?.phoneRegion || guestRegion
  const showUzs = activeRegion === 'UZB'

  const setRate = useExchangeStore((s) => s.setRate)
  const addItem = useCartStore((s) => s.addItem)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [activeBannerIdx, setActiveBannerIdx] = useState(0)
  const bannerScrollRef = useRef<FlatList>(null)

  const fetchCart = useCartStore((s) => s.fetchCart)
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist)

  useEffect(() => {
    fetchCart()
    fetchWishlist()
  }, [fetchCart, fetchWishlist])

  const [isRefreshing, setIsRefreshing] = useState(false)

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: productService.getCategories,
    staleTime: 5 * 60 * 1000,
  })

  const { data: bannersData, refetch: refetchBanners } = useQuery({
    queryKey: ['banners'],
    queryFn: bannerService.getBanners,
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: newProductsData,
    isLoading: newLoading,
    refetch: refetchNew,
  } = useQuery({
    queryKey: ['products', 'newest', activeRegion],
    queryFn: () =>
      productService.getProducts({
        sort: 'newest',
        limit: 10,
        region: activeRegion,
        isNew: true,
      } as any),
    staleTime: 2 * 60 * 1000,
  })

  const {
    data: bestsellerData,
    isLoading: bestLoading,
    refetch: refetchBest,
  } = useQuery({
    queryKey: ['products', 'bestselling', activeRegion],
    queryFn: () =>
      productService.getProducts({
        sort: 'bestselling',
        limit: 10,
        region: activeRegion,
        featured: true,
      } as any),
    staleTime: 2 * 60 * 1000,
  })

  const { data: rateData, refetch: refetchRate } = useQuery({
    queryKey: ['exchange-rate'],
    queryFn: productService.getExchangeRate,
    staleTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (rateData?.rate) {
      setRate(rateData.rate, rateData.updatedAt)
    }
  }, [rateData, setRate])

  const categories = categoriesData ?? []
  const banners = bannersData ?? []
  const newProducts = newProductsData?.data ?? []
  const bestsellerProducts = bestsellerData?.data ?? []

  const [page, setPage] = useState(1)
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const result = await productService.getProducts({
        page,
        limit: 20,
        region: activeRegion,
      } as any)
      const newProds = result.data ?? []
      if (newProds.length < 20) {
        setHasMore(false)
      }
      setAllProducts((prev) => [...prev, ...newProds])
      setPage((p) => p + 1)
    } catch {
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadMore()
  }, [])

  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => {
      const nextIdx = (activeBannerIdx + 1) % banners.length
      setActiveBannerIdx(nextIdx)
      bannerScrollRef.current?.scrollToIndex({
        index: nextIdx,
        animated: true,
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [activeBannerIdx, banners.length])

  const { data: unreadData, refetch: refetchUnread } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: notificationService.getUnreadCount,
    enabled: !!customer,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
  const unreadCount = unreadData ?? 0

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([
      refetchCategories(),
      refetchBanners(),
      refetchNew(),
      refetchBest(),
      refetchRate(),
      refetchUnread(),
    ])
    setIsRefreshing(false)
  }

  const handleAddToCart = async (productId: string) => {
    if (addingId) return
    setAddingId(productId)
    try {
      await addItem(productId, 1)
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'REGION_MISMATCH') {
        Alert.alert(
          'Hudud mos kelmaydi',
          "Savatingizda boshqa hududdan mahsulot bor. Savatni tozalab qayta urinib ko'ring.",
          [{ text: 'OK' }]
        )
      } else {
        Alert.alert('Xatolik', err?.response?.data?.error?.message ?? "Savatga qo'shib bo'lmadi")
      }
    } finally {
      setAddingId(null)
    }
  }

  const handleBannerPress = (banner: Banner) => {
    switch (banner.linkType) {
      case 'product':
        if (banner.linkValue) {
          router.push('/product/' + banner.linkValue)
        }
        break
      case 'category':
        router.push('/(tabs)/categories')
        break
      case 'external':
      case 'wholesale':
        if (banner.linkValue) {
          Linking.openURL(banner.linkValue)
        }
        break
      default:
        break
    }
  }

  const renderCategoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() =>
        router.push({
          pathname: '/(tabs)/categories',
          params: { categoryId: item.id, categoryName: item.name },
        })
      }
      activeOpacity={0.8}
    >
      <View style={styles.categoryIconCircle}>
        {item.imageUrl ? (
          <Image source={item.imageUrl} style={styles.categoryIcon} contentFit="cover" />
        ) : (
          <Feather name="grid" size={18} color={tokens.colors.textMuted} />
        )}
      </View>
      <Text style={styles.categoryName} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  )

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={({ nativeEvent }) => {
          if (
            nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
            nativeEvent.contentSize.height - 400
          ) {
            loadMore()
          }
        }}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={tokens.colors.primary}
            colors={[tokens.colors.primary]}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              {customer?.profileImageUrl ? (
                <Image source={customer.profileImageUrl} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {getInitials(customer?.firstName ?? 'M')}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Salom,</Text>
              <Text style={styles.userName}>{customer?.firstName ?? 'Mehmon'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/notifications')}
          >
            <View>
              <Feather name="bell" size={20} color={tokens.colors.text} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => router.push('/search')}
        >
          <Feather
            name="search"
            size={16}
            color={tokens.colors.textMuted}
            style={styles.searchIcon}
          />
          <Text style={styles.searchText}>Mahsulot qidiring...</Text>
        </TouchableOpacity>

        {/* CATEGORIES ROW */}
        <View style={styles.section}>
          <View style={styles.paddingX}>
            <SectionHeader
              title="Kategoriyalar"
              onSeeAll={() => router.push('/(tabs)/categories')}
            />
          </View>
          {categoriesLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            >
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={{ marginRight: 12 }}>
                  <SkeletonLoader width={140} height={110} borderRadius={16} />
                </View>
              ))}
            </ScrollView>
          ) : categories.length === 0 ? (
            <EmptyState
              compact
              icon="layers"
              heading="Kategoriyalar tayyorlanmoqda"
              subtitle="Tez orada bu yerda paydo bo'ladi"
            />
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={renderCategoryItem}
              contentContainerStyle={styles.categoriesList}
            />
          )}
        </View>

        {/* DYNAMIC BANNERS */}
        {banners.length > 0 && (
          <View style={styles.bannerSection}>
            <FlatList
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={banners}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 48))
                setActiveBannerIdx(idx)
              }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => handleBannerPress(item)}
                  style={styles.bannerCard}
                >
                  <Image source={item.imageUrl} style={styles.bannerImage} contentFit="cover" />
                </TouchableOpacity>
              )}
            />

            {/* Dot indicators (only if multiple banners) */}
            {banners.length > 1 && (
              <View style={styles.bannerDots}>
                {banners.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.bannerDot,
                      idx === activeBannerIdx ? styles.bannerDotActive : styles.bannerDotInactive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* NEW ARRIVALS */}
        <View style={styles.section}>
          <View style={styles.paddingX}>
            <SectionHeader
              title="Yangi mahsulotlar"
              onSeeAll={() =>
                router.push({
                  pathname: '/(tabs)/categories',
                  params: { sort: 'newest' },
                })
              }
            />
          </View>
          {newLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paddingX}
            >
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ marginRight: 12 }}>
                  <SkeletonLoader
                    width={(SCREEN_WIDTH - 48) / 2}
                    height={220}
                    borderRadius={tokens.radius.lg}
                  />
                </View>
              ))}
            </ScrollView>
          ) : newProducts.length === 0 ? (
            <EmptyState
              compact
              icon="gift"
              heading="Yangi mahsulotlar kutilmoqda"
              subtitle="Yaqin kunlarda qo'shiladi"
            />
          ) : (
            <FlatList
              key="new-products-2col"
              data={newProducts}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
              scrollEnabled={false}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  showUzs={showUzs}
                  onPress={() => router.push(`/product/${item.id}`)}
                  onAddToCart={() => handleAddToCart(item.id)}
                />
              )}
            />
          )}
        </View>

        {/* BESTSELLERS */}
        <View style={[styles.section, { marginBottom: 20 }]}>
          <View style={styles.paddingX}>
            <SectionHeader
              title="Ommabop mahsulotlar"
              onSeeAll={() =>
                router.push({
                  pathname: '/(tabs)/categories',
                  params: { sort: 'bestselling' },
                })
              }
            />
          </View>
          {bestLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paddingX}
            >
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ marginRight: 12 }}>
                  <SkeletonLoader
                    width={(SCREEN_WIDTH - 48) / 2}
                    height={220}
                    borderRadius={tokens.radius.lg}
                  />
                </View>
              ))}
            </ScrollView>
          ) : bestsellerProducts.length === 0 ? (
            <EmptyState
              compact
              icon="star"
              heading="Hali ommabop mahsulot yo'q"
              subtitle="Birinchi xaridorlardan biri bo'ling"
            />
          ) : (
            <FlatList
              key="featured-products-2col"
              data={bestsellerProducts}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
              scrollEnabled={false}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  showUzs={showUzs}
                  onPress={() => router.push(`/product/${item.id}`)}
                  onAddToCart={() => handleAddToCart(item.id)}
                />
              )}
            />
          )}
        </View>

        {/* ALL PRODUCTS */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <View style={styles.paddingX}>
            <SectionHeader title="Barcha mahsulotlar" />
          </View>
          <FlatList
            key="all-products-2col"
            data={allProducts}
            keyExtractor={(item, index) => item.id + '-' + index}
            numColumns={2}
            columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                showUzs={showUzs}
                onPress={() => router.push(`/product/${item.id}`)}
                onAddToCart={() => handleAddToCart(item.id)}
              />
            )}
          />
          {allProducts.length > 0 && (
            loadingMore ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator color={tokens.colors.primary} />
              </View>
            ) : hasMore ? (
              <View style={{ height: 20 }} />
            ) : (
              <Text style={styles.endText}>
                Barcha mahsulotlar ko'rsatildi
              </Text>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  endText: {
    textAlign: 'center',
    color: tokens.colors.textMuted,
    fontSize: 13,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: tokens.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.primary,
  },
  headerText: {
    marginLeft: 10,
  },
  greeting: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    fontWeight: '300',
    color: tokens.colors.textMuted,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.text,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.surface,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: tokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: tokens.colors.surface,
  },
  badgeText: {
    color: tokens.colors.white,
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
  },
  searchBar: {
    height: 48,
    borderRadius: 24,
    backgroundColor: tokens.colors.surface,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    marginHorizontal: 24,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
  },
  section: {
    marginTop: 20,
  },
  paddingX: {
    paddingHorizontal: 24,
  },
  categoriesList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  categoryCard: {
    width: 160,
    height: 130,
    borderRadius: 16,
    backgroundColor: tokens.colors.surface,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    padding: 10,
    justifyContent: 'space-between',
  },
  categoryIconCircle: {
    width: '100%',
    height: 82,
    borderRadius: 10,
    backgroundColor: tokens.colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  categoryIcon: {
    width: '100%',
    height: 82,
  },
  categoryName: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.text,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  bannerSection: {
    marginHorizontal: 24,
    marginTop: 20,
  },
  bannerCard: {
    width: SCREEN_WIDTH - 48,
    height: ((SCREEN_WIDTH - 48) * 7) / 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  bannerDot: {
    height: 6,
    borderRadius: 3,
  },
  bannerDotActive: {
    width: 20,
    backgroundColor: tokens.colors.primary,
  },
  bannerDotInactive: {
    width: 6,
    backgroundColor: tokens.colors.border,
  },
})
