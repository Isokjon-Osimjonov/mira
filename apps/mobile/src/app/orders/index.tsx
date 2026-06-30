import React, { useState, useCallback, useEffect } from 'react'
import { FlatList, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { router, useFocusEffect } from 'expo-router'
import { orderService } from '../../services/order.service'
import { useAuthStore } from '../../lib/auth-store'
import { requireAuth } from '../../lib/require-auth'
import { formatKRW, formatDate, formatCountdown } from '../../lib/price'
import { tokens } from '../../lib/tokens'
import PrimaryButton from '../../components/ui/PrimaryButton'
import EmptyState from '../../components/ui/EmptyState'

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  PENDING_PAYMENT: { label: "To'lov kutilmoqda", bg: '#FFF7ED', color: '#C2410C' },
  PAYMENT_SUBMITTED: { label: 'Tekshirilmoqda', bg: '#FEFCE8', color: '#A16207' },
  PAYMENT_REJECTED: { label: 'Rad etildi', bg: '#FEF2F2', color: '#DC2626' },
  PAYMENT_CONFIRMED: { label: 'Tasdiqlandi', bg: '#EFF6FF', color: '#2563EB' },
  PACKING: { label: 'Tayyorlanmoqda', bg: '#F5F3FF', color: '#7C3AED' },
  SHIPPED: { label: "Yo'lda", bg: '#F0F9FF', color: '#0369A1' },
  DELIVERED: { label: 'Yetkazildi', bg: '#F0FDF4', color: '#16A34A' },
  CANCELED: { label: 'Bekor qilindi', bg: '#FEF2F2', color: '#DC2626' },
}

function CountdownBadge({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <View style={styles.countdownBadge}>
      <Text style={styles.countdownText}>⏰ {formatCountdown(deadline)}</Text>
    </View>
  )
}

function SkeletonLoader() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader} />
      <View style={styles.skeletonDate} />
      <View style={styles.skeletonFooter} />
    </View>
  )
}

export default function OrdersScreen() {
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getOrders(),
    staleTime: 0,
  })

  useFocusEffect(
    useCallback(() => {
      if (!requireAuth(useAuthStore.getState().isAuthenticated, router, '/orders')) return
      refetch()
    }, [refetch])
  )

  const orders = data?.items ?? []

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const renderItem = ({ item }: { item: any }) => {
    const status = STATUS_MAP[item.status] || {
      label: item.status,
      bg: tokens.colors.background,
      color: tokens.colors.text,
    }

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/orders/${item.id}`)}
        style={styles.orderCard}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <Text style={styles.itemCount}>{item.itemCount} ta mahsulot</Text>
          <Text style={styles.totalAmount}>{formatKRW(item.totalAmount)}</Text>
        </View>

        {item.status === 'PENDING_PAYMENT' && item.paymentDeadline && (
          <CountdownBadge deadline={item.paymentDeadline} />
        )}
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buyurtmalarim</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading && !refreshing ? (
        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          <SkeletonLoader />
          <SkeletonLoader />
          <SkeletonLoader />
        </View>
      ) : !isLoading && orders.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="shopping-bag"
            heading="Hali buyurtma yo'q"
            subtitle="Birinchi xaridingizni amalga oshiring"
            actionLabel="Xarid qilish"
            onAction={() => router.replace('/(tabs)/home')}
          />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={tokens.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: tokens.colors.background,
  },
  backBtn: {
    width: 24,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: tokens.colors.white,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: tokens.colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginBottom: 8,
  },
  divider: {
    height: 0.5,
    backgroundColor: tokens.colors.border,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  itemCount: {
    fontSize: 13,
    color: tokens.colors.textSecondary,
    flex: 1,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '500',
    color: tokens.colors.text,
  },
  countdownBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  countdownText: {
    fontSize: 12,
    color: '#C2410C',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 15,
    color: tokens.colors.textLight,
    marginTop: 16,
  },
  skeletonCard: {
    height: 100,
    backgroundColor: tokens.colors.white,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    padding: 16,
    marginBottom: 12,
    opacity: 0.6,
  },
  skeletonHeader: {
    height: 16,
    width: '60%',
    backgroundColor: tokens.colors.background,
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonDate: {
    height: 12,
    width: '40%',
    backgroundColor: tokens.colors.background,
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonFooter: {
    height: 16,
    width: '100%',
    backgroundColor: tokens.colors.background,
    borderRadius: 4,
  },
})
