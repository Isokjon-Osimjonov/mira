import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native'
import { Image } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { tokens } from '../../lib/tokens'
import { formatKRW, formatUZS, krwToUzs } from '../../lib/price'
import type { Product } from '../../services/product.service'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2

interface ProductCardProps {
  product: Product
  onPress: () => void
  onAddToCart: () => void
  showUzs?: boolean
  wishlisted?: boolean
  onToggleWishlist?: () => void
}

export const ProductCard = ({
  product,
  onPress,
  onAddToCart,
  showUzs,
  wishlisted,
  onToggleWishlist,
}: ProductCardProps) => {
  const uzsPrice = showUzs ? krwToUzs(product.retailPrice, 12) : 0 // Fallback rate 12, will be handled by store in screens

  const getBadge = () => {
    if (!product.isAvailable) {
      return { label: 'TUGAGAN', color: tokens.colors.textLight }
    }
    if (product.isNew) {
      return { label: 'YANGI', color: tokens.colors.success }
    }
    if (product.wholesalePrice < product.retailPrice * 0.9) {
      return { label: 'CHEGIRMA', color: tokens.colors.error }
    }
    if (product.totalStock <= 5) {
      return { label: 'OZ QOLDI', color: tokens.colors.warning }
    }
    return null
  }

  const badge = getBadge()

  return (
    <Pressable onPress={onPress} style={styles.container}>
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
          onPress={onToggleWishlist}
          activeOpacity={0.7}
        >
          <Feather
            name="heart"
            size={14}
            color={wishlisted ? tokens.colors.primary : tokens.colors.textLight}
          />
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
          {showUzs && (
            <Text style={styles.priceUzs}>
              ≈ {formatUZS(uzsPrice)}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.cartBtn,
            !product.isAvailable && { backgroundColor: tokens.colors.skeleton },
          ]}
          onPress={onAddToCart}
          disabled={!product.isAvailable}
        >
          <Text
            style={[
              styles.cartBtnText,
              !product.isAvailable && { color: tokens.colors.textLight },
            ]}
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
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
