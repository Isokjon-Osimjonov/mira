import React from 'react'
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '../../lib/auth-store'
import { useCartStore } from '../../lib/cart-store'
import { authService } from '../../services/auth.service'
import { tokens } from '../../lib/tokens'

export default function ProfileScreen() {
  const customer = useAuthStore((s) => s.customer)
  const logout = useAuthStore((s) => s.logout)
  const clearCart = useCartStore((s) => s.clearCart)

  const handleLogout = () => {
    Alert.alert('Chiqish', 'Hisobdan chiqmoqchimisiz?', [
      { text: 'Bekor', style: 'cancel' },
      {
        text: 'Chiqish',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout()
          } catch (e) {
            console.error('Logout failed', e)
          }
          await logout()
          await clearCart()
          router.replace('/auth/login')
        },
      },
    ])
  }

  const getInitials = (name: string) => {
    return name?.charAt(0).toUpperCase() || 'M'
  }

  const sections = [
    {
      title: 'Buyurtmalar',
      items: [
        {
          icon: 'shopping-bag',
          iconBg: '#EFF6FF',
          iconColor: '#3B82F6',
          label: 'Buyurtmalarim',
          onPress: () => router.push('/orders'),
        },
      ],
    },
    {
      title: 'Profil',
      items: [
        {
          icon: 'map-pin',
          iconBg: '#F0FDF4',
          iconColor: '#16A34A',
          label: 'Manzillarim',
          onPress: () => router.push('/profile/addresses'),
        },
        {
          icon: 'user',
          iconBg: tokens.colors.primaryLight,
          iconColor: tokens.colors.primary,
          label: 'Profilni tahrirlash',
          onPress: () => router.push('/profile/edit'),
        },
        {
          icon: 'bell',
          iconBg: '#FFF7ED',
          iconColor: '#F97316',
          label: 'Bildirishnomalar',
          onPress: () => router.push('/notifications'),
        },
      ],
    },
    {
      title: 'Boshqa',
      items: [
        {
          icon: 'help-circle',
          iconBg: '#F5F5F5',
          iconColor: '#6B7280',
          label: 'Yordam',
          onPress: () => {},
        },
        {
          icon: 'log-out',
          iconBg: '#FEF2F2',
          iconColor: '#EF4444',
          label: 'Chiqish',
          onPress: handleLogout,
        },
      ],
    },
  ]

  if (!customer) return null

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.avatarContainer}>
              {customer.profileImageUrl ? (
                <Image
                  source={customer.profileImageUrl}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.initialsContainer}>
                  <Text style={styles.initialsText}>
                    {getInitials(customer.firstName)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {customer.firstName} {customer.lastName || ''}
              </Text>
              <Text style={styles.userPhone}>{customer.phone}</Text>
              <View style={styles.regionBadgeRow}>
                <View
                  style={[
                    styles.regionBadge,
                    {
                      backgroundColor:
                        customer.phoneRegion === 'KOR' ? '#EFF6FF' : '#F0FDF4',
                    },
                  ]}
                >
                  <Text style={styles.regionBadgeText}>
                    {customer.phoneRegion === 'KOR' ? '🇰🇷 Korea' : '🇺🇿 O\'zbekiston'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/profile/edit')}
              style={styles.editBtn}
            >
              <Feather name="edit-2" size={18} color={tokens.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* MENU SECTIONS */}
        <View style={styles.menuContainer}>
          {sections.map((section, idx) => (
            <View key={idx} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item, iidx) => (
                <TouchableOpacity
                  key={iidx}
                  style={[
                    styles.menuItem,
                    iidx === section.items.length - 1 && styles.lastMenuItem,
                  ]}
                  onPress={item.onPress}
                >
                  <View
                    style={[styles.menuIconContainer, { backgroundColor: item.iconBg }]}
                  >
                    <Feather name={item.icon as any} size={18} color={item.iconColor} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={tokens.colors.textLight}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: tokens.colors.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  initialsContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: tokens.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 20,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.primary,
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: tokens.colors.text,
  },
  userPhone: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  regionBadgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  regionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  regionBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textSecondary,
  },
  editBtn: {
    padding: 8,
  },
  menuContainer: {
    marginTop: 8,
  },
  section: {
    marginTop: 16,
    backgroundColor: tokens.colors.white,
  },
  sectionTitle: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
  },
  menuItem: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
  },
})
