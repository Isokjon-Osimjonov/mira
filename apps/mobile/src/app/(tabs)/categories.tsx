import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuthStore } from '../../lib/auth-store'
import { useRegionStore } from '../../lib/region-store'
import { useExchangeStore } from '../../lib/exchange-store'
import { productService } from '../../services/product.service'
import { ProductCard } from '../../components/ui/ProductCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import EmptyState from '../../components/ui/EmptyState'
import { tokens } from '../../lib/tokens'

interface Category {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
  children: Category[]
}

import { Alert } from 'react-native'
import { useCartStore } from '../../lib/cart-store'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2

export default function CategoriesScreen() {
  const params = useLocalSearchParams<{
    categoryId?: string
    sort?: string
  }>()

  // Track selection at each level
  const [selectedL1, setSelectedL1] = useState<Category | null>(null)
  const [selectedL2, setSelectedL2] = useState<Category | null>(null)
  const [selectedL3, setSelectedL3] = useState<Category | null>(null)

  // The actual categoryId to filter products by
  // = deepest selected level
  const activeCategoryId = selectedL3?.id ?? selectedL2?.id ?? selectedL1?.id ?? null

  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const customer = useAuthStore((s) => s.customer)
  const guestRegion = useRegionStore((s) => s.guestRegion)
  const activeRegion = customer?.phoneRegion || guestRegion
  const exchangeRate = useExchangeStore((s) => s.rate)
  const showUzs = activeRegion === 'UZB'

  const addItem = useCartStore((s) => s.addItem)
  const [addingId, setAddingId] = useState<string | null>(null)

  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data: categoriesData, refetch: refetchCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: productService.getCategories,
    staleTime: 5 * 60 * 1000,
  })

  // We use `category: activeCategoryId` instead of categoryId because our updated backend parameter is `category`
  const {
    data: popularData,
    isLoading: popularLoading,
    refetch: refetchPopular,
  } = useQuery({
    queryKey: ['products', 'bestselling', activeCategoryId, searchQuery, activeRegion],
    queryFn: () =>
      productService.getProducts({
        sort: 'bestselling',
        limit: 10,
        category: activeCategoryId ?? undefined,
        q: searchQuery ? searchQuery : undefined,
        region: activeRegion as any,
      }),
    staleTime: 2 * 60 * 1000,
  })

  const {
    data: newArrivalData,
    isLoading: newLoading,
    refetch: refetchNewArrivals,
  } = useQuery({
    queryKey: ['products', 'newest', activeCategoryId, searchQuery, activeRegion],
    queryFn: () =>
      productService.getProducts({
        sort: 'newest',
        limit: 20,
        category: activeCategoryId ?? undefined,
        q: searchQuery ? searchQuery : undefined,
        region: activeRegion as any,
      }),
    staleTime: 2 * 60 * 1000,
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchCategories(), refetchPopular(), refetchNewArrivals()])
    setIsRefreshing(false)
  }

  const categories = categoriesData ?? []
  const popularProducts = popularData?.data ?? []
  const newProducts = newArrivalData?.data ?? []

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

  const handleSelectL1 = (cat: Category) => {
    if (selectedL1?.id === cat.id) {
      // Deselect — collapse all
      setSelectedL1(null)
      setSelectedL2(null)
      setSelectedL3(null)
    } else {
      setSelectedL1(cat)
      setSelectedL2(null)
      setSelectedL3(null)
    }
  }

  const handleSelectL2 = (cat: Category) => {
    if (selectedL2?.id === cat.id) {
      setSelectedL2(null)
      setSelectedL3(null)
    } else {
      setSelectedL2(cat)
      setSelectedL3(null)
    }
  }

  const handleSelectL3 = (cat: Category) => {
    if (selectedL3?.id === cat.id) {
      setSelectedL3(null)
    } else {
      setSelectedL3(cat)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={tokens.colors.primary}
            colors={[tokens.colors.primary]}
          />
        }
      >
        {/* SEARCH BAR */}
        <View style={styles.searchWrapper}>
          <View
            style={[
              styles.searchContainer,
              {
                borderWidth: searchFocused ? 1 : 0.5,
                borderColor: searchFocused ? tokens.colors.primary : tokens.colors.border,
              },
            ]}
          >
            <Feather name="search" size={16} color={tokens.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Mahsulot qidiring..."
              placeholderTextColor={tokens.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
                <Feather name="x" size={16} color={tokens.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* FILTER PILLS */}
        <View style={styles.filtersContainer}>
          {/* LEVEL 1 — root categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
          >
            {/* Hammasi pill */}
            <TouchableOpacity
              style={[styles.pill, activeCategoryId === null && styles.pillActive]}
              onPress={() => {
                setSelectedL1(null)
                setSelectedL2(null)
                setSelectedL3(null)
              }}
            >
              <Text style={[styles.pillText, activeCategoryId === null && styles.pillTextActive]}>
                Hammasi
              </Text>
            </TouchableOpacity>

            {/* Root category pills */}
            {(categories as Category[]).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.pill, selectedL1?.id === cat.id && styles.pillActive]}
                onPress={() => handleSelectL1(cat)}
              >
                <Text
                  style={[styles.pillText, selectedL1?.id === cat.id && styles.pillTextActive]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
                {cat.children && cat.children.length > 0 && (
                  <Feather
                    name={selectedL1?.id === cat.id ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={
                      selectedL1?.id === cat.id ? tokens.colors.white : tokens.colors.textMuted
                    }
                    style={{ marginLeft: 4 }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* LEVEL 2 — children of selected L1 */}
          {selectedL1 && selectedL1.children && selectedL1.children.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.pillsRow, styles.pillsRowIndented]}
            >
              {selectedL1.children.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.pill,
                    styles.pillSm,
                    selectedL2?.id === cat.id && styles.pillActive,
                  ]}
                  onPress={() => handleSelectL2(cat)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      styles.pillTextSm,
                      selectedL2?.id === cat.id && styles.pillTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                  {cat.children && cat.children.length > 0 && (
                    <Feather
                      name={selectedL2?.id === cat.id ? 'chevron-up' : 'chevron-down'}
                      size={10}
                      color={
                        selectedL2?.id === cat.id ? tokens.colors.white : tokens.colors.textMuted
                      }
                      style={{ marginLeft: 3 }}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* LEVEL 3 — children of selected L2 */}
          {selectedL2 && selectedL2.children && selectedL2.children.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.pillsRow, styles.pillsRowIndented]}
            >
              {selectedL2.children.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.pill,
                    styles.pillSm,
                    selectedL3?.id === cat.id && styles.pillActive,
                  ]}
                  onPress={() => handleSelectL3(cat)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      styles.pillTextSm,
                      selectedL3?.id === cat.id && styles.pillTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* EMPTY STATE */}
        {!popularLoading &&
          !newLoading &&
          popularProducts.length === 0 &&
          newProducts.length === 0 && (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState
                icon="package"
                heading="Mahsulot topilmadi"
                subtitle="Boshqa kategoriyani tanlang"
              />
            </View>
          )}

        {/* POPULAR COLLECTION */}
        {popularProducts.length > 0 || popularLoading ? (
          <View style={styles.section}>
            <View style={styles.paddingX}>
              <SectionHeader title="Mashhur kolleksiya" />
            </View>

            {popularLoading ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              >
                {[1, 2, 3].map((i) => (
                  <View key={i} style={{ marginRight: 12 }}>
                    <SkeletonLoader width={CARD_WIDTH} height={220} borderRadius={16} />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={popularProducts}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
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
        ) : null}

        {/* NEW ARRIVALS GRID */}
        {newProducts.length > 0 || newLoading ? (
          <View style={[styles.section, { marginBottom: 100 }]}>
            <View style={styles.paddingX}>
              <SectionHeader title="Yangi kelishlar" />
            </View>

            {newLoading ? (
              <View style={styles.paddingX}>
                {[0, 1].map((row) => (
                  <View key={`row-${row}`} style={[styles.gridRow, { marginBottom: 12 }]}>
                    <SkeletonLoader width={CARD_WIDTH} height={220} borderRadius={16} />
                    <SkeletonLoader width={CARD_WIDTH} height={220} borderRadius={16} />
                  </View>
                ))}
              </View>
            ) : (
              <FlatList
                data={newProducts}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={styles.gridRow}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.paddingX}
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
        ) : null}
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
    marginBottom: 80,
  },
  searchWrapper: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
  },
  filtersContainer: {
    marginTop: tokens.spacing.sm,
    gap: 8,
  },
  pillsRow: {
    paddingHorizontal: tokens.spacing.lg,
    gap: 8,
    paddingBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillsRowIndented: {
    paddingLeft: tokens.spacing.xl,
  },
  pill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: tokens.colors.surface,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  pillSm: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  pillActive: {
    backgroundColor: tokens.colors.primary,
    borderWidth: 0,
  },
  pillText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textSecondary,
  },
  pillTextSm: {
    fontSize: 12,
  },
  pillTextActive: {
    color: tokens.colors.white,
    fontWeight: '500',
  },
  section: {
    marginTop: tokens.spacing.lg,
  },
  paddingX: {
    paddingHorizontal: 24,
  },
  listContent: {
    paddingHorizontal: 24,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textSecondary,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginTop: 8,
  },
})
