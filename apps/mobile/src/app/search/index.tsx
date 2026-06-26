import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '../../lib/auth-store'
import { useExchangeStore } from '../../lib/exchange-store'
import { useCartStore } from '../../lib/cart-store'
import { productService } from '../../services/product.service'
import { ProductCard } from '../../components/ui/ProductCard'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import EmptyState from '../../components/ui/EmptyState'
import { tokens } from '../../lib/tokens'

const SCREEN_WIDTH = Dimensions.get('window').width
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2
const RECENT_KEY = 'mira_recent_searches'
const MAX_RECENT = 8

export default function SearchScreen() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<TextInput>(null)

  const customer = useAuthStore((s) => s.customer)
  const exchangeRate = useExchangeStore((s) => s.rate)
  const addItem = useCartStore((s) => s.addItem)

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  // Load recents + focus
  useEffect(() => {
    SecureStore.getItemAsync(RECENT_KEY)
      .then((val) => {
        if (val) setRecentSearches(JSON.parse(val))
      })
      .catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 150)
  }, [])

  const saveSearch = async (q: string) => {
    if (!q.trim()) return
    const updated = [q.trim(), ...recentSearches.filter((s) => s !== q.trim())].slice(0, MAX_RECENT)
    setRecentSearches(updated)
    await SecureStore.setItemAsync(RECENT_KEY, JSON.stringify(updated))
  }

  const clearRecent = async () => {
    setRecentSearches([])
    await SecureStore.deleteItemAsync(RECENT_KEY)
  }

  const handleRecentTap = (q: string) => {
    setQuery(q)
    setDebouncedQuery(q)
    saveSearch(q)
  }

  const handleSubmit = () => {
    if (query.trim()) {
      saveSearch(query.trim())
      setDebouncedQuery(query.trim())
      Keyboard.dismiss()
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () =>
      productService.getProducts({
        q: debouncedQuery,
        limit: 40,
      }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  })

  const results = data?.data ?? []
  const showResults = debouncedQuery.length >= 2
  const showEmpty = showResults && !isLoading && results.length === 0

  const handleAddToCart = async (productId: string) => {
    try {
      await addItem(productId, 1)
    } catch {}
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={tokens.colors.text} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={tokens.colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            placeholder="Mahsulot qidiring..."
            placeholderTextColor={tokens.colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('')
                setDebouncedQuery('')
                inputRef.current?.focus()
              }}
            >
              <Feather name="x" size={16} color={tokens.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* NO QUERY — show recents */}
      {!showResults && (
        <View style={styles.recentsContainer}>
          {recentSearches.length > 0 ? (
            <>
              <View style={styles.recentsHeader}>
                <Text style={styles.recentsTitle}>So'nggi qidiruvlar</Text>
                <TouchableOpacity onPress={clearRecent}>
                  <Text style={styles.clearText}>Tozalash</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.recentItem}
                  onPress={() => handleRecentTap(item)}
                >
                  <Feather name="clock" size={15} color={tokens.colors.textMuted} />
                  <Text style={styles.recentText}>{item}</Text>
                  <Feather name="arrow-up-left" size={14} color={tokens.colors.textLight} />
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState
                icon="search"
                heading="Qidiruv"
                subtitle="Mahsulot nomi yoki brendini kiriting"
              />
            </View>
          )}
        </View>
      )}

      {/* LOADING */}
      {showResults && isLoading && (
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} width={CARD_WIDTH} height={220} borderRadius={16} />
          ))}
        </View>
      )}

      {/* EMPTY RESULTS */}
      {showEmpty && (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="search"
            heading="Natija topilmadi"
            subtitle={`"${debouncedQuery}" bo'yicha hech narsa yo'q. Boshqa so'z bilan qidiring`}
          />
        </View>
      )}

      {/* RESULTS */}
      {showResults && !isLoading && results.length > 0 && (
        <>
          <View style={styles.resultCount}>
            <Text style={styles.resultCountText}>{results.length} ta natija</Text>
          </View>
          <FlatList
            data={results}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                showUzs={customer?.phoneRegion === 'UZB'}
                onPress={() => {
                  saveSearch(debouncedQuery)
                  router.push('/product/' + item.id)
                }}
                onAddToCart={() => handleAddToCart(item.id)}
              />
            )}
          />
        </>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: tokens.colors.surface,

    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.background,
    borderRadius: 24,
    height: 44,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
  },
  recentsContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  recentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentsTitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.text,
  },
  clearText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.primary,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
    gap: 10,
  },
  recentText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
  },
  emptyHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 12,
  },
  emptyHintText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    textAlign: 'center',
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  emptyResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.textSecondary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyHint2: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
  },
  resultCount: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  resultCountText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
  },
  grid: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    paddingTop: 4,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
})
