import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  Keyboard,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
const HISTORY_KEY = 'mira_search_history'
const MAX_HISTORY = 8

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const inputRef = useRef<TextInput>(null)

  const customer = useAuthStore((s) => s.customer)
  const addItem = useCartStore((s) => s.addItem)

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load history on mount
  useEffect(() => {
    SecureStore.getItemAsync(HISTORY_KEY)
      .then((data) => {
        if (data) setHistory(JSON.parse(data))
      })
      .catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 150)
  }, [])

  const saveToHistory = async (q: string) => {
    if (!q.trim() || q.trim().length < 2) return
    const updated = [q.trim(), ...history.filter((h) => h !== q.trim())].slice(0, MAX_HISTORY)
    setHistory(updated)
    await SecureStore.setItemAsync(HISTORY_KEY, JSON.stringify(updated))
  }

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () =>
      productService.getProducts({
        q: debouncedQuery,
        limit: 40,
      }),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
  })

  const results = data?.data ?? []
  const showResults = debouncedQuery.trim().length >= 2
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
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => saveToHistory(searchQuery)}
            placeholder="Mahsulot qidiring..."
            placeholderTextColor={tokens.colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('')
                setDebouncedQuery('')
                inputRef.current?.focus()
              }}
            >
              <Feather name="x" size={16} color={tokens.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* HINT */}
      {searchQuery.length === 1 && (
        <Text style={styles.hint}>Kamida 2 ta belgi kiriting</Text>
      )}

      {/* HISTORY / NO QUERY */}
      {!showResults && searchQuery.length !== 1 && (
        <View style={{ flex: 1 }}>
          {history.length > 0 ? (
            <View style={styles.historyContainer}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Oxirgi qidiruvlar</Text>
                <Pressable
                  onPress={async () => {
                    setHistory([])
                    await SecureStore.deleteItemAsync(HISTORY_KEY)
                  }}
                >
                  <Text style={styles.clearHistory}>Tozalash</Text>
                </Pressable>
              </View>
              {history.map((item, i) => (
                <Pressable
                  key={i}
                  style={styles.historyItem}
                  onPress={() => {
                    setSearchQuery(item)
                    setDebouncedQuery(item)
                    saveToHistory(item)
                  }}
                >
                  <Feather name="clock" size={14} color={tokens.colors.textMuted} />
                  <Text style={styles.historyText}>{item}</Text>
                  <Feather name="arrow-up-left" size={14} color={tokens.colors.textLight} style={{ marginLeft: 'auto' }} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState
                icon="search"
                heading="Qidiruv"
                subtitle="Mahsulot nomi, barkodi yoki brendini kiriting"
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
        <View style={styles.emptyState}>
          <Feather name="search" size={48} color={tokens.colors.border} />
          <Text style={styles.emptyTitle}>
            {`"${debouncedQuery}" bo'yicha`} natija topilmadi
          </Text>
          <Text style={styles.emptySubtitle}>
            Boshqa kalit so'z yoki brend nomi kiriting
          </Text>
          {history.length > 0 && (
            <Text style={styles.emptyHint}>
              Oldingi qidiruvlarni ko'rish uchun maydonni bo'shating
            </Text>
          )}
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
            keyboardShouldPersistTaps="handled"
            onScroll={() => Keyboard.dismiss()}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                showUzs={customer?.phoneRegion === 'UZB'}
                onPress={() => {
                  saveToHistory(debouncedQuery)
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
  hint: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  historyContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    fontWeight: '500',
  },
  clearHistory: {
    fontSize: 13,
    color: tokens.colors.primary,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  historyText: {
    fontSize: 14,
    color: tokens.colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyHint: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
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
