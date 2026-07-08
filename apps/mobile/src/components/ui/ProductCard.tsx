import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { tokens } from '../../lib/tokens'
import { formatKRW, formatUZS, krwToUzs } from '../../lib/price'
import type { Product } from '../../services/product.service'
import { useWishlistStore } from '../../lib/wishlist-store'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2

interface ProductCardProps {
  product: Product
  onPress: () => void
  onAddToCart: () => void
  showUzs?: boolean
  wishlisted?: boolean
  onToggleWishlist?: () => void
  onLongPress?: () => void
}

export const ProductCard = ({
  product,
  onPress,
  onAddToCart,
  showUzs,
  wishlisted: wishlistedProp,
  onToggleWishlist: onToggleWishlistProp,
  onLongPress,
}: ProductCardProps) => {
  const toggle = useWishlistStore((s) => s.toggle)
  const productIds = useWishlistStore((s) => s.productIds)
  const isWishlistedStore = productIds.has(product.id)

  const isWishlisted = wishlistedProp ?? isWishlistedStore
  const handleToggle = () => {
    if (onToggleWishlistProp) {
      onToggleWishlistProp()
    } else {
      toggle(product.id)
    }
  }

  const uzsPrice = showUzs ? krwToUzs(product.retailPrice, 12) : 0 // Fallback rate 12, will be handled by store in screens

  const getBadge = () => {
    if (!product.isAvailable || product.totalStock === 0) {
      return { label: 'MAVJUD EMAS', color: '#EF4444' }
    }
    if (product.totalStock > 0 && product.totalStock <= 5) {
      return { label: 'OZ QOLDI', color: tokens.colors.warning }
    }
    if (product.isNew) {
      return { label: 'YANGI', color: tokens.colors.success }
    }
    return null
  }

  const badge = getBadge()

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      style={styles.container}
    >
      {/* Image Area */}
      <View style={styles.imageContainer}>
        <Image
          source={product.imageUrls[0]}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />

        {badge && (
          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.wishlistBtn}
          onPress={handleToggle}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View
            style={[styles.wishlistIconCircle, isWishlisted && styles.wishlistIconCircleActive]}
          >
            <Feather
              name="heart"
              size={14}
              color={isWishlisted ? tokens.colors.white : tokens.colors.textMuted}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Info Area */}
      <View style={styles.info}>
        <Text style={styles.brandName} numberOfLines={1}>
          {product.brandName}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={styles.priceKrw}>{formatKRW(product.retailPrice)}</Text>
          {showUzs && <Text style={styles.priceUzs}>≈ {formatUZS(uzsPrice)}</Text>}
        </View>

        <TouchableOpacity
          style={[
            styles.cartBtn,
            (!product.isAvailable || product.totalStock === 0) && { backgroundColor: tokens.colors.skeleton },
          ]}
          onPress={onAddToCart}
          disabled={!product.isAvailable || product.totalStock === 0}
        >
          <Text
            style={[styles.cartBtnText, (!product.isAvailable || product.totalStock === 0) && { color: tokens.colors.textLight }]}
          >
            Savatga +
          </Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    marginBottom: tokens.spacing.md,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
  },
  imageContainer: {
    width: '100%',
    height: 130,
    backgroundColor: tokens.colors.background,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.white,
  },
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  wishlistIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  wishlistIconCircleActive: {
    backgroundColor: tokens.colors.primary,
  },
  info: {
    padding: tokens.spacing.sm,
  },
  brandName: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    fontWeight: '300',
    color: tokens.colors.textMuted,
    marginBottom: 2,
  },
  name: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.text,
    height: 36,
    lineHeight: 18,
    marginBottom: 6,
  },
  priceContainer: {
    marginBottom: 8,
  },
  priceKrw: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.primary,
  },
  priceUzs: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    fontWeight: '300',
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  cartBtn: {
    height: 34,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.white,
  },
})
