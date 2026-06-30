import { Tabs } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tokens } from '../../lib/tokens'

import { useAuthStore } from '../../lib/auth-store'
import { useCartStore } from '../../lib/cart-store'
import CartBadgeIcon from '../../components/ui/CartBadgeIcon'

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  const itemCount = useCartStore((s) => s.itemCount)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.primary,
        tabBarInactiveTintColor: tokens.colors.textLight,
        tabBarLabelStyle: {
          fontFamily: 'Inter_400Regular',
          fontSize: 10,
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarStyle: {
          backgroundColor: tokens.colors.background,
          height: 56 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
          borderTopWidth: 0,
          borderTopColor: tokens.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Bosh sahifa',
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Katalog',
          tabBarIcon: ({ color }) => <Feather name="grid" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Savat',
          tabBarIcon: ({ color }) => <CartBadgeIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  )
}
