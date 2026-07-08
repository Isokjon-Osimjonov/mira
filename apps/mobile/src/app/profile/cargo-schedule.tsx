import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { tokens } from '../../lib/tokens'
import { cargoDateService } from '../../services/cargo-date.service'

function formatDateUzbek(isoString: string) {
  const date = new Date(isoString)
  const monthNames = [
    'Yanvar',
    'Fevral',
    'Mart',
    'Aprel',
    'May',
    'Iyun',
    'Iyul',
    'Avgust',
    'Sentyabr',
    'Oktyabr',
    'Noyabr',
    'Dekabr',
  ]
  const weekdayNames = [
    'Yakshanba',
    'Dushanba',
    'Seshanba',
    'Chorshanba',
    'Payshanba',
    'Juma',
    'Shanba',
  ]
  return {
    day: date.getDate().toString(),
    monthYear: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
    weekday: weekdayNames[date.getDay()],
  }
}

export default function CargoScheduleScreen() {
  const { data: dates = [], isLoading, refetch } = useQuery({
    queryKey: ['cargo-dates'],
    queryFn: cargoDateService.getUpcoming,
    staleTime: 5 * 60 * 1000,
  })

  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yuk jadvali</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={tokens.colors.primary}
            colors={[tokens.colors.primary]}
          />
        }
      >
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>Koreadan O'zbekistonga yuk shu sanalarda jo'natiladi</Text>
        </View>

        {isLoading ? (
          <View style={{ marginTop: 40 }}>
            <ActivityIndicator color={tokens.colors.primary} />
          </View>
        ) : dates.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={48} color={tokens.colors.border} />
            <Text style={styles.emptyTitle}>Hali sana belgilanmagan</Text>
            <Text style={styles.emptySub}>Tez orada yangilanadi</Text>
          </View>
        ) : (
          dates.map((item) => {
            const { day, monthYear, weekday } = formatDateUzbek(item.cargoDate)
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.dayCircle}>
                  <Text style={styles.dayText}>{day}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.monthYear}>{monthYear}</Text>
                  <Text style={styles.weekday}>{weekday}</Text>
                  {item.note && <Text style={styles.note}>{item.note}</Text>}
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
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
    fontSize: 16,
    fontWeight: '500',
    color: tokens.colors.text,
    marginLeft: 12,
  },
  subtitleContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  subtitle: {
    fontSize: 13,
    color: tokens.colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
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
    marginTop: 4,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    marginHorizontal: 24,
    marginBottom: 10,
    alignItems: 'center',
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 18,
    fontWeight: '500',
    color: tokens.colors.primary,
  },
  monthYear: {
    fontSize: 13,
    color: tokens.colors.textMuted,
  },
  weekday: {
    fontSize: 14,
    fontWeight: '500',
    color: tokens.colors.text,
  },
  note: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
})
