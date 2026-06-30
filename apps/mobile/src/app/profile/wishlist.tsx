import React, { useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { tokens } from '../../lib/tokens'
import { useWishlistStore } from '../../lib/wishlist-store'
import { useAuthStore } from '../../lib/auth-store'
import { useExchangeStore } from '../../lib/exchange-store'
import { useCartStore } from '../../lib/cart-store'
import { ProductCard } from '../../components/ui/ProductCard'
import { Toast, useToast } from '../../components/ui/Toast'
import EmptyState from '../../components/ui/EmptyState'

export default function WishlistScreen() {
  const { items, isLoading, fetchWishlist } = useWishlistStore()
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchWishlist()
    setIsRefreshing(false)
  }
  const toggle = useWishlistStore((s) => s.toggle)
  const customer = useAuthStore((s) => s.customer)
  const exchangeRate = useExchangeStore((s) => s.rate)
  const addItem = useCartStore((s) => s.addItem)
  const { toast, showToast, hideToast } = useToast()

  useFocusEffect(
    useCallback(() => {
      fetchWishlist()
    }, [fetchWishlist])
  )

  const handleAddToCart = async (productId: string) => {
    try {
      await addItem(productId, 1)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? "Savatga qo'shib bo'lmadi"
      showToast(msg, 'error')
    }
  }

  const handleLongPress = (productId: string) => {
    Alert.alert("O'chirish", "Mahsulotni sevimlilar ro'yxatidan o'chirmoqchimisiz?", [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: () => toggle(productId),
      },
    ])
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sevimlilar</Text>
        <View style={{ width: 40 }} />
      </View>

      {items.length === 0 && !isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="heart"
            heading="Sevimlilar ro'yxati bo'sh"
            subtitle="Yoqqan mahsulotlarni saqlab qo'ying"
            actionLabel="Mahsulotlarni ko'rish"
            onAction={() => router.push('/(tabs)/categories')}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={tokens.colors.primary}
              colors={[tokens.colors.primary]}
            />
          }
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <ProductCard
                product={item}
                showUzs={customer?.phoneRegion === 'UZB'}
                onPress={() => router.push(`/product/${item.id}`)}
                onAddToCart={() => handleAddToCart(item.id)}
                onLongPress={() => handleLongPress(item.id)}
              />
              {!item.inStock && (
                <View style={styles.oosOverlay} pointerEvents="none">
                  <View style={styles.oosBadge}>
                    <Text style={styles.oosText}>TUGAGAN</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        />
      )}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: tokens.colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.text,
  },
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  cardWrapper: {
    position: 'relative',
    width: '48%',
  },
  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: tokens.radius.lg,
  },
  oosBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#6B7280',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  oosText: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.white,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textLight,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginTop: 8,
  },
})
