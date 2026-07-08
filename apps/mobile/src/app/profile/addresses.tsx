import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tokens } from '../../lib/tokens'
import { addressService, type Address } from '../../services/address.service'
import PrimaryButton from '../../components/ui/PrimaryButton'
import EmptyState from '../../components/ui/EmptyState'

export default function AddressesScreen() {
  const queryClient = useQueryClient()
  const {
    data: addresses = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['addresses'],
    queryFn: addressService.getAddresses,
  })

  const handleSetDefault = async (id: string) => {
    try {
      await addressService.setDefault(id)
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
    } catch (err: any) {
      Alert.alert('Xatolik', err?.response?.data?.error?.message ?? 'Xatolik yuz berdi')
    }
  }

  const handleDelete = (id: string) => {
    Alert.alert("O'chirish", "Ushbu manzilni o'chirmoqchimisiz?", [
      { text: 'Bekor', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: async () => {
          try {
            await addressService.deleteAddress(id)
            queryClient.invalidateQueries({ queryKey: ['addresses'] })
          } catch (err: any) {
            Alert.alert('Xatolik', err?.response?.data?.error?.message ?? 'Xatolik yuz berdi')
          }
        },
      },
    ])
  }

  const renderAddressCard = ({ item }: { item: Address }) => {
    const isDefault = item.isDefault
    return (
      <View style={[styles.addressCard, isDefault && styles.addressCardDefault]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.flagBadge}>
              <Text style={{ fontSize: 14 }}>{item.regionCode === 'KOR' ? 'KOR' : 'UZB'}</Text>
            </View>
            <Text style={styles.addressLabel}>{item.label || item.fullName}</Text>
          </View>
          {isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Asosiy</Text>
            </View>
          )}
        </View>

        <Text style={styles.fullName}>{item.fullName}</Text>
        <Text style={styles.addressLine} numberOfLines={1}>
          {item.addressLine1}
        </Text>
        {item.city && (
          <Text style={styles.cityText}>
            {item.city}
            {item.province ? `, ${item.province}` : ''}
          </Text>
        )}

        <View style={styles.cardActions}>
          {!isDefault && (
            <TouchableOpacity onPress={() => handleSetDefault(item.id)} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Asosiy qilish</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/profile/address-form',
                params: { addressId: item.id, editData: JSON.stringify(item) },
              })
            }
            style={styles.actionBtn}
          >
            <Feather name="edit-2" size={14} color={tokens.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            style={[styles.actionBtn, styles.deleteBtn]}
          >
            <Feather name="trash-2" size={14} color={tokens.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manzillarim</Text>
        <TouchableOpacity
          onPress={() => router.push('/profile/address-form')}
          style={styles.addBtn}
        >
          <Feather name="plus" size={22} color={tokens.colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="map-pin"
            heading="Manzil qo'shilmagan"
            subtitle="Yetkazib berish uchun manzil qo'shing"
            actionLabel="Manzil qo'shish"
            onAction={() => router.push('/profile/address-form')}
          />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          renderItem={renderAddressCard}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
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
    paddingVertical: 12,
    paddingBottom: 100,
  },
  addressCard: {
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    padding: 16,
  },
  addressCardDefault: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flagBadge: {
    width: 40,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: tokens.colors.text,
  },
  defaultBadge: {
    backgroundColor: tokens.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: tokens.colors.white,
  },
  fullName: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  addressLine: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginTop: 1,
  },
  cityText: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    borderWidth: 0.5,
    borderColor: tokens.colors.textLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    color: tokens.colors.textSecondary,
  },
  deleteBtn: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
})
