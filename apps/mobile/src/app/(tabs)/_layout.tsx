import { Tabs } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tokens } from '../../lib/tokens'

import { View, Text } from 'react-native'
import { useCartStore } from '../../lib/cart-store'

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
          tabBarIcon: ({ color }) => (
            <View>
              <Feather name="shopping-bag" size={22} color={color} />
              {itemCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    backgroundColor: tokens.colors.primary,
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 9,
                      fontFamily: 'Inter_400Regular',
                      fontWeight: '500',
                    }}
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </Text>
                </View>
              )}
            </View>
          ),
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
