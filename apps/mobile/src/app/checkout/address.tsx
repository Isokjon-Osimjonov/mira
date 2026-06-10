import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
        style={[styles.addressCard, isSelected && styles.addressCardSelected]}
        onPress={() => setSelectedAddressId(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={[styles.radio, isSelected && styles.radioSelected]}>
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
              <Text style={styles.regionText}>
                {item.regionCode === 'KOR' ? '🇰🇷 KOR' : '🇺🇿 UZB'}
              </Text>
              {item.city && (
                <Text style={styles.regionText}> · {item.city}</Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yetkazib berish manzili</Text>
        <Text style={styles.stepIndicator}>1 / 3</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator color={tokens.colors.primary} style={{ marginTop: 40 }} />
        ) : addresses.length > 0 ? (
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.sectionSubtitle}>
                Buyurtma yetkaziladigan manzilni tanlang
              </Text>
              <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
                <Feather name="refresh-cw" size={14} color={tokens.colors.primary} />
              </TouchableOpacity>
            </View>
            {addresses.map((addr) => renderAddressCard(addr))}
            
            <TouchableOpacity 
              onPress={() => router.push('/profile/addresses')}
              style={styles.manageBtn}
            >
              <Text style={styles.manageBtnText}>→ Manzillarni boshqarish</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="map-pin" size={48} color={tokens.colors.textLight} />
            <Text style={styles.emptyTitle}>Hali manzil saqlanmagan</Text>
            <Text style={styles.emptySub}>
              Davom etish uchun kamida bitta manzil qo'shing
            </Text>
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
        <View style={styles.bottomBar}>
          <PrimaryButton
            label="Davom etish"
            disabled={!selectedAddressId}
            onPress={handleContinue}
          />
        </View>
      )}
    </SafeAreaView>
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
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  stepIndicator: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    width: 40,
    textAlign: 'right',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  listContainer: {
    paddingVertical: 20,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  addressCard: {
    padding: 16,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    borderRadius: 14,
    marginHorizontal: 24,
    marginBottom: 10,
    backgroundColor: tokens.colors.surface,
  },
  addressCardSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight,
    borderWidth: 1.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: tokens.colors.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primary,
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
    gap: 6,
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
    padding: 24,
    borderTopWidth: 0.5,
    borderTopColor: tokens.colors.border,
    backgroundColor: tokens.colors.white,
  },
})
