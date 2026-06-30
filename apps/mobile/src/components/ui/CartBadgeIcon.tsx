import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCartStore } from '../../lib/cart-store'
import { tokens } from '../../lib/tokens'

interface CartBadgeIconProps {
  size?: number
  color?: string
  onPress?: () => void
}

export default function CartBadgeIcon({
  size = 22,
  color = tokens.colors.text,
  onPress,
}: CartBadgeIconProps) {
  const itemCount = useCartStore((s) => s.itemCount)
  const router = useRouter()

  const handlePress = () => {
    if (onPress) {
      onPress()
    } else {
      router.push('/(tabs)/cart')
    }
  }

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Feather name="shopping-bag" size={size} color={color} />
      {itemCount > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{itemCount > 9 ? '9+' : itemCount}</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  badgeContainer: {
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
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
  },
})
