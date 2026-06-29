import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { tokens } from '../../lib/tokens'
import { addressService, type Address } from '../../services/address.service'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { useAuthStore } from '../../lib/auth-store'

export default function CheckoutAddressScreen() {
  const customer = useAuthStore((s) => s.customer)
  const { couponCode } = useLocalSearchParams<{ couponCode?: string }>()
  const {
    data: addresses = [],
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ['addresses'],
    queryFn: addressService.getAddresses,
    staleTime: 0,
  })

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id || (addresses.length > 0 ? addresses[0].id : null)
  )

  const handleContinue = () => {
    if (!selectedAddressId) return

    const isKOR = customer?.phoneRegion === 'KOR'

    if (isKOR) {
      router.push({
        pathname: '/checkout/payment',
        params: { addressId: selectedAddressId, couponCode },
      })
    } else {
      router.push({
        pathname: '/checkout/box',
        params: { addressId: selectedAddressId, couponCode },
      })
    }
  }

  const renderAddressCard = (item: Address) => {
    const isSelected = selectedAddressId === item.id
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.addressCard,
          {
            borderWidth: isSelected ? 1.5 : 0.5,
            borderColor: isSelected ? tokens.colors.primary : tokens.colors.border,
            backgroundColor: isSelected ? tokens.colors.primaryLight : tokens.colors.surface,
          },
        ]}
        onPress={() => setSelectedAddressId(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View
            style={[
              styles.radio,
              {
                borderColor: isSelected ? tokens.colors.primary : tokens.colors.textLight,
                backgroundColor: isSelected ? tokens.colors.primary : 'transparent',
              },
            ]}
          >
            {isSelected && <View style={styles.radioDot} />}
          </View>

          <View style={styles.cardMain}>
            <View style={styles.cardHeader}>
              <Text style={styles.fullName}>{item.fullName}</Text>
              {item.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Asosiy</Text>
                </View>
              )}
            </View>
            <Text style={styles.addressLine} numberOfLines={1}>
              {item.addressLine1}
            </Text>
            <View style={styles.regionRow}>
              <Text style={styles.flagText}>{item.regionCode === 'KOR' ? '🇰🇷' : '🇺🇿'}</Text>
              <Text style={styles.regionText}>{item.regionCode}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const insets = useSafeAreaInsets()

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={tokens.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yetkazib berish manzili</Text>
          <Text style={styles.stepIndicator}>1 / 3</Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontFamily: 'Inter_400Regular',
              color: tokens.colors.textMuted,
              flex: 1,
            }}
          >
            Buyurtma yetkaziladigan manzilni tanlang
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginLeft: 8, padding: 4 }}>
            <Feather name="refresh-cw" size={16} color={tokens.colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator color={tokens.colors.primary} style={{ marginTop: 40 }} />
        ) : addresses.length > 0 ? (
          <View style={styles.listContainer}>
            {addresses.map((addr) => renderAddressCard(addr))}

            <TouchableOpacity
              onPress={() => router.push('/profile/addresses')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 24,
                paddingVertical: 12,
                gap: 6,
              }}
            >
              <Feather name="plus-circle" size={15} color={tokens.colors.primary} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter_400Regular',
                  color: tokens.colors.primary,
                }}
              >
                Yangi manzil qo'shish yoki boshqarish
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="map-pin" size={48} color={tokens.colors.textLight} />
            <Text style={styles.emptyTitle}>Hali manzil saqlanmagan</Text>
            <Text style={styles.emptySub}>Davom etish uchun kamida bitta manzil qo'shing</Text>
            <View style={{ marginTop: 24, width: '100%' }}>
              <PrimaryButton
                label="Manzil qo'shish"
                onPress={() => router.push('/profile/addresses')}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {addresses.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <PrimaryButton
            label="Davom etish"
            disabled={!selectedAddressId}
            onPress={handleContinue}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 4,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  stepIndicator: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    width: 32,
    textAlign: 'right',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    flex: 1,
  },
  refreshBtn: {
    marginLeft: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 180,
  },
  listContainer: {
    paddingVertical: 4,
  },
  addressCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.white,
  },
  cardMain: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullName: {
    fontSize: 14,
    fontWeight: '400',
    color: tokens.colors.text,
  },
  addressLine: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  flagText: {
    fontSize: 12,
  },
  regionText: {
    fontSize: 11,
    color: tokens.colors.textMuted,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: tokens.colors.primary,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: tokens.colors.white,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 16,
  },
  manageBtnText: {
    fontSize: 13,
    color: tokens.colors.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: tokens.colors.text,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: tokens.colors.border,
    backgroundColor: tokens.colors.white,
  },
})
