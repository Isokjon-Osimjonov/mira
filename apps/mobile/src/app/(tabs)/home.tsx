import React, { useEffect, useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useAuthStore } from '../../lib/auth-store'
import { useExchangeStore } from '../../lib/exchange-store'
import { productService } from '../../services/product.service'
import { ProductCard } from '../../components/ui/ProductCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import { tokens } from '../../lib/tokens'
import { formatKRW, formatUZS } from '../../lib/price'

import { Alert } from 'react-native'
import { useCartStore } from '../../lib/cart-store'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function HomeScreen() {
  const customer = useAuthStore((s) => s.customer)
  const setRate = useExchangeStore((s) => s.setRate)
  const addItem = useCartStore(s => s.addItem)
  const [addingId, setAddingId] = useState<string | null>(null)

  const fetchCart = useCartStore(s => s.fetchCart)
  useEffect(() => {
    fetchCart()
  }, [])

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: productService.getCategories,
    staleTime: 5 * 60 * 1000,
  })

  const { data: newProductsData, isLoading: newLoading } = useQuery({
    queryKey: ['products', 'newest'],
    queryFn: () => productService.getProducts({ sort: 'newest', limit: 10 }),
    staleTime: 2 * 60 * 1000,
  })

  const { data: bestsellerData, isLoading: bestLoading } = useQuery({
    queryKey: ['products', 'bestselling'],
    queryFn: () => productService.getProducts({ sort: 'bestselling', limit: 10 }),
    staleTime: 2 * 60 * 1000,
  })

  const { data: featuredData } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productService.getProducts({ featured: true, limit: 1 }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: rateData } = useQuery({
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
  const newProducts = newProductsData?.data ?? []
  const bestsellerProducts = bestsellerData?.data ?? []
  const featuredProduct = featuredData?.data?.[0] ?? null

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
      setAddingId(null)
    }
  }

  const renderCategoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => router.push({
        pathname: '/(tabs)/categories',
        params: { categoryId: item.id }
      })}
      activeOpacity={0.8}
    >
      <View style={styles.categoryIconCircle}>
        {item.imageUrl ? (
          <Image
            source={item.imageUrl}
            style={styles.categoryIcon}
            contentFit="cover"
          />
        ) : (
          <Feather name="grid" size={18} color={tokens.colors.primary} />
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
            <Feather name="bell" size={20} color={tokens.colors.text} />
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => {}} // Navigate to search screen later
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

        {/* PROMO BANNER */}
        <View style={styles.promoBanner}>
          <View style={styles.promoLeft}>
            <View style={styles.promoBadge}>
              <Feather name="truck" size={12} color={tokens.colors.white} />
              <Text style={styles.promoBadgeText}>Bepul yetkazib berish</Text>
            </View>
            <Text style={styles.promoTitle}>Yangi kolleksiya{'\n'}Nozik teri uchun</Text>
            <TouchableOpacity style={styles.promoBtn} activeOpacity={0.8}>
              <Text style={styles.promoBtnText}>Hozir xarid</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.promoRight}>
            {featuredProduct?.imageUrls[0] && (
              <Image
                source={featuredProduct.imageUrls[0]}
                style={styles.promoImage}
                contentFit="contain"
              />
            )}
          </View>
        </View>

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
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={newProducts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.paddingX}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  showUzs={customer?.phoneRegion === 'UZB'}
                  onPress={() => router.push(`/product/${item.id}`)}
                  onAddToCart={() => handleAddToCart(item.id)}
                />
              )}
            />
          )}
        </View>

        {/* BESTSELLERS */}
        <View style={[styles.section, { marginBottom: 100 }]}>
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
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={bestsellerProducts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.paddingX}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  showUzs={customer?.phoneRegion === 'UZB'}
                  onPress={() => router.push(`/product/${item.id}`)}
                  onAddToCart={() => handleAddToCart(item.id)}
                />
              )}
            />
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
    width: 140,
    height: 110,
    borderRadius: 16,
    backgroundColor: tokens.colors.surface,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    padding: 14,
    justifyContent: 'space-between',
  },
  categoryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: tokens.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  categoryIcon: {
    width: 52,
    height: 52,
  },
  categoryName: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.text,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  promoBanner: {
    marginHorizontal: 24,
    marginTop: 20,
    height: 140,
    borderRadius: 20,
    backgroundColor: tokens.colors.primary,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  promoLeft: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  promoBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.white,
    marginLeft: 4,
  },
  promoTitle: {
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.white,
    lineHeight: 24,
  },
  promoBtn: {
    marginTop: 12,
    backgroundColor: tokens.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    alignSelf: 'flex-start',
  },
  promoBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.primary,
  },
  promoRight: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoImage: {
    width: 120,
    height: 140,
  },
})
