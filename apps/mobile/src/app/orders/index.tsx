import React, { useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { tokens } from '../../lib/tokens'
import { orderService, type Order } from '../../services/order.service'
import { formatKRW, formatDate, formatCountdown } from '../../lib/price'
import PrimaryButton from '../../components/ui/PrimaryButton'

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  PENDING_PAYMENT: {
    label: "To'lov kutilmoqda",
    bg: '#FFF7ED',
    color: '#C2410C',
  },
  PAYMENT_SUBMITTED: {
    label: 'Tekshirilmoqda',
    bg: '#FEFCE8',
    color: '#A16207',
  },
  PAYMENT_REJECTED: {
    label: 'Rad etildi',
    bg: '#FEF2F2',
    color: '#DC2626',
  },
  PAYMENT_CONFIRMED: {
    label: 'Tasdiqlandi',
    bg: '#EFF6FF',
    color: '#2563EB',
  },
  PACKING: {
    label: 'Tayyorlanmoqda',
    bg: '#F5F3FF',
    color: '#7C3AED',
  },
  SHIPPED: {
    label: "Yo'lda",
    bg: '#F0F9FF',
    color: '#0369A1',
  },
  DELIVERED: {
    label: 'Yetkazildi',
    bg: '#F0FDF4',
    color: '#16A34A',
  },
  CANCELED: {
    label: 'Bekor qilindi',
    bg: '#FEF2F2',
    color: '#DC2626',
  },
}

export default function OrdersScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getOrders(),
    staleTime: 0,
  })

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  const orders = data?.items ?? []

  const renderOrderCard = ({ item }: { item: Order }) => {
    const status = STATUS_MAP[item.status] || {
      label: item.status,
      bg: '#F3F4F6',
      color: '#374151',
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
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <Text style={styles.itemCount}>
            {(item as any).itemCount || item.items?.length || 0} ta mahsulot
          </Text>
          <Text style={styles.totalAmount}>{formatKRW(item.totalAmount)}</Text>
        </View>

        {item.status === 'PENDING_PAYMENT' && item.paymentExpiresAt && (
          <View style={styles.deadlineBox}>
            <Text style={styles.deadlineText}>
              ⏰ {formatCountdown(item.paymentExpiresAt)}
            </Text>
          </View>
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
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="shopping-bag" size={48} color={tokens.colors.textLight} />
          <Text style={styles.emptyTitle}>Buyurtmalar yo'q</Text>
          <View style={{ marginTop: 24, width: '100%', paddingHorizontal: 40 }}>
            <PrimaryButton
              label="Xarid qilish"
              onPress={() => router.replace('/(tabs)/home')}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContent}
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
    backgroundColor: tokens.colors.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 15,
    color: tokens.colors.textSecondary,
    marginTop: 16,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: tokens.colors.white,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    padding: 16,
    marginBottom: 12,
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
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCount: {
    fontSize: 13,
    color: tokens.colors.textSecondary,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '500',
    color: tokens.colors.text,
  },
  deadlineBox: {
    marginTop: 8,
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deadlineText: {
    fontSize: 12,
    color: '#C2410C',
  },
})
