import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { tokens } from '../../lib/tokens'
import { boxService } from '../../services/box.service'
import { useCartStore } from '../../lib/cart-store'
import { formatKRW } from '../../lib/price'
import PrimaryButton from '../../components/ui/PrimaryButton'

export default function CheckoutBoxScreen() {
  const { addressId, couponCode } = useLocalSearchParams<{
    addressId: string
    couponCode?: string
  }>()

  const { data: boxes = [], isLoading } = useQuery({
    queryKey: ['boxes'],
    queryFn: boxService.getBoxes,
  })

  const cart = useCartStore((s) => s.cart)
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null)

  const totalWeightKg =
    cart?.items.reduce((acc, item) => {
      // weightGrams not available yet — use 0
      // return acc + (item.product.weightGrams * item.quantity) / 1000
      return acc
    }, 0) ?? 0

  const isBoxValid = (box: any): boolean => {
    if (!box.maxWeightKg || Number(box.maxWeightKg) === 0) {
      return true // no limit set = always valid
    }
    return totalWeightKg <= Number(box.maxWeightKg)
  }

  const selectedBox = boxes.find((b) => b.id === selectedBoxId)

  const handleContinue = () => {
    if (!selectedBoxId) return
    router.push({
      pathname: '/checkout/payment',
      params: { addressId, couponCode, boxId: selectedBoxId },
    })
  }

  const insets = useSafeAreaInsets()

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quti tanlash</Text>
        <Text style={styles.stepIndicator}>2 / 3</Text>
      </View>

      <Text style={styles.subtitle}>Mahsulotlaringiz uchun mos qutini tanlang</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator color={tokens.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          boxes.map((box) => {
            const valid = isBoxValid(box)
            return (
              <TouchableOpacity
                key={box.id}
                activeOpacity={0.8}
                onPress={() => setSelectedBoxId(box.id)}
                disabled={!valid}
                style={[
                  styles.boxCard,
                  selectedBoxId === box.id ? styles.boxCardSelected : styles.boxCardUnselected,
                  !valid && { opacity: 0.4 },
                ]}
              >
                <View style={styles.boxImageContainer}>
                  {box.imageUrls[0] ? (
                    <Image source={box.imageUrls[0]} style={styles.boxImage} contentFit="cover" />
                  ) : (
                    <Feather name="package" size={28} color={tokens.colors.textLight} />
                  )}
                </View>

                <View style={styles.boxInfo}>
                  <View style={styles.boxHeaderRow}>
                    <Text style={styles.boxName}>{box.name}</Text>
                    {selectedBoxId === box.id && (
                      <View style={styles.checkCircle}>
                        <Feather name="check" size={12} color={tokens.colors.white} />
                      </View>
                    )}
                  </View>

                  {box.sizeLabel && <Text style={styles.sizeLabel}>{box.sizeLabel}</Text>}

                  <View style={styles.specsRow}>
                    {Boolean(box.lengthCm && box.widthCm && box.heightCm) && (
                      <Text style={styles.specText}>
                        {String(box.lengthCm) +
                          '×' +
                          String(box.widthCm) +
                          '×' +
                          String(box.heightCm) +
                          'sm'}
                      </Text>
                    )}
                    {Boolean(box.maxWeightKg && Number(box.maxWeightKg) > 0) && (
                      <Text style={styles.specText}>
                        {'Max: ' + String(box.maxWeightKg) + 'kg'}
                      </Text>
                    )}
                  </View>

                  {!valid && (
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                    >
                      <Feather name="alert-circle" size={12} color={tokens.colors.error} />
                      <Text style={{ fontSize: 11, color: tokens.colors.error }}>
                        Sig'imi yetarli emas (max {box.maxWeightKg}kg)
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {selectedBox && <Text style={styles.selectionNote}>Tanlangan: {selectedBox.name}</Text>}
        <PrimaryButton label="Davom etish" disabled={!selectedBoxId} onPress={handleContinue} />
      </View>
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
  subtitle: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: 180,
  },
  boxCard: {
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 0.5,
  },
  boxCardSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight,
    borderWidth: 1.5,
  },
  boxCardUnselected: {
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  boxImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: tokens.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  boxImage: {
    width: '100%',
    height: '100%',
  },
  boxInfo: {
    flex: 1,
  },
  boxHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boxName: {
    fontSize: 14,
    fontWeight: '400',
    color: tokens.colors.text,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeLabel: {
    fontSize: 11,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  specText: {
    fontSize: 11,
    color: tokens.colors.textMuted,
  },
  costText: {
    fontSize: 12,
    fontWeight: '400',
    color: tokens.colors.text,
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 14,
    backgroundColor: tokens.colors.white,
    borderTopWidth: 0.5,
    borderTopColor: tokens.colors.border,
  },
  selectionNote: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginBottom: 8,
  },
})
