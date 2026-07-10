import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Share,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { tokens } from '../../lib/tokens'
import { useQuery } from '@tanstack/react-query'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'

export default function CouponsScreen() {
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available')

  const {
    data: availableCoupons,
    isLoading: isAvailableLoading,
    refetch: refetchAvailable,
    isRefetching: isAvailableRefetching,
  } = useQuery({
    queryKey: ['coupons-available'],
    queryFn: async () => {
      const res = await api.get('/coupons/available')
      return res.data?.data || []
    },
  })

  const {
    data: myRedemptions,
    isLoading: isRedemptionsLoading,
    refetch: refetchRedemptions,
    isRefetching: isRedemptionsRefetching,
  } = useQuery({
    queryKey: ['coupons-redemptions'],
    queryFn: async () => {
      const res = await api.get('/coupons/my-redemptions')
      return res.data?.data || []
    },
  })

  const handleCopyCode = async (code: string) => {
    await Share.share({ message: code })
  }

  const renderAvailableCoupon = ({ item }: { item: any }) => {
    const isPercentage = item.type === 'PERCENTAGE'
    const discountText = isPercentage
      ? `${item.value}% chegirma`
      : `₩${item.value.toLocaleString()} chegirma`

    const capText = item.maxDiscountCap
      ? ` (maksimum ₩${item.maxDiscountCap.toLocaleString()})`
      : ''

    let minOrderText = null
    if (item.minOrderAmount > 0) {
      minOrderText = `₩${item.minOrderAmount.toLocaleString()} dan yuqori buyurtmada`
    }

    let expiryText = null
    if (item.expiresAt) {
      const d = new Date(item.expiresAt)
      const formatted = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} gacha`
      expiryText = formatted
    }

    const isUsed = item.usedByCustomer

    return (
      <View style={[styles.card, isUsed && styles.cardUsed]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Feather name="tag" size={20} color={tokens.colors.primary} />
          </View>
          <Text style={styles.cardName}>{item.name}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.discountText}>
            {discountText}
            {capText}
          </Text>
          {minOrderText && <Text style={styles.detailText}>{minOrderText}</Text>}
          {expiryText && <Text style={styles.detailText}>{expiryText}</Text>}
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity onPress={() => handleCopyCode(item.code)} style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>{item.code}</Text>
          </TouchableOpacity>
          {isUsed ? (
            <View style={styles.usedBadge}>
              <Text style={styles.usedBadgeText}>Ishlatilgan</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() =>
                router.push({ pathname: '/checkout', params: { couponCode: item.code } })
              }
              style={styles.cartBtn}
            >
              <Text style={styles.cartBtnText}>Qo'llash →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  const renderRedemption = ({ item }: { item: any }) => {
    let usedAtText = ''
    if (item.usedAt) {
      const d = new Date(item.usedAt)
      usedAtText = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
    }

    return (
      <View style={styles.card}>
        <View style={styles.redemptionHeader}>
          <Text style={styles.redemptionTitle}>
            <Text style={{ fontWeight: '600' }}>{item.couponName}</Text> ·{' '}
            <Text style={{ color: tokens.colors.textMuted }}>{item.couponCode}</Text>
          </Text>
          <Text style={styles.redemptionAmount}>-₩{item.discountAmount.toLocaleString()}</Text>
        </View>
        <View style={styles.redemptionFooter}>
          <TouchableOpacity onPress={() => router.push(`/orders/${item.orderId}`)}>
            <Text style={styles.orderLink}>#{item.orderNumber} →</Text>
          </TouchableOpacity>
          <Text style={styles.redemptionDate}>{usedAtText}</Text>
        </View>
      </View>
    )
  }

  const isLoading = activeTab === 'available' ? isAvailableLoading : isRedemptionsLoading
  const isRefetching = activeTab === 'available' ? isAvailableRefetching : isRedemptionsRefetching
  const data = activeTab === 'available' ? availableCoupons : myRedemptions
  const handleRefresh = activeTab === 'available' ? refetchAvailable : refetchRedemptions

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kuponlarim</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.tabActive]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
            Mavjud kuponlar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Ishlatilgan kuponlar
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {!isLoading && data?.length === 0 ? (
        <ScrollView 
          contentContainerStyle={{ flex: 1, justifyContent: 'center' }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={tokens.colors.primary}
              colors={[tokens.colors.primary]}
            />
          }
        >
          {activeTab === 'available' ? (
            <EmptyState
              icon="tag"
              heading="Hozircha mavjud kuponlar yo'q"
              subtitle="Kuponlar paydo bo'lganda bu yerda ko'rinadi"
            />
          ) : (
            <EmptyState
              icon="clock"
              heading="Siz hali kupon ishlatmagansiz"
              subtitle="Ishlatilgan kuponlar tarixi shu yerda ko'rinadi"
            />
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => (activeTab === 'available' ? item.id : item.orderId)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={tokens.colors.primary}
              colors={[tokens.colors.primary]}
            />
          }
          renderItem={activeTab === 'available' ? renderAvailableCoupon : renderRedemption}
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  tabActive: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
  },
  tabTextActive: {
    color: tokens.colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardUsed: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.text,
    flex: 1,
  },
  cardBody: {
    marginBottom: 16,
  },
  discountText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.text,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: tokens.colors.border,
    paddingTop: 12,
  },
  codeBadge: {
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  codeBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.text,
    letterSpacing: 1,
  },
  cartBtn: {
    backgroundColor: tokens.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cartBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.primary,
  },
  usedBadge: {
    backgroundColor: tokens.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  usedBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.textMuted,
  },
  redemptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  redemptionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
    flex: 1,
    marginRight: 10,
  },
  redemptionAmount: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.error,
  },
  redemptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLink: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.primary,
  },
  redemptionDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
  },
})
