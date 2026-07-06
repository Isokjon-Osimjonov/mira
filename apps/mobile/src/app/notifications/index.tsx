import React, { useState, useCallback } from 'react'
import { FlatList, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router, useFocusEffect } from 'expo-router'
import { notificationService, Notification } from '../../services/notification.service'
import { useAuthStore } from '../../lib/auth-store'
import { requireAuth } from '../../lib/require-auth'
import { formatDate } from '../../lib/price'
import { tokens } from '../../lib/tokens'
import EmptyState from '../../components/ui/EmptyState'

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  ORDER_STATUS: {
    icon: 'shopping-bag',
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  PAYMENT_CONFIRMED: {
    icon: 'check-circle',
    color: '#16A34A',
    bg: '#F0FDF4',
  },
  PAYMENT_REJECTED: {
    icon: 'x-circle',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  SHIPPED: {
    icon: 'truck',
    color: '#0369A1',
    bg: '#F0F9FF',
  },
  DELIVERED: {
    icon: 'package',
    color: '#16A34A',
    bg: '#F0FDF4',
  },
  CANCELED: {
    icon: 'x',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  DEFAULT: {
    icon: 'bell',
    color: tokens.colors.primary,
    bg: tokens.colors.primaryLight,
  },
}

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
    staleTime: 30000,
  })

  useFocusEffect(
    useCallback(() => {
      if (!requireAuth(useAuthStore.getState().isAuthenticated, router, '/notifications')) return
      refetch()
    }, [refetch])
  )

  const notifications = data?.items ?? []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markRead = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleNotificationPress = (notif: Notification) => {
    if (!notif.isRead) markRead.mutate(notif.id)
    if (notif.orderId) {
      router.push(`/orders/${notif.orderId}`)
    }
  }

  const renderItem = ({ item }: { item: Notification }) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.DEFAULT

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleNotificationPress(item)}
        style={[
          styles.notificationItem,
          { backgroundColor: !item.isRead ? '#FAFAFA' : tokens.colors.white },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
          <Feather name={config.icon as any} size={18} color={config.color} />
        </View>

        <View style={styles.content}>
          <Text
            style={[styles.notifTitle, { fontWeight: !item.isRead ? '500' : '400' }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.notifBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notifTime}>{formatDate(item.createdAt)}</Text>
        </View>

        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirishnomalar</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAllRead.mutate()}>
            <Feather name="check-circle" size={22} color={tokens.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Yuklanmoqda...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="bell-off"
            heading="Bildirishnomalar yo'q"
            subtitle="Buyurtmalaringiz haqida xabarlar shu yerda ko'rinadi"
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
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
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  markAllText: {
    fontSize: 12,
    color: tokens.colors.primary,
    fontWeight: '500',
    width: 60,
    textAlign: 'right',
  },
  listContent: {
    paddingBottom: 100,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderColor: tokens.colors.border,
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  notifTitle: {
    fontSize: 14,
    color: tokens.colors.text,
  },
  notifBody: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  notifTime: {
    fontSize: 11,
    color: tokens.colors.textLight,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.primary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: tokens.colors.textMuted,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 15,
    color: tokens.colors.textSecondary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
})
