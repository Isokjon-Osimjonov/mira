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
import { Image } from 'expo-image'
import { router, useFocusEffect } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { tokens } from '../../lib/tokens'
import { waitlistService } from '../../services/waitlist.service'
import { formatKRW } from '../../lib/price'
import EmptyState from '../../components/ui/EmptyState'

export default function WaitlistScreen() {
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const {
    data: items,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['waitlist'],
    queryFn: waitlistService.getWaitlist,
    staleTime: 0,
  })

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  const handleRemove = (productId: string) => {
    Alert.alert("O'chirish", "Mahsulotni kutish ro'yxatidan o'chirmoqchimisiz?", [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: async () => {
          try {
            await waitlistService.removeFromWaitlist(productId)
            refetch()
          } catch (err: any) {
            Alert.alert('Xatolik', err?.response?.data?.error?.message ?? "O'chirib bo'lmadi")
          }
        },
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
        <Text style={styles.headerTitle}>Kutish ro'yxati</Text>
        <View style={{ width: 40 }} />
      </View>

      {items?.length === 0 && !isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="bell"
            heading="Kutish ro'yxati bo'sh"
            subtitle="Mahsulot mavjud bo'lganda sizga xabar beramiz"
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
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image
                source={item.imageUrls[0]}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.info}>
                <Text style={styles.brandName}>{item.brandName}</Text>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.price}>{formatKRW(Number(item.retailPrice))}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.removeBtn}>
                <Feather name="x" size={18} color={tokens.colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
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
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    paddingHorizontal: 24,
    paddingBottom: 16,
    margin: 'auto',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: 10,
    backgroundColor: tokens.colors.white,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: tokens.colors.background,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  brandName: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
    marginTop: 2,
  },
  price: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.primary,
    marginTop: 4,
  },
  removeBtn: {
    padding: 4,
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
})
