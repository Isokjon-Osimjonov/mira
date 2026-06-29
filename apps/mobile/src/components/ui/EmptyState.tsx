import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { tokens } from '../../lib/tokens'

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap
  heading: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
}

export default function EmptyState({
  icon,
  heading,
  subtitle,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.iconCircle, compact && styles.iconCircleCompact]}>
        <Feather name={icon} size={compact ? 22 : 28} color={tokens.colors.textMuted} />
      </View>
      <Text style={[styles.heading, compact && styles.headingCompact]}>{heading}</Text>
      {Boolean(subtitle) && (
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
      )}
      {Boolean(actionLabel && onAction) && (
        <TouchableOpacity onPress={onAction} style={styles.actionBtn} activeOpacity={0.8}>
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  containerCompact: {
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircleCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
  },
  heading: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  headingCompact: {
    fontSize: 13,
    fontWeight: '400',
    color: tokens.colors.textSecondary,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 260,
  },
  subtitleCompact: {
    fontSize: 12,
    marginTop: 4,
  },
  actionBtn: {
    marginTop: 20,
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.white,
  },
})
